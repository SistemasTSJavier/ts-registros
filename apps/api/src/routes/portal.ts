import { and, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'
import { db } from '../db/client.js'
import {
  accessCredentials,
  documents,
  invitations,
  persons,
  registrations,
  registrationTypes,
  tenants,
  validationItems,
} from '../db/schema.js'
import { portalMiddleware, type PortalVariables } from '../middleware/portal.js'
import { createPersonValidationItems } from '../lib/registration.js'
import {
  mapAccessCredential,
  mapDocument,
  mapInvitation,
  mapPerson,
  mapRegistration,
  mapRegistrationType,
  mapTenant,
  mapValidationItem,
} from '../lib/mappers.js'
import { generateId } from '../lib/utils.js'
import { uploadDocumentBase64 } from '../services/storage.js'

export const portalRoutes = new Hono()

portalRoutes.get('/invitation/:token', async (c) => {
  const token = c.req.param('token')
  const [invitationRow] = await db.select().from(invitations).where(eq(invitations.token, token)).limit(1)
  if (!invitationRow) return c.json({ message: 'Invitación inválida' }, 404)

  const invitation = mapInvitation(invitationRow)
  if (new Date(invitation.expiresAt) < new Date()) {
    return c.json({ message: 'Invitación expirada' }, 410)
  }

  const [registrationRow] = await db
    .select()
    .from(registrations)
    .where(eq(registrations.id, invitation.registrationId))
    .limit(1)
  const [tenantRow] = await db.select().from(tenants).where(eq(tenants.id, registrationRow!.tenantId)).limit(1)
  const [typeRow] = await db
    .select()
    .from(registrationTypes)
    .where(eq(registrationTypes.id, registrationRow!.typeId))
    .limit(1)

  let person = null
  if (invitation.personId) {
    const [personRow] = await db.select().from(persons).where(eq(persons.id, invitation.personId)).limit(1)
    person = personRow ? mapPerson(personRow) : null
  }

  return c.json({
    invitation,
    registration: mapRegistration(registrationRow!),
    tenant: mapTenant(tenantRow!),
    type: mapRegistrationType(typeRow!),
    person,
  })
})

portalRoutes.post('/invitation/:token/accept', async (c) => {
  const token = c.req.param('token')
  const [invitationRow] = await db.select().from(invitations).where(eq(invitations.token, token)).limit(1)
  if (!invitationRow) return c.json({ message: 'Invitación inválida' }, 404)

  const invitation = mapInvitation(invitationRow)
  if (new Date(invitation.expiresAt) < new Date()) {
    return c.json({ message: 'Invitación expirada' }, 410)
  }

  const acceptedAt = new Date().toISOString()
  await db.update(invitations).set({ acceptedAt }).where(eq(invitations.id, invitationRow.id))

  const [registrationRow] = await db
    .select()
    .from(registrations)
    .where(eq(registrations.id, invitation.registrationId))
    .limit(1)

  if (registrationRow?.status === 'invited') {
    await db
      .update(registrations)
      .set({ status: 'in_progress', updatedAt: acceptedAt })
      .where(eq(registrations.id, registrationRow.id))
  }

  if (invitation.personId) {
    const [personRow] = await db.select().from(persons).where(eq(persons.id, invitation.personId)).limit(1)
    if (personRow?.overallStatus === 'invited') {
      await db
        .update(persons)
        .set({ overallStatus: 'in_progress', updatedAt: acceptedAt })
        .where(eq(persons.id, invitation.personId))
    }
  }

  return c.json({ invitation: { ...invitation, acceptedAt } })
})

const portalSession = new Hono<{ Variables: PortalVariables }>()
portalSession.use('*', portalMiddleware)

portalSession.get('/session', async (c) => {
  const registration = c.get('registration')
  const invitation = c.get('invitation')
  const person = c.get('person')

  const [tenantRow] = await db.select().from(tenants).where(eq(tenants.id, registration.tenantId)).limit(1)
  const [typeRow] = await db.select().from(registrationTypes).where(eq(registrationTypes.id, registration.typeId)).limit(1)

  const registrationPersons = person
    ? [person]
    : (await db.select().from(persons).where(eq(persons.registrationId, registration.id))).map(mapPerson)

  return c.json({
    registration,
    tenant: mapTenant(tenantRow!),
    type: mapRegistrationType(typeRow!),
    persons: registrationPersons,
    personId: invitation.personId ?? null,
  })
})

portalSession.get('/persons', async (c) => {
  const registration = c.get('registration')
  const personRows = await db.select().from(persons).where(eq(persons.registrationId, registration.id))
  return c.json(personRows.map(mapPerson))
})

portalSession.get('/persons/:id', async (c) => {
  const registration = c.get('registration')
  const id = c.req.param('id')

  const [personRow] = await db
    .select()
    .from(persons)
    .where(and(eq(persons.id, id), eq(persons.registrationId, registration.id)))
    .limit(1)
  if (!personRow) return c.json({ message: 'No encontrado' }, 404)

  const docs = await db.select().from(documents).where(eq(documents.personId, id))
  const items = await db.select().from(validationItems).where(eq(validationItems.personId, id))
  const [credRow] = await db.select().from(accessCredentials).where(eq(accessCredentials.personId, id)).limit(1)
  const [typeRow] = await db.select().from(registrationTypes).where(eq(registrationTypes.id, registration.typeId)).limit(1)

  return c.json({
    person: mapPerson(personRow),
    documents: docs.map(mapDocument),
    validationItems: items.map(mapValidationItem),
    credential: credRow ? mapAccessCredential(credRow) : null,
    type: mapRegistrationType(typeRow!),
  })
})

portalSession.post('/persons', async (c) => {
  const registration = c.get('registration')
  const body = z.object({ personalData: z.record(z.string(), z.string()) }).parse(await c.req.json())
  const now = new Date().toISOString()
  const personId = generateId()

  await db.insert(persons).values({
    id: personId,
    registrationId: registration.id,
    tenantId: registration.tenantId,
    personalData: body.personalData,
    incodeStatus: 'idle',
    overallStatus: 'in_progress',
    createdAt: now,
    updatedAt: now,
  })

  const items = createPersonValidationItems(personId, body.personalData, generateId)
  if (items.length > 0) {
    await db.insert(validationItems).values(items.map((item) => ({ ...item, rejectionReason: null })))
  }

  const [personRow] = await db.select().from(persons).where(eq(persons.id, personId)).limit(1)
  return c.json(mapPerson(personRow!), 201)
})

portalSession.post('/persons/:id/documents', async (c) => {
  const registration = c.get('registration')
  const personId = c.req.param('id')

  const [personRow] = await db
    .select()
    .from(persons)
    .where(and(eq(persons.id, personId), eq(persons.registrationId, registration.id)))
    .limit(1)
  if (!personRow) return c.json({ message: 'No encontrado' }, 404)

  const body = z
    .object({
      name: z.string(),
      type: z.string(),
      fileName: z.string(),
      contentBase64: z.string().optional(),
    })
    .parse(await c.req.json())

  let storagePath: string | null = null
  if (body.contentBase64) {
    try {
      storagePath = await uploadDocumentBase64({
        personId,
        tenantId: registration.tenantId,
        fileName: body.fileName,
        contentBase64: body.contentBase64,
      })
    } catch (error) {
      return c.json(
        { message: error instanceof Error ? error.message : 'Error al subir archivo' },
        500,
      )
    }
  }

  const docId = generateId()
  await db.insert(documents).values({
    id: docId,
    personId,
    name: body.name,
    type: body.type,
    fileName: body.fileName,
    storagePath,
    validationStatus: 'pending',
    rejectionReason: null,
  })

  const [existingItem] = await db
    .select()
    .from(validationItems)
    .where(
      and(
        eq(validationItems.personId, personId),
        eq(validationItems.category, 'document'),
        eq(validationItems.label, body.name),
      ),
    )
    .limit(1)

  if (!existingItem) {
    await db.insert(validationItems).values({
      id: generateId(),
      personId,
      category: 'document',
      label: body.name,
      status: 'pending',
      rejectionReason: null,
    })
  }

  const personDocs = await db.select().from(documents).where(eq(documents.personId, personId))
  const hasAllDocs = ['ine', 'curp_doc', 'acta_nacimiento', 'foto'].every((t) =>
    personDocs.some((d) => d.type === t),
  )

  if (hasAllDocs && personRow.incodeStatus === 'verified' && personRow.overallStatus === 'in_progress') {
    await db
      .update(persons)
      .set({ overallStatus: 'pending_validation', updatedAt: new Date().toISOString() })
      .where(eq(persons.id, personId))
  } else {
    await db.update(persons).set({ updatedAt: new Date().toISOString() }).where(eq(persons.id, personId))
  }

  const [docRow] = await db.select().from(documents).where(eq(documents.id, docId)).limit(1)
  return c.json(mapDocument(docRow!), 201)
})

portalSession.post('/persons/:id/incode', async (c) => {
  const registration = c.get('registration')
  const personId = c.req.param('id')

  const [personRow] = await db
    .select()
    .from(persons)
    .where(and(eq(persons.id, personId), eq(persons.registrationId, registration.id)))
    .limit(1)
  if (!personRow) return c.json({ message: 'No encontrado' }, 404)

  await db.update(persons).set({ incodeStatus: 'processing' }).where(eq(persons.id, personId))
  await new Promise((r) => setTimeout(r, 1500))

  const now = new Date().toISOString()
  await db
    .update(persons)
    .set({ incodeStatus: 'verified', overallStatus: 'pending_validation', updatedAt: now })
    .where(eq(persons.id, personId))

  const [incodeItem] = await db
    .select()
    .from(validationItems)
    .where(and(eq(validationItems.personId, personId), eq(validationItems.category, 'incode')))
    .limit(1)

  if (!incodeItem) {
    await db.insert(validationItems).values({
      id: generateId(),
      personId,
      category: 'incode',
      label: 'Verificación INE',
      status: 'pending',
      rejectionReason: null,
    })
  }

  const [updated] = await db.select().from(persons).where(eq(persons.id, personId)).limit(1)
  return c.json({ person: mapPerson(updated!), incodeStatus: updated!.incodeStatus })
})

portalSession.get('/persons/:id/access', async (c) => {
  const registration = c.get('registration')
  const personId = c.req.param('id')

  const [personRow] = await db
    .select()
    .from(persons)
    .where(and(eq(persons.id, personId), eq(persons.registrationId, registration.id)))
    .limit(1)
  if (!personRow) return c.json({ message: 'No encontrado' }, 404)

  const [credential] = await db.select().from(accessCredentials).where(eq(accessCredentials.personId, personId)).limit(1)
  if (!credential) return c.json({ message: 'Acceso no emitido' }, 404)

  return c.json(mapAccessCredential(credential))
})

portalRoutes.route('/', portalSession)
