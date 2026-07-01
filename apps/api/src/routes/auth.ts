import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'
import { db } from '../db/client.js'
import { tenants, users } from '../db/schema.js'
import { signAccessToken } from '../lib/jwt.js'
import { mapTenant, mapUser } from '../lib/mappers.js'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  role: z.enum(['admin', 'cliente', 'portal']).optional(),
})

export const authRoutes = new Hono()

authRoutes.post('/login', async (c) => {
  const body = loginSchema.parse(await c.req.json())
  const email = body.email.toLowerCase()
  const [userRow] = await db.select().from(users).where(eq(users.email, email)).limit(1)

  if (!userRow) {
    return c.json({ message: 'Usuario no encontrado' }, 401)
  }

  const valid = await bcrypt.compare(body.password, userRow.passwordHash)
  if (!valid) {
    return c.json({ message: 'Credenciales inválidas' }, 401)
  }

  const user = mapUser(userRow)
  if (body.role && user.role !== body.role) {
    return c.json({ message: 'Rol no autorizado' }, 403)
  }

  let tenant = null
  if (user.tenantId) {
    const [tenantRow] = await db.select().from(tenants).where(eq(tenants.id, user.tenantId)).limit(1)
    tenant = tenantRow ? mapTenant(tenantRow) : null
  }

  const accessToken = await signAccessToken(user)
  return c.json({ user, tenant, accessToken })
})
