import { and, desc, eq, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'
import { db } from '../db/client.js'
import {
  auditLogs,
  accessCredentials,
  persons,
  registrations,
  tenants,
  users,
} from '../db/schema.js'
import { authMiddleware, requireRole, type AuthVariables } from '../middleware/auth.js'
import { mapAuditLog, mapRegistration, mapTenant, mapUser } from '../lib/mappers.js'
import { generateId, generatePassword } from '../lib/utils.js'
import { addAuditLog } from '../services/audit.js'
import { sendTenantAccessEmail } from '../services/email.js'
import bcrypt from 'bcryptjs'

const createTenantSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  primaryContactName: z.string().min(1),
  primaryContactEmail: z.string().email(),
  address: z.string().min(1),
  addressLat: z.number().optional(),
  addressLng: z.number().optional(),
  panelExpiresAt: z.string().min(1),
  status: z.enum(['active', 'inactive']).default('active'),
})

export const adminRoutes = new Hono<{ Variables: AuthVariables }>()

adminRoutes.use('*', authMiddleware, requireRole('admin'))

adminRoutes.get('/stats', async (c) => {
  const today = new Date().toISOString().slice(0, 10)
  const [tenantCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(tenants)
    .where(eq(tenants.status, 'active'))
  const [regCount] = await db.select({ count: sql<number>`count(*)::int` }).from(registrations)
  const [pendingCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(persons)
    .where(eq(persons.overallStatus, 'pending_validation'))
  const credRows = await db.select().from(accessCredentials)
  const accessIssuedToday = credRows.filter((a) => a.validFrom.startsWith(today)).length

  return c.json({
    totalTenants: tenantCount?.count ?? 0,
    totalRegistrations: regCount?.count ?? 0,
    pendingValidations: pendingCount?.count ?? 0,
    accessIssuedToday,
  })
})

adminRoutes.get('/tenants', async (c) => {
  const tenantRows = await db.select().from(tenants)
  const userRows = await db.select().from(users)
  const regRows = await db.select().from(registrations)

  const data = tenantRows.map((tenant) => {
    const tenantUsers = userRows.filter((u) => u.tenantId === tenant.id)
    return {
      ...mapTenant(tenant),
      registrationCount: regRows.filter((r) => r.tenantId === tenant.id).length,
      userCount: tenantUsers.length,
      extraUserCount: tenantUsers.filter((u) => !u.isPrimary).length,
    }
  })
  return c.json(data)
})

adminRoutes.get('/tenants/:id', async (c) => {
  const id = c.req.param('id')
  const [tenantRow] = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1)
  if (!tenantRow) return c.json({ message: 'No encontrado' }, 404)

  const tenantUsers = (await db.select().from(users).where(eq(users.tenantId, id))).map(mapUser)
  const tenantRegistrations = (await db.select().from(registrations).where(eq(registrations.tenantId, id))).map(
    mapRegistration,
  )
  const tenantLogs = (await db.select().from(auditLogs).where(eq(auditLogs.tenantId, id))).map(mapAuditLog)
  const tenantPersons = await db.select().from(persons).where(eq(persons.tenantId, id))

  return c.json({
    tenant: mapTenant(tenantRow),
    users: tenantUsers,
    registrations: tenantRegistrations,
    logs: tenantLogs,
    stats: {
      registrations: tenantRegistrations.length,
      persons: tenantPersons.length,
      pending: tenantPersons.filter((p) => p.overallStatus === 'pending_validation').length,
    },
  })
})

adminRoutes.get('/dashboard', async (c) => {
  const tenantRows = await db.select().from(tenants)
  const userRows = await db.select().from(users)

  const clients = tenantRows.map((tenant) => {
    const tenantUsers = userRows.filter((u) => u.tenantId === tenant.id).map(mapUser)
    return {
      ...mapTenant(tenant),
      userCount: tenantUsers.length,
      extraUserCount: tenantUsers.filter((u) => !u.isPrimary).length,
      users: tenantUsers,
    }
  })

  const extraUsers = userRows
    .filter((u) => u.tenantId && u.role === 'cliente' && !u.isPrimary)
    .map((u) => ({
      ...mapUser(u),
      tenantName: tenantRows.find((t) => t.id === u.tenantId)?.name ?? '',
    }))

  return c.json({ clients, extraUsers })
})

adminRoutes.get('/logs', async (c) => {
  const tenantId = c.req.query('tenantId')
  let logRows = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt))
  if (tenantId && tenantId !== 'all') {
    logRows = logRows.filter((l) => l.tenantId === tenantId)
  }
  const tenantRows = await db.select().from(tenants)
  const enriched = logRows.map((log) => ({
    ...mapAuditLog(log),
    tenantName: log.tenantId ? tenantRows.find((t) => t.id === log.tenantId)?.name ?? '—' : 'Sistema',
  }))
  return c.json(enriched)
})

adminRoutes.get('/logs/:tenantId', async (c) => {
  const tenantId = c.req.param('tenantId')
  const logRows = await db.select().from(auditLogs).where(eq(auditLogs.tenantId, tenantId))
  return c.json(logRows.map(mapAuditLog))
})

adminRoutes.post('/tenants', async (c) => {
  const user = c.get('user')
  const body = createTenantSchema.parse(await c.req.json())
  const password = generatePassword()
  const passwordHash = await bcrypt.hash(password, 10)
  const tenantId = generateId()
  const clienteUserId = generateId()
  const now = new Date().toISOString()

  const tenantRow = {
    id: tenantId,
    createdAt: now,
    name: body.name,
    legalName: body.name,
    address: body.address,
    addressLat: body.addressLat ?? null,
    addressLng: body.addressLng ?? null,
    phone: body.phone,
    status: body.status,
    primaryContactName: body.primaryContactName,
    primaryContactEmail: body.primaryContactEmail,
    primaryContactPhone: body.phone,
    panelExpiresAt: body.panelExpiresAt,
    rfc: null,
  }

  await db.insert(tenants).values(tenantRow)
  await db.insert(users).values({
    id: clienteUserId,
    tenantId,
    email: body.primaryContactEmail,
    name: body.primaryContactName,
    role: 'cliente',
    phone: body.phone,
    permissions: { view: true, create: true, delete: true },
    isPrimary: true,
    passwordHash,
  })

  const loginUrl = '/login?rol=cliente'
  const tenant = mapTenant(tenantRow)
  const clienteUser = mapUser({
    id: clienteUserId,
    tenantId,
    email: body.primaryContactEmail,
    name: body.primaryContactName,
    role: 'cliente',
    phone: body.phone,
    permissions: { view: true, create: true, delete: true },
    isPrimary: true,
    passwordHash,
  })

  await addAuditLog({
    tenantId,
    actorId: user.id,
    actorName: user.name,
    action: 'crear',
    entity: 'tenant',
    entityId: tenantId,
    detail: `Cliente ${tenant.name} creado`,
  })
  await addAuditLog({
    tenantId,
    actorId: user.id,
    actorName: user.name,
    action: 'enviar_acceso',
    entity: 'user',
    entityId: clienteUserId,
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

  return c.json(
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
    201,
  )
})

adminRoutes.patch('/tenants/:id', async (c) => {
  const user = c.get('user')
  const id = c.req.param('id')
  const body = createTenantSchema.partial().parse(await c.req.json())
  const [existing] = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1)
  if (!existing) return c.json({ message: 'No encontrado' }, 404)

  const updates: Partial<typeof existing> = {}
  if (body.name !== undefined) {
    updates.name = body.name
    updates.legalName = body.name
  }
  if (body.address !== undefined) updates.address = body.address
  if (body.addressLat !== undefined) updates.addressLat = body.addressLat
  if (body.addressLng !== undefined) updates.addressLng = body.addressLng
  if (body.phone !== undefined) updates.phone = body.phone
  if (body.status !== undefined) updates.status = body.status
  if (body.primaryContactName !== undefined) updates.primaryContactName = body.primaryContactName
  if (body.primaryContactEmail !== undefined) updates.primaryContactEmail = body.primaryContactEmail
  if (body.panelExpiresAt !== undefined) updates.panelExpiresAt = body.panelExpiresAt

  await db.update(tenants).set(updates).where(eq(tenants.id, id))
  const [updated] = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1)

  await addAuditLog({
    tenantId: id,
    actorId: user.id,
    actorName: user.name,
    action: 'editar',
    entity: 'tenant',
    entityId: id,
    detail: `Cliente ${updated!.name} actualizado`,
  })

  return c.json(mapTenant(updated!))
})

adminRoutes.get('/registrations', async (c) => {
  const regRows = await db.select().from(registrations).orderBy(desc(registrations.createdAt))
  const tenantRows = await db.select().from(tenants)
  const personRows = await db.select().from(persons)

  const data = regRows.map((r) => ({
    ...mapRegistration(r),
    tenantName: tenantRows.find((t) => t.id === r.tenantId)?.name ?? '',
    personCount: personRows.filter((p) => p.registrationId === r.id).length,
  }))
  return c.json(data.slice(0, 10))
})
