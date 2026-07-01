import { eq } from 'drizzle-orm'
import type { Context, Next } from 'hono'
import { db } from '../db/client.js'
import { users } from '../db/schema.js'
import { verifyAccessToken } from '../lib/jwt.js'
import { mapUser, type ApiUser } from '../lib/mappers.js'

export type AuthVariables = {
  user: ApiUser
}

async function loadUserById(userId: string): Promise<ApiUser | null> {
  const [row] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  return row ? mapUser(row) : null
}

export async function authMiddleware(c: Context<{ Variables: AuthVariables }>, next: Next) {
  const auth = c.req.header('Authorization')
  if (!auth?.startsWith('Bearer ')) {
    return c.json({ message: 'No autorizado' }, 401)
  }

  const token = auth.slice(7)
  let user: ApiUser | null = null

  try {
    const claims = await verifyAccessToken(token)
    user = await loadUserById(claims.userId)
  } catch {
    user = await loadUserById(token)
  }

  if (!user) {
    return c.json({ message: 'No autorizado' }, 401)
  }

  c.set('user', user)
  await next()
}

export function requireRole(...roles: string[]) {
  return async (c: Context<{ Variables: AuthVariables }>, next: Next) => {
    const user = c.get('user')
    if (!roles.includes(user.role)) {
      return c.json({ message: 'No autorizado' }, 403)
    }
    await next()
  }
}

export function hasPermission(user: ApiUser, key: 'view' | 'create' | 'delete') {
  if (user.role === 'admin') return true
  return user.permissions?.[key] ?? true
}
