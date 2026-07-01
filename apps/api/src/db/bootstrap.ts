import bcrypt from 'bcryptjs'
import { eq, sql } from 'drizzle-orm'
import { env } from '../env.js'
import { generateId } from '../lib/utils.js'
import { CATALOG_REGISTRATION_TYPES } from './catalog-types.js'
import { db } from './client.js'
import { registrationTypes, users } from './schema.js'

export async function ensureCatalog() {
  const existing = await db.select({ id: registrationTypes.id }).from(registrationTypes).limit(1)
  if (existing.length > 0) return

  for (const rt of CATALOG_REGISTRATION_TYPES) {
    await db.insert(registrationTypes).values({
      id: rt.id,
      code: rt.code,
      name: rt.name,
      description: rt.description,
      requiresIncode: rt.requiresIncode,
      requiresAccess: rt.requiresAccess,
      fieldSchema: rt.fieldSchema,
    })
  }
}

export async function ensureAdminUser() {
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
    console.warn(
      '[bootstrap] Define ADMIN_EMAIL y ADMIN_PASSWORD para crear el administrador inicial.',
    )
    return
  }

  const adminEmail = env.ADMIN_EMAIL.toLowerCase()
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, adminEmail)).limit(1)
  if (existing) return

  const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 10)
  await db.insert(users).values({
    id: generateId(),
    tenantId: null,
    email: adminEmail,
    name: env.ADMIN_NAME,
    role: 'admin',
    phone: null,
    permissions: null,
    isPrimary: false,
    passwordHash,
  })
  console.log(`[bootstrap] Administrador creado: ${adminEmail}`)
}

export async function bootstrapDatabase() {
  await ensureCatalog()
  await ensureAdminUser()
}

export async function resetDatabase() {
  await db.execute(sql`TRUNCATE TABLE
    audit_logs, access_credentials, validation_items, documents, invitations,
    persons, registrations, users, registration_types, tenants
    RESTART IDENTITY CASCADE`)

  for (const rt of CATALOG_REGISTRATION_TYPES) {
    await db.insert(registrationTypes).values({
      id: rt.id,
      code: rt.code,
      name: rt.name,
      description: rt.description,
      requiresIncode: rt.requiresIncode,
      requiresAccess: rt.requiresAccess,
      fieldSchema: rt.fieldSchema,
    })
  }

  if (env.ADMIN_EMAIL && env.ADMIN_PASSWORD) {
    const adminEmail = env.ADMIN_EMAIL.toLowerCase()
    const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 10)
    await db.insert(users).values({
      id: generateId(),
      tenantId: null,
      email: adminEmail,
      name: env.ADMIN_NAME,
      role: 'admin',
      phone: null,
      permissions: null,
      isPrimary: false,
      passwordHash,
    })
    console.log(`[reset] Base limpia. Admin: ${adminEmail}`)
  } else {
    console.log('[reset] Base limpia. Sin admin — define ADMIN_EMAIL y ADMIN_PASSWORD y vuelve a ejecutar db:reset.')
  }
}
