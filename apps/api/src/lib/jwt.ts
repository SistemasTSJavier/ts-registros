import { SignJWT, jwtVerify } from 'jose'
import { env } from '../env.js'
import type { ApiUser } from './mappers.js'

const secret = new TextEncoder().encode(env.JWT_SECRET)

export async function signAccessToken(user: ApiUser) {
  return new SignJWT({
    role: user.role,
    tenantId: user.tenantId,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret)
}

export async function verifyAccessToken(token: string) {
  const { payload } = await jwtVerify(token, secret)
  const sub = payload.sub
  if (!sub) throw new Error('Invalid token')
  return {
    userId: sub,
    role: payload.role as string | undefined,
    tenantId: payload.tenantId as string | null | undefined,
  }
}
