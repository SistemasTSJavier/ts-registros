import { http, HttpResponse } from 'msw'
import type { CreateRegistrationInput, CreateTenantInput, User } from '@/lib/schemas'
import type { UserPermissions } from '@/lib/schemas/permissions'
import { addAuditLog, db, generateManualCode, generatePassword } from '@/lib/mock/db'
import { createPersonValidationItems, getAccessWindow, getMeetingDate } from '@/lib/registration/constants'
import {
  mapsUrl,
  sendAppointmentAccessEmail,
  sendInvitationEmail,
  sendTenantAccessEmail,
} from '@/lib/email/client'
import { generateId } from '@/lib/utils'

function hasPermission(user: User, key: keyof UserPermissions) {
  if (user.role === 'admin') return true
  return user.permissions?.[key] ?? true
}

function getAuthHeader(request: Request) {
  const auth = request.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) return null
  const userId = auth.slice(7)
  return db.users.find((u) => u.id === userId) ?? null
}

function getPortalSession(request: Request) {
  const token = request.headers.get('X-Portal-Token')
  if (!token) return null
  const invitation = db.invitations.find((i) => i.token === token)
  if (!invitation) return null
  if (new Date(invitation.expiresAt) < new Date()) return null
  const registration = db.registrations.find((r) => r.id === invitation.registrationId)
  if (!registration) return null
  const person = invitation.personId
    ? db.persons.find((p) => p.id === invitation.personId)
    : undefined
  return { invitation, registration, person }
}

export const handlers = [
  http.post('/api/auth/login', async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string; role?: string }
    const user = db.users.find((u) => u.email === body.email)
    if (!user) {
      return HttpResponse.json({ message: 'Usuario no encontrado' }, { status: 401 })
    }
    const stored = db.userPasswords[user.id]
    if (!stored || body.password !== stored) {
      return HttpResponse.json({ message: 'Credenciales inv?lidas' }, { status: 401 })
    }
    if (body.role && user.role !== body.role) {
      return HttpResponse.json({ message: 'Rol no autorizado' }, { status: 403 })
    }
    const tenant = user.tenantId ? db.tenants.find((t) => t.id === user.tenantId) : null
    return HttpResponse.json({ user, tenant, accessToken: user.id })
  }),

  http.get('/api/admin/stats', ({ request }) => {
    const user = getAuthHeader(request)
    if (!user || user.role !== 'admin') return HttpResponse.json({ message: 'No autorizado' }, { status: 403 })
    const today = new Date().toISOString().slice(0, 10)
    return HttpResponse.json({
      totalTenants: db.tenants.filter((t) => t.status === 'active').length,
      totalRegistrations: db.registrations.length,
      pendingValidations: db.persons.filter((p) => p.overallStatus === 'pending_validation').length,
      accessIssuedToday: db.accessCredentials.filter((a) => a.validFrom.startsWith(today)).length,
    })
  }),

  http.get('/api/admin/tenants', ({ request }) => {
    const user = getAuthHeader(request)
    if (!user || user.role !== 'admin') return HttpResponse.json({ message: 'No autorizado' }, { status: 403 })
    const data = db.tenants.map((tenant) => {
      const tenantUsers = db.users.filter((u) => u.tenantId === tenant.id)
      return {
        ...tenant,
        registrationCount: db.registrations.filter((r) => r.tenantId === tenant.id).length,
        userCount: tenantUsers.length,
        extraUserCount: tenantUsers.filter((u) => !u.isPrimary).length,
      }
    })
    return HttpResponse.json(data)
  }),

  http.get('/api/admin/tenants/:id', ({ request, params }) => {
    const user = getAuthHeader(request)
    if (!user || user.role !== 'admin') return HttpResponse.json({ message: 'No autorizado' }, { status: 403 })
    const tenant = db.tenants.find((t) => t.id === params.id)
    if (!tenant) return HttpResponse.json({ message: 'No encontrado' }, { status: 404 })
    const tenantUsers = db.users.filter((u) => u.tenantId === tenant.id)
    const tenantRegistrations = db.registrations.filter((r) => r.tenantId === tenant.id)
    const tenantLogs = db.auditLogs.filter((l) => l.tenantId === tenant.id)
    return HttpResponse.json({
      tenant,
      users: tenantUsers,
      registrations: tenantRegistrations,
      logs: tenantLogs,
      stats: {
        registrations: tenantRegistrations.length,
        persons: db.persons.filter((p) => p.tenantId === tenant.id).length,
        pending: db.persons.filter(
          (p) => p.tenantId === tenant.id && p.overallStatus === 'pending_validation',
        ).length,
      },
    })
  }),

  http.get('/api/admin/dashboard', ({ request }) => {
    const user = getAuthHeader(request)
    if (!user || user.role !== 'admin') return HttpResponse.json({ message: 'No autorizado' }, { status: 403 })

    const clients = db.tenants.map((tenant) => {
      const tenantUsers = db.users.filter((u) => u.tenantId === tenant.id)
      return {
        ...tenant,
        userCount: tenantUsers.length,
        extraUserCount: tenantUsers.filter((u) => !u.isPrimary).length,
        users: tenantUsers,
      }
    })

    const extraUsers = db.users
      .filter((u) => u.tenantId && u.role === 'cliente' && !u.isPrimary)
      .map((u) => ({
        ...u,
        tenantName: db.tenants.find((t) => t.id === u.tenantId)?.name ?? '',
      }))

    return HttpResponse.json({ clients, extraUsers })
  }),

  http.get('/api/admin/logs', ({ request }) => {
    const user = getAuthHeader(request)
    if (!user || user.role !== 'admin') return HttpResponse.json({ message: 'No autorizado' }, { status: 403 })
    const url = new URL(request.url)
    const tenantId = url.searchParams.get('tenantId')
    let logs = [...db.auditLogs].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    if (tenantId && tenantId !== 'all') {
      logs = logs.filter((l) => l.tenantId === tenantId)
    }
    const enriched = logs.map((log) => ({
      ...log,
      tenantName: log.tenantId ? db.tenants.find((t) => t.id === log.tenantId)?.name ?? '?' : 'Sistema',
    }))
    return HttpResponse.json(enriched)
  }),

  http.post('/api/admin/tenants', async ({ request }) => {
    const user = getAuthHeader(request)
    if (!user || user.role !== 'admin') return HttpResponse.json({ message: 'No autorizado' }, { status: 403 })
    const body = (await request.json()) as CreateTenantInput
    const password = generatePassword()
    const tenant = {
      id: generateId(),
      createdAt: new Date().toISOString(),
      name: body.name,
      legalName: body.name,
      address: body.address,
      addressLat: body.addressLat,
      addressLng: body.addressLng,
      phone: body.phone,
      status: body.status,
      primaryContactName: body.primaryContactName,
      primaryContactEmail: body.primaryContactEmail,
      primaryContactPhone: body.phone,
      panelExpiresAt: body.panelExpiresAt,
    }
    db.tenants.push(tenant)
    const clienteUser = {
      id: generateId(),
      tenantId: tenant.id,
      email: body.primaryContactEmail,
      name: body.primaryContactName,
      role: 'cliente' as const,
      phone: body.phone,
      permissions: { view: true, create: true, delete: true },
      isPrimary: true,
    }
    db.users.push(clienteUser)
    db.userPasswords[clienteUser.id] = password

    const loginUrl = '/login?rol=cliente'

    addAuditLog({
      tenantId: tenant.id,
      actorId: user.id,
      actorName: user.name,
      action: 'crear',
      entity: 'tenant',
      entityId: tenant.id,
      detail: `Cliente ${tenant.name} creado`,
    })
    addAuditLog({
      tenantId: tenant.id,
      actorId: user.id,
      actorName: user.name,
      action: 'enviar_acceso',
      entity: 'user',
      entityId: clienteUser.id,
      detail: `Acceso enviado a ${body.primaryContactEmail}`,
    })

    const emailResult = await sendTenantAccessEmail({
      to: body.primaryContactEmail,
      contactName: body.primaryContactName,
      tenantName: tenant.name,
      loginUrl,
      password,
      panelExpiresAt: body.panelExpiresAt,
    })

    return HttpResponse.json(
      {
        tenant,
        user: clienteUser,
        emailSent: {
          to: body.primaryContactEmail,
          loginUrl,
          password,
          panelExpiresAt: body.panelExpiresAt,
          delivered: emailResult.sent,
          resendId: emailResult.sent ? emailResult.id : null,
          error: emailResult.sent ? undefined : emailResult.reason,
        },
      },
      { status: 201 },
    )
  }),

  http.patch('/api/admin/tenants/:id', async ({ request, params }) => {
    const user = getAuthHeader(request)
    if (!user || user.role !== 'admin') return HttpResponse.json({ message: 'No autorizado' }, { status: 403 })
    const body = (await request.json()) as Partial<CreateTenantInput>
    const index = db.tenants.findIndex((t) => t.id === params.id)
    if (index === -1) return HttpResponse.json({ message: 'No encontrado' }, { status: 404 })
    db.tenants[index] = { ...db.tenants[index], ...body }
    addAuditLog({
      tenantId: db.tenants[index].id,
      actorId: user.id,
      actorName: user.name,
      action: 'editar',
      entity: 'tenant',
      entityId: db.tenants[index].id,
      detail: `Cliente ${db.tenants[index].name} actualizado`,
    })
    return HttpResponse.json(db.tenants[index])
  }),

  http.get('/api/admin/registrations', ({ request }) => {
    const user = getAuthHeader(request)
    if (!user || user.role !== 'admin') return HttpResponse.json({ message: 'No autorizado' }, { status: 403 })
    const data = db.registrations
      .map((r) => ({
        ...r,
        tenantName: db.tenants.find((t) => t.id === r.tenantId)?.name ?? '',
        personCount: db.persons.filter((p) => p.registrationId === r.id).length,
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return HttpResponse.json(data.slice(0, 10))
  }),

  http.get('/api/admin/logs/:tenantId', ({ request, params }) => {
    const user = getAuthHeader(request)
    if (!user || user.role !== 'admin') return HttpResponse.json({ message: 'No autorizado' }, { status: 403 })
    const logs = db.auditLogs.filter((l) => l.tenantId === params.tenantId)
    return HttpResponse.json(logs)
  }),

  http.get('/api/cliente/stats', ({ request }) => {
    const user = getAuthHeader(request)
    if (!user || user.role !== 'cliente' || !user.tenantId) {
      return HttpResponse.json({ message: 'No autorizado' }, { status: 403 })
    }
    return HttpResponse.json({
      pendingValidations: db.persons.filter(
        (p) => p.tenantId === user.tenantId && p.overallStatus === 'pending_validation',
      ).length,
      activeAccess: db.accessCredentials.filter((a) => {
        const person = db.persons.find((p) => p.id === a.personId)
        return person?.tenantId === user.tenantId && new Date(a.validUntil) > new Date()
      }).length,
    })
  }),

  http.get('/api/cliente/registrations', ({ request }) => {
    const user = getAuthHeader(request)
    if (!user || user.role !== 'cliente' || !user.tenantId) {
      return HttpResponse.json({ message: 'No autorizado' }, { status: 403 })
    }
    const url = new URL(request.url)
    const typeCode = url.searchParams.get('typeCode')
    const status = url.searchParams.get('status')
    let list = db.registrations.filter((r) => r.tenantId === user.tenantId)
    if (typeCode && typeCode !== 'all') {
      list = list.filter((r) => r.typeCode === typeCode)
    }
    if (status && status !== 'all') {
      list = list.filter((r) => r.status === status)
    }
    const data = list
      .map((r) => {
        const registrationPersons = db.persons.filter((p) => p.registrationId === r.id)
        return {
          ...r,
          personCount: registrationPersons.length,
          persons: registrationPersons.map((person) => ({
            ...person,
            documentCount: db.documents.filter((d) => d.personId === person.id).length,
            invitationToken: db.invitations.find((i) => i.personId === person.id)?.token ?? null,
          })),
        }
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return HttpResponse.json(data)
  }),

  http.get('/api/cliente/registrations/:id', ({ request, params }) => {
    const user = getAuthHeader(request)
    if (!user || user.role !== 'cliente' || !user.tenantId) {
      return HttpResponse.json({ message: 'No autorizado' }, { status: 403 })
    }
    const registration = db.registrations.find((r) => r.id === params.id && r.tenantId === user.tenantId)
    if (!registration) return HttpResponse.json({ message: 'No encontrado' }, { status: 404 })
    const registrationPersons = db.persons
      .filter((p) => p.registrationId === registration.id)
      .map((person) => ({
        ...person,
        documents: db.documents.filter((d) => d.personId === person.id),
        validationItems: db.validationItems.filter((v) => v.personId === person.id),
        credential: db.accessCredentials.find((a) => a.personId === person.id) ?? null,
        invitation: db.invitations.find((i) => i.personId === person.id) ?? null,
      }))
    const logs = db.auditLogs.filter((l) => l.entityId === registration.id)
    return HttpResponse.json({ registration, persons: registrationPersons, logs })
  }),

  http.post('/api/cliente/registrations', async ({ request }) => {
    const user = getAuthHeader(request)
    if (!user || user.role !== 'cliente' || !user.tenantId) {
      return HttpResponse.json({ message: 'No autorizado' }, { status: 403 })
    }
    if (!hasPermission(user, 'create')) {
      return HttpResponse.json({ message: 'Sin permiso para registrar' }, { status: 403 })
    }
    const body = (await request.json()) as CreateRegistrationInput
    const type = db.registrationTypes.find((t) => t.id === body.typeId)
    if (!type) return HttpResponse.json({ message: 'Tipo inv?lido' }, { status: 400 })
    const now = new Date().toISOString()
    const firstPerson = body.persons[0]
    const registration = {
      id: generateId(),
      tenantId: user.tenantId,
      typeId: type.id,
      typeCode: type.code,
      typeName: type.name,
      status: 'invited' as const,
      payload: body.payload,
      inviteEmail: firstPerson.email,
      inviteContactName: firstPerson.nombreCompleto,
      createdAt: now,
      updatedAt: now,
    }
    db.registrations.push(registration)

    const invitations: Array<{
      personId: string
      email: string
      token: string
      loginUrl: string
    }> = []

    const tenant = db.tenants.find((t) => t.id === user.tenantId)!

    for (const personInput of body.persons) {
      const personId = generateId()
      const personalData = {
        nombreCompleto: personInput.nombreCompleto,
        telefono: personInput.telefono,
        curp: personInput.curp,
        email: personInput.email,
        puesto: personInput.puesto,
      }
      db.persons.push({
        id: personId,
        registrationId: registration.id,
        tenantId: user.tenantId,
        personalData,
        incodeStatus: 'idle',
        overallStatus: 'invited',
        createdAt: now,
        updatedAt: now,
      })
      db.validationItems.push(...createPersonValidationItems(personId, personalData, generateId))

      const token = `token-${personId.slice(0, 8)}`
      const loginUrl = `/portal/invitacion/${token}`
      db.invitations.push({
        id: generateId(),
        registrationId: registration.id,
        tenantId: user.tenantId,
        personId,
        email: personInput.email,
        token,
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        acceptedAt: null,
      })
      invitations.push({ personId, email: personInput.email, token, loginUrl })

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

      addAuditLog({
        tenantId: user.tenantId,
        actorId: user.id,
        actorName: user.name,
        action: 'enviar_acceso',
        entity: 'person',
        entityId: personId,
        detail: emailResult.sent
          ? `Correo enviado a ${personInput.email} (Resend ${emailResult.id ?? ''})`
          : `Invitaci?n registrada para ${personInput.email} (correo: ${emailResult.reason})`,
      })
    }

    addAuditLog({
      tenantId: user.tenantId,
      actorId: user.id,
      actorName: user.name,
      action: 'invitar',
      entity: 'registration',
      entityId: registration.id,
      detail: `Registro ${type.name} creado con ${body.persons.length} persona(s)`,
    })

    return HttpResponse.json({ registration, invitations }, { status: 201 })
  }),

  http.get('/api/cliente/validations', ({ request }) => {
    const user = getAuthHeader(request)
    if (!user || user.role !== 'cliente' || !user.tenantId) {
      return HttpResponse.json({ message: 'No autorizado' }, { status: 403 })
    }
    const data = db.persons
      .filter((p) => p.tenantId === user.tenantId && p.overallStatus === 'pending_validation')
      .map((person) => {
        const registration = db.registrations.find((r) => r.id === person.registrationId)!
        const docs = db.documents.filter((d) => d.personId === person.id)
        return {
          ...person,
          registrationType: registration.typeName,
          registrationId: registration.id,
          documentCount: docs.length,
          pendingDocs: docs.filter((d) => d.validationStatus === 'pending').length,
        }
      })
    return HttpResponse.json(data)
  }),

  http.get('/api/cliente/persons/:id', ({ request, params }) => {
    const user = getAuthHeader(request)
    if (!user || user.role !== 'cliente' || !user.tenantId) {
      return HttpResponse.json({ message: 'No autorizado' }, { status: 403 })
    }
    const person = db.persons.find((p) => p.id === params.id && p.tenantId === user.tenantId)
    if (!person) return HttpResponse.json({ message: 'No encontrado' }, { status: 404 })
    const docs = db.documents.filter((d) => d.personId === person.id)
    const items = db.validationItems.filter((v) => v.personId === person.id)
    const registration = db.registrations.find((r) => r.id === person.registrationId)
    return HttpResponse.json({ person, documents: docs, validationItems: items, registration })
  }),

  http.patch('/api/cliente/validation-items/:id', async ({ request, params }) => {
    const user = getAuthHeader(request)
    if (!user || user.role !== 'cliente' || !user.tenantId) {
      return HttpResponse.json({ message: 'No autorizado' }, { status: 403 })
    }
    const body = (await request.json()) as { status: 'approved' | 'rejected'; rejectionReason?: string }
    if (body.status === 'approved' && !hasPermission(user, 'create')) {
      return HttpResponse.json({ message: 'Sin permiso para aprobar' }, { status: 403 })
    }
    if (body.status === 'rejected' && !hasPermission(user, 'delete')) {
      return HttpResponse.json({ message: 'Sin permiso para rechazar' }, { status: 403 })
    }
    const item = db.validationItems.find((v) => v.id === params.id)
    if (!item) return HttpResponse.json({ message: 'No encontrado' }, { status: 404 })
    item.status = body.status
    item.rejectionReason = body.rejectionReason
    const doc = db.documents.find(
      (d) => d.personId === item.personId && d.name === item.label,
    )
    if (doc) {
      doc.validationStatus = body.status
      doc.rejectionReason = body.rejectionReason
    }
    return HttpResponse.json(item)
  }),

  http.post('/api/cliente/persons/:id/approve', async ({ request, params }) => {
    const user = getAuthHeader(request)
    if (!user || user.role !== 'cliente' || !user.tenantId) {
      return HttpResponse.json({ message: 'No autorizado' }, { status: 403 })
    }
    if (!hasPermission(user, 'create')) {
      return HttpResponse.json({ message: 'Sin permiso para aprobar' }, { status: 403 })
    }
    const person = db.persons.find((p) => p.id === params.id && p.tenantId === user.tenantId)
    if (!person) return HttpResponse.json({ message: 'No encontrado' }, { status: 404 })
    const items = db.validationItems.filter((v) => v.personId === person.id)
    if (!items.every((i) => i.status === 'approved')) {
      return HttpResponse.json({ message: 'Faltan ?tems por aprobar' }, { status: 400 })
    }
    const registration = db.registrations.find((r) => r.id === person.registrationId)!
    const type = db.registrationTypes.find((t) => t.id === registration.typeId)!
    person.overallStatus = type.requiresAccess ? 'access_issued' : 'approved'
    person.updatedAt = new Date().toISOString()
    if (type.requiresAccess) {
      const manualCode = generateManualCode()
      const { validFrom, validUntil } = getAccessWindow(getMeetingDate(registration.payload))
      const credential = {
        id: generateId(),
        personId: person.id,
        qrPayload: `ACCESS:${person.id}:${person.tenantId}:${validFrom}`,
        manualCode,
        validFrom,
        validUntil,
      }
      db.accessCredentials.push(credential)
      const tenant = db.tenants.find((t) => t.id === person.tenantId)!
      const invitation = db.invitations.find((i) => i.personId === person.id)

      const emailResult = await sendAppointmentAccessEmail({
        to: person.personalData.email,
        personName: person.personalData.nombreCompleto,
        tenantName: tenant.name,
        tenantAddress: tenant.address,
        mapsUrl: mapsUrl(tenant.address, tenant.addressLat, tenant.addressLng),
        registrationUrl: invitation ? `/portal/invitacion/${invitation.token}` : '/portal',
        fechaCita: getMeetingDate(registration.payload),
        responsable: registration.payload.responsable ?? tenant.primaryContactName,
        manualCode: credential.manualCode,
        qrPayload: credential.qrPayload,
        validFrom: credential.validFrom,
        validUntil: credential.validUntil,
      })

      addAuditLog({
        tenantId: user.tenantId,
        actorId: user.id,
        actorName: user.name,
        action: 'emitir_acceso',
        entity: 'person',
        entityId: person.id,
        detail: emailResult.sent
          ? `Acceso QR enviado a ${person.personalData.email} (Resend ${emailResult.id ?? ''})`
          : `Acceso QR emitido para ${person.personalData.nombreCompleto} (correo: ${emailResult.reason})`,
      })
      return HttpResponse.json({ person, credential, emailSent: emailResult })
    }
    return HttpResponse.json({ person })
  }),

  http.get('/api/cliente/historial', ({ request }) => {
    const user = getAuthHeader(request)
    if (!user || user.role !== 'cliente' || !user.tenantId) {
      return HttpResponse.json({ message: 'No autorizado' }, { status: 403 })
    }
    const logs = db.auditLogs.filter((l) => l.tenantId === user.tenantId)
    return HttpResponse.json(logs)
  }),

  http.get('/api/cliente/perfil', ({ request }) => {
    const user = getAuthHeader(request)
    if (!user || user.role !== 'cliente' || !user.tenantId) {
      return HttpResponse.json({ message: 'No autorizado' }, { status: 403 })
    }
    const tenant = db.tenants.find((t) => t.id === user.tenantId)
    return HttpResponse.json({ user, tenant })
  }),

  http.get('/api/registration-types', () => HttpResponse.json(db.registrationTypes)),

  http.get('/api/portal/invitation/:token', ({ params }) => {
    const invitation = db.invitations.find((i) => i.token === params.token)
    if (!invitation) return HttpResponse.json({ message: 'Invitaci?n inv?lida' }, { status: 404 })
    if (new Date(invitation.expiresAt) < new Date()) {
      return HttpResponse.json({ message: 'Invitaci?n expirada' }, { status: 410 })
    }
    const registration = db.registrations.find((r) => r.id === invitation.registrationId)!
    const tenant = db.tenants.find((t) => t.id === registration.tenantId)!
    const type = db.registrationTypes.find((t) => t.id === registration.typeId)!
    const person = invitation.personId
      ? db.persons.find((p) => p.id === invitation.personId) ?? null
      : null
    return HttpResponse.json({ invitation, registration, tenant, type, person })
  }),

  http.post('/api/portal/invitation/:token/accept', ({ params }) => {
    const invitation = db.invitations.find((i) => i.token === params.token)
    if (!invitation) return HttpResponse.json({ message: 'Invitaci?n inv?lida' }, { status: 404 })
    if (new Date(invitation.expiresAt) < new Date()) {
      return HttpResponse.json({ message: 'Invitaci?n expirada' }, { status: 410 })
    }
    invitation.acceptedAt = new Date().toISOString()
    const registration = db.registrations.find((r) => r.id === invitation.registrationId)!
    if (registration.status === 'invited') {
      registration.status = 'in_progress'
      registration.updatedAt = new Date().toISOString()
    }
    if (invitation.personId) {
      const person = db.persons.find((p) => p.id === invitation.personId)
      if (person && person.overallStatus === 'invited') {
        person.overallStatus = 'in_progress'
        person.updatedAt = new Date().toISOString()
      }
    }
    return HttpResponse.json({ invitation })
  }),

  http.get('/api/portal/session', ({ request }) => {
    const session = getPortalSession(request)
    if (!session) return HttpResponse.json({ message: 'Sesi?n inv?lida' }, { status: 401 })
    const tenant = db.tenants.find((t) => t.id === session.registration.tenantId)!
    const type = db.registrationTypes.find((t) => t.id === session.registration.typeId)!
    const registrationPersons = session.person
      ? [session.person]
      : db.persons.filter((p) => p.registrationId === session.registration.id)
    return HttpResponse.json({
      registration: session.registration,
      tenant,
      type,
      persons: registrationPersons,
      personId: session.invitation.personId ?? null,
    })
  }),

  http.get('/api/portal/persons', ({ request }) => {
    const session = getPortalSession(request)
    if (!session) return HttpResponse.json({ message: 'Sesi?n inv?lida' }, { status: 401 })
    const data = db.persons.filter((p) => p.registrationId === session.registration.id)
    return HttpResponse.json(data)
  }),

  http.get('/api/portal/persons/:id', ({ request, params }) => {
    const session = getPortalSession(request)
    if (!session) return HttpResponse.json({ message: 'Sesi?n inv?lida' }, { status: 401 })
    const person = db.persons.find(
      (p) => p.id === params.id && p.registrationId === session.registration.id,
    )
    if (!person) return HttpResponse.json({ message: 'No encontrado' }, { status: 404 })
    const docs = db.documents.filter((d) => d.personId === person.id)
    const items = db.validationItems.filter((v) => v.personId === person.id)
    const credential = db.accessCredentials.find((a) => a.personId === person.id) ?? null
    const type = db.registrationTypes.find((t) => t.id === session.registration.typeId)!
    return HttpResponse.json({ person, documents: docs, validationItems: items, credential, type })
  }),

  http.post('/api/portal/persons', async ({ request }) => {
    const session = getPortalSession(request)
    if (!session) return HttpResponse.json({ message: 'Sesi?n inv?lida' }, { status: 401 })
    const body = (await request.json()) as { personalData: Record<string, string> }
    const now = new Date().toISOString()
    const person = {
      id: generateId(),
      registrationId: session.registration.id,
      tenantId: session.registration.tenantId,
      personalData: body.personalData,
      incodeStatus: 'idle' as const,
      overallStatus: 'in_progress' as const,
      createdAt: now,
      updatedAt: now,
    }
    db.persons.push(person)
    db.validationItems.push(...createPersonValidationItems(person.id, body.personalData, generateId))
    return HttpResponse.json(person, { status: 201 })
  }),

  http.post('/api/portal/persons/:id/documents', async ({ request, params }) => {
    const session = getPortalSession(request)
    if (!session) return HttpResponse.json({ message: 'Sesi?n inv?lida' }, { status: 401 })
    const body = (await request.json()) as { name: string; type: string; fileName: string }
    const doc = {
      id: generateId(),
      personId: params.id as string,
      name: body.name,
      type: body.type,
      fileName: body.fileName,
      validationStatus: 'pending' as const,
    }
    db.documents.push(doc)
    const existingItem = db.validationItems.find(
      (v) => v.personId === params.id && v.category === 'document' && v.label === body.name,
    )
    if (!existingItem) {
      db.validationItems.push({
        id: generateId(),
        personId: params.id as string,
        category: 'document',
        label: body.name,
        status: 'pending',
      })
    }
    const person = db.persons.find((p) => p.id === params.id)
    if (person) {
      person.updatedAt = new Date().toISOString()
      const personDocs = db.documents.filter((d) => d.personId === person.id)
      const hasAllDocs = ['ine', 'curp_doc', 'acta_nacimiento', 'foto'].every((t) =>
        personDocs.some((d) => d.type === t),
      )
      if (hasAllDocs && person.incodeStatus === 'verified' && person.overallStatus === 'in_progress') {
        person.overallStatus = 'pending_validation'
      }
    }
    return HttpResponse.json(doc, { status: 201 })
  }),

  http.post('/api/portal/persons/:id/incode', async ({ request, params }) => {
    const session = getPortalSession(request)
    if (!session) return HttpResponse.json({ message: 'Sesi?n inv?lida' }, { status: 401 })
    const person = db.persons.find((p) => p.id === params.id)
    if (!person) return HttpResponse.json({ message: 'No encontrado' }, { status: 404 })
    person.incodeStatus = 'processing'
    await new Promise((r) => setTimeout(r, 1500))
    person.incodeStatus = 'verified'
    let incodeItem = db.validationItems.find(
      (v) => v.personId === person.id && v.category === 'incode',
    )
    if (!incodeItem) {
      incodeItem = {
        id: generateId(),
        personId: person.id,
        category: 'incode',
        label: 'Verificaci?n INE',
        status: 'pending',
      }
      db.validationItems.push(incodeItem)
    }
    person.overallStatus = 'pending_validation'
    person.updatedAt = new Date().toISOString()
    return HttpResponse.json({ person, incodeStatus: person.incodeStatus })
  }),

  http.get('/api/portal/persons/:id/access', ({ request, params }) => {
    const session = getPortalSession(request)
    if (!session) return HttpResponse.json({ message: 'Sesi?n inv?lida' }, { status: 401 })
    const credential = db.accessCredentials.find((a) => a.personId === params.id)
    if (!credential) return HttpResponse.json({ message: 'Acceso no emitido' }, { status: 404 })
    return HttpResponse.json(credential)
  }),
]
