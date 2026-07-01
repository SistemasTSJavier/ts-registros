import { and, desc, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'
import { db } from '../db/client.js'
import {
  accessCredentials,
  auditLogs,
  documents,
  invitations,
  persons,
  registrations,
  registrationTypes,
  tenants,
  validationItems,
} from '../db/schema.js'
import { authMiddleware, hasPermission, requireRole, type AuthVariables } from '../middleware/auth.js'
import {
  createPersonValidationItems,
  getAccessWindow,
  getMeetingDate,
} from '../lib/registration.js'
import {
  mapAccessCredential,
  mapAuditLog,
  mapDocument,
  mapInvitation,
  mapPerson,
  mapRegistration,
  mapRegistrationType,
  mapTenant,
  mapValidationItem,
} from '../lib/mappers.js'
import { generateId, generateManualCode } from '../lib/utils.js'
import { addAuditLog } from '../services/audit.js'
import { mapsUrl, sendAppointmentAccessEmail, sendInvitationEmail } from '../services/email.js'

const createRegistrationSchema = z.object({
  typeId: z.string(),
  payload: z.record(z.string(), z.string()),
  persons: z
    .array(
      z.object({
        nombreCompleto: z.string().min(1),
        telefono: z.string().min(1),
        curp: z.string().min(18).max(18),
        email: z.string().email(),
        puesto: z.string().min(1),
      }),
    )
    .min(1),
})

export const clienteRoutes = new Hono<{ Variables: AuthVariables }>()

clienteRoutes.use('*', authMiddleware, requireRole('cliente'))

clienteRoutes.get('/stats', async (c) => {
  const user = c.get('user')
  if (!user.tenantId) return c.json({ message: 'No autorizado' }, 403)

  const personRows = await db.select().from(persons).where(eq(persons.tenantId, user.tenantId))
  const credRows = await db.select().from(accessCredentials)
  const now = new Date()

  const pendingValidations = personRows.filter((p) => p.overallStatus === 'pending_validation').length
  const activeAccess = credRows.filter((a) => {
    const person = personRows.find((p) => p.id === a.personId)
    return person && new Date(a.validUntil) > now
  }).length

  return c.json({ pendingValidations, activeAccess })
})

clienteRoutes.get('/registrations', async (c) => {
  const user = c.get('user')
  if (!user.tenantId) return c.json({ message: 'No autorizado' }, 403)

  const typeCode = c.req.query('typeCode')
  const status = c.req.query('status')

  let regRows = await db
    .select()
    .from(registrations)
    .where(eq(registrations.tenantId, user.tenantId))
    .orderBy(desc(registrations.createdAt))

  if (typeCode && typeCode !== 'all') {
    regRows = regRows.filter((r) => r.typeCode === typeCode)
  }
  if (status && status !== 'all') {
    regRows = regRows.filter((r) => r.status === status)
  }

  const personRows = await db.select().from(persons).where(eq(persons.tenantId, user.tenantId))
  const docRows = await db.select().from(documents)
  const invRows = await db.select().from(invitations)

  const data = regRows.map((r) => {
    const registrationPersons = personRows.filter((p) => p.registrationId === r.id)
    return {
      ...mapRegistration(r),
      personCount: registrationPersons.length,
      persons: registrationPersons.map((person) => ({
        ...mapPerson(person),
        documentCount: docRows.filter((d) => d.personId === person.id).length,
        invitationToken: invRows.find((i) => i.personId === person.id)?.token ?? null,
      })),
    }
  })

  return c.json(data)
})

clienteRoutes.get('/registrations/:id', async (c) => {
  const user = c.get('user')
  if (!user.tenantId) return c.json({ message: 'No autorizado' }, 403)

  const id = c.req.param('id')
  const [registrationRow] = await db
    .select()
    .from(registrations)
    .where(and(eq(registrations.id, id), eq(registrations.tenantId, user.tenantId)))
    .limit(1)
  if (!registrationRow) return c.json({ message: 'No encontrado' }, 404)

  const personRows = await db.select().from(persons).where(eq(persons.registrationId, id))
  const docRows = await db.select().from(documents)
  const itemRows = await db.select().from(validationItems)
  const credRows = await db.select().from(accessCredentials)
  const invRows = await db.select().from(invitations)
  const logRows = await db.select().from(auditLogs).where(eq(auditLogs.entityId, id))

  const registrationPersons = personRows.map((person) => ({
    ...mapPerson(person),
    documents: docRows.filter((d) => d.personId === person.id).map(mapDocument),
    validationItems: itemRows.filter((v) => v.personId === person.id).map(mapValidationItem),
    credential: credRows.find((a) => a.personId === person.id)
      ? mapAccessCredential(credRows.find((a) => a.personId === person.id)!)
      : null,
    invitation: invRows.find((i) => i.personId === person.id)
      ? mapInvitation(invRows.find((i) => i.personId === person.id)!)
      : null,
  }))

  return c.json({
    registration: mapRegistration(registrationRow),
    persons: registrationPersons,
    logs: logRows.map(mapAuditLog),
  })
})

clienteRoutes.post('/registrations', async (c) => {
  const user = c.get('user')
  if (!user.tenantId) return c.json({ message: 'No autorizado' }, 403)
  if (!hasPermission(user, 'create')) {
    return c.json({ message: 'Sin permiso para registrar' }, 403)
  }

  const body = createRegistrationSchema.parse(await c.req.json())
  const [typeRow] = await db.select().from(registrationTypes).where(eq(registrationTypes.id, body.typeId)).limit(1)
  if (!typeRow) return c.json({ message: 'Tipo inválido' }, 400)

  const type = mapRegistrationType(typeRow)
  const now = new Date().toISOString()
  const firstPerson = body.persons[0]
  const registrationId = generateId()

  await db.insert(registrations).values({
    id: registrationId,
    tenantId: user.tenantId,
    typeId: type.id,
    typeCode: type.code,
    typeName: type.name,
    status: 'invited',
    payload: body.payload,
    inviteEmail: firstPerson.email,
    inviteContactName: firstPerson.nombreCompleto,
    createdAt: now,
    updatedAt: now,
  })

  const [tenantRow] = await db.select().from(tenants).where(eq(tenants.id, user.tenantId)).limit(1)
  const tenant = tenantRow ? mapTenant(tenantRow) : null
  if (!tenant) return c.json({ message: 'Tenant no encontrado' }, 500)

  const invitationResults: Array<{ personId: string; email: string; token: string; loginUrl: string }> = []

  for (const personInput of body.persons) {
    const personId = generateId()
    const personalData = {
      nombreCompleto: personInput.nombreCompleto,
      telefono: personInput.telefono,
      curp: personInput.curp,
      email: personInput.email,
      puesto: personInput.puesto,
    }

    await db.insert(persons).values({
      id: personId,
      registrationId,
      tenantId: user.tenantId,
      personalData,
      incodeStatus: 'idle',
      overallStatus: 'invited',
      createdAt: now,
      updatedAt: now,
    })

    const items = createPersonValidationItems(personId, personalData, generateId)
    if (items.length > 0) {
      await db.insert(validationItems).values(
        items.map((item) => ({
          ...item,
          rejectionReason: null,
        })),
      )
    }

    const token = `token-${personId.slice(0, 8)}`
    const loginUrl = `/portal/invitacion/${token}`

    await db.insert(invitations).values({
      id: generateId(),
      registrationId,
      tenantId: user.tenantId,
      personId,
      email: personInput.email,
      token,
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      acceptedAt: null,
    })

    invitationResults.push({ personId, email: personInput.email, token, loginUrl })

    const emailResult = await sendInvitationEmail({
      to: personInput.email,
      personName: personInput.nombreCompleto,
      puesto: personInput.puesto,
      tenantName: tenant.name,
      tenantAddress: tenant.address,
      mapsUrl: mapsUrl(tenant.address, tenant.addressLat, tenant.addressLng),
      registrationUrl: loginUrl,
      fechaCita: getMeetingDate(body.payload),
      typeName: type.name,
      responsable: body.payload.responsable ?? tenant.primaryContactName,
    })

    await addAuditLog({
      tenantId: user.tenantId,
      actorId: user.id,
      actorName: user.name,
      action: 'enviar_acceso',
      entity: 'person',
      entityId: personId,
      detail: emailResult.sent
        ? `Correo enviado a ${personInput.email} (Resend ${emailResult.id ?? ''})`
        : `Invitación registrada para ${personInput.email} (correo: ${emailResult.reason})`,
    })
  }

  await addAuditLog({
    tenantId: user.tenantId,
    actorId: user.id,
    actorName: user.name,
    action: 'invitar',
    entity: 'registration',
    entityId: registrationId,
    detail: `Registro ${type.name} creado con ${body.persons.length} persona(s)`,
  })

  const [registrationRow] = await db.select().from(registrations).where(eq(registrations.id, registrationId)).limit(1)

  return c.json({ registration: mapRegistration(registrationRow!), invitations: invitationResults }, 201)
})

clienteRoutes.get('/validations', async (c) => {
  const user = c.get('user')
  if (!user.tenantId) return c.json({ message: 'No autorizado' }, 403)

  const personRows = await db
    .select()
    .from(persons)
    .where(and(eq(persons.tenantId, user.tenantId), eq(persons.overallStatus, 'pending_validation')))
  const regRows = await db.select().from(registrations).where(eq(registrations.tenantId, user.tenantId))
  const docRows = await db.select().from(documents)

  const data = personRows.map((person) => {
    const registration = regRows.find((r) => r.id === person.registrationId)!
    const docs = docRows.filter((d) => d.personId === person.id)
    return {
      ...mapPerson(person),
      registrationType: registration.typeName,
      registrationId: registration.id,
      documentCount: docs.length,
      pendingDocs: docs.filter((d) => d.validationStatus === 'pending').length,
    }
  })

  return c.json(data)
})

clienteRoutes.get('/persons/:id', async (c) => {
  const user = c.get('user')
  if (!user.tenantId) return c.json({ message: 'No autorizado' }, 403)

  const id = c.req.param('id')
  const [personRow] = await db
    .select()
    .from(persons)
    .where(and(eq(persons.id, id), eq(persons.tenantId, user.tenantId)))
    .limit(1)
  if (!personRow) return c.json({ message: 'No encontrado' }, 404)

  const docs = await db.select().from(documents).where(eq(documents.personId, id))
  const items = await db.select().from(validationItems).where(eq(validationItems.personId, id))
  const [registrationRow] = await db
    .select()
    .from(registrations)
    .where(eq(registrations.id, personRow.registrationId))
    .limit(1)

  return c.json({
    person: mapPerson(personRow),
    documents: docs.map(mapDocument),
    validationItems: items.map(mapValidationItem),
    registration: registrationRow ? mapRegistration(registrationRow) : null,
  })
})

clienteRoutes.patch('/validation-items/:id', async (c) => {
  const user = c.get('user')
  if (!user.tenantId) return c.json({ message: 'No autorizado' }, 403)

  const body = z
    .object({
      status: z.enum(['approved', 'rejected']),
      rejectionReason: z.string().optional(),
    })
    .parse(await c.req.json())

  if (body.status === 'approved' && !hasPermission(user, 'create')) {
    return c.json({ message: 'Sin permiso para aprobar' }, 403)
  }
  if (body.status === 'rejected' && !hasPermission(user, 'delete')) {
    return c.json({ message: 'Sin permiso para rechazar' }, 403)
  }

  const id = c.req.param('id')
  const [itemRow] = await db.select().from(validationItems).where(eq(validationItems.id, id)).limit(1)
  if (!itemRow) return c.json({ message: 'No encontrado' }, 404)

  await db
    .update(validationItems)
    .set({ status: body.status, rejectionReason: body.rejectionReason ?? null })
    .where(eq(validationItems.id, id))

  const [docRow] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.personId, itemRow.personId), eq(documents.name, itemRow.label)))
    .limit(1)
  if (docRow) {
    await db
      .update(documents)
      .set({ validationStatus: body.status, rejectionReason: body.rejectionReason ?? null })
      .where(eq(documents.id, docRow.id))
  }

  const [updated] = await db.select().from(validationItems).where(eq(validationItems.id, id)).limit(1)
  return c.json(mapValidationItem(updated!))
})

clienteRoutes.post('/persons/:id/approve', async (c) => {
  const user = c.get('user')
  if (!user.tenantId) return c.json({ message: 'No autorizado' }, 403)
  if (!hasPermission(user, 'create')) {
    return c.json({ message: 'Sin permiso para aprobar' }, 403)
  }

  const id = c.req.param('id')
  const [personRow] = await db
    .select()
    .from(persons)
    .where(and(eq(persons.id, id), eq(persons.tenantId, user.tenantId)))
    .limit(1)
  if (!personRow) return c.json({ message: 'No encontrado' }, 404)

  const items = await db.select().from(validationItems).where(eq(validationItems.personId, id))
  if (!items.every((i) => i.status === 'approved')) {
    return c.json({ message: 'Faltan ítems por aprobar' }, 400)
  }

  const [registrationRow] = await db
    .select()
    .from(registrations)
    .where(eq(registrations.id, personRow.registrationId))
    .limit(1)
  const [typeRow] = await db
    .select()
    .from(registrationTypes)
    .where(eq(registrationTypes.id, registrationRow!.typeId))
    .limit(1)
  const type = mapRegistrationType(typeRow!)
  const registration = mapRegistration(registrationRow!)
  const now = new Date().toISOString()

  const newStatus = type.requiresAccess ? 'access_issued' : 'approved'
  await db.update(persons).set({ overallStatus: newStatus, updatedAt: now }).where(eq(persons.id, id))

  if (type.requiresAccess) {
    const manualCode = generateManualCode()
    const { validFrom, validUntil } = getAccessWindow(getMeetingDate(registration.payload))
    const credentialId = generateId()

    await db.insert(accessCredentials).values({
      id: credentialId,
      personId: id,
      qrPayload: `ACCESS:${id}:${personRow.tenantId}:${validFrom}`,
      manualCode,
      validFrom,
      validUntil,
    })

    const [tenantRow] = await db.select().from(tenants).where(eq(tenants.id, personRow.tenantId)).limit(1)
    const tenant = mapTenant(tenantRow!)
    const [invRow] = await db.select().from(invitations).where(eq(invitations.personId, id)).limit(1)
    const personalData = personRow.personalData as Record<string, string>

    const emailResult = await sendAppointmentAccessEmail({
      to: personalData.email,
      personName: personalData.nombreCompleto,
      tenantName: tenant.name,
      tenantAddress: tenant.address,
      mapsUrl: mapsUrl(tenant.address, tenant.addressLat, tenant.addressLng),
      registrationUrl: invRow ? `/portal/invitacion/${invRow.token}` : '/portal',
      fechaCita: getMeetingDate(registration.payload),
      responsable: registration.payload.responsable ?? tenant.primaryContactName,
      manualCode,
      qrPayload: `ACCESS:${id}:${personRow.tenantId}:${validFrom}`,
      validFrom,
      validUntil,
    })

    await addAuditLog({
      tenantId: user.tenantId,
      actorId: user.id,
      actorName: user.name,
      action: 'emitir_acceso',
      entity: 'person',
      entityId: id,
      detail: emailResult.sent
        ? `Acceso QR enviado a ${personalData.email} (Resend ${emailResult.id ?? ''})`
        : `Acceso QR emitido para ${personalData.nombreCompleto} (correo: ${emailResult.reason})`,
    })

    const [updatedPerson] = await db.select().from(persons).where(eq(persons.id, id)).limit(1)
    const [credential] = await db.select().from(accessCredentials).where(eq(accessCredentials.id, credentialId)).limit(1)

    return c.json({
      person: mapPerson(updatedPerson!),
      credential: mapAccessCredential(credential!),
      emailSent: emailResult,
    })
  }

  const [updatedPerson] = await db.select().from(persons).where(eq(persons.id, id)).limit(1)
  return c.json({ person: mapPerson(updatedPerson!) })
})

clienteRoutes.get('/historial', async (c) => {
  const user = c.get('user')
  if (!user.tenantId) return c.json({ message: 'No autorizado' }, 403)

  const logRows = await db.select().from(auditLogs).where(eq(auditLogs.tenantId, user.tenantId))
  return c.json(logRows.map(mapAuditLog))
})

clienteRoutes.get('/perfil', async (c) => {
  const user = c.get('user')
  if (!user.tenantId) return c.json({ message: 'No autorizado' }, 403)

  const [tenantRow] = await db.select().from(tenants).where(eq(tenants.id, user.tenantId)).limit(1)
  return c.json({ user, tenant: tenantRow ? mapTenant(tenantRow) : null })
})
