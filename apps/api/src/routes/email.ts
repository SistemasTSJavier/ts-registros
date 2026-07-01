import { env } from '../env.js'
import {
  emailStatus,
  sendAppointmentAccessEmail,
  sendInvitationEmail,
  sendTenantAccessEmail,
} from '../services/email.js'
import { Hono } from 'hono'

export const emailRoutes = new Hono()

function checkEmailSecret(c: { req: { header: (name: string) => string | undefined } }) {
  if (!env.EMAIL_API_SECRET) return true
  return c.req.header('X-Email-Secret') === env.EMAIL_API_SECRET
}

emailRoutes.get('/status', (c) => c.json(emailStatus()))

emailRoutes.post('/tenant-access', async (c) => {
  if (!checkEmailSecret(c)) return c.json({ message: 'No autorizado' }, 401)
  const body = await c.req.json()
  const result = await sendTenantAccessEmail(body)
  if (!result.sent) return c.json({ reason: result.reason }, 400)
  return c.json({ id: result.id })
})

emailRoutes.post('/invitation', async (c) => {
  if (!checkEmailSecret(c)) return c.json({ message: 'No autorizado' }, 401)
  const body = await c.req.json()
  const result = await sendInvitationEmail(body)
  if (!result.sent) return c.json({ reason: result.reason }, 400)
  return c.json({ id: result.id })
})

emailRoutes.post('/appointment-access', async (c) => {
  if (!checkEmailSecret(c)) return c.json({ message: 'No autorizado' }, 401)
  const body = await c.req.json()
  const result = await sendAppointmentAccessEmail(body)
  if (!result.sent) return c.json({ reason: result.reason }, 400)
  return c.json({ id: result.id })
})
