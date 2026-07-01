import { and, eq } from 'drizzle-orm'
import type { Context, Next } from 'hono'
import { db } from '../db/client.js'
import { invitations, persons, registrations } from '../db/schema.js'
import { mapInvitation, mapPerson, mapRegistration } from '../lib/mappers.js'

export type PortalVariables = {
  invitation: ReturnType<typeof mapInvitation>
  registration: ReturnType<typeof mapRegistration>
  person?: ReturnType<typeof mapPerson>
}

export async function portalMiddleware(c: Context<{ Variables: PortalVariables }>, next: Next) {
  const token = c.req.header('X-Portal-Token')
  if (!token) {
    return c.json({ message: 'Sesión inválida' }, 401)
  }

  const [invitationRow] = await db.select().from(invitations).where(eq(invitations.token, token)).limit(1)
  if (!invitationRow) {
    return c.json({ message: 'Sesión inválida' }, 401)
  }

  const invitation = mapInvitation(invitationRow)
  if (new Date(invitation.expiresAt) < new Date()) {
    return c.json({ message: 'Invitación expirada' }, 410)
  }

  const [registrationRow] = await db
    .select()
    .from(registrations)
    .where(eq(registrations.id, invitation.registrationId))
    .limit(1)
  if (!registrationRow) {
    return c.json({ message: 'Sesión inválida' }, 401)
  }

  const registration = mapRegistration(registrationRow)
  let person: ReturnType<typeof mapPerson> | undefined

  if (invitation.personId) {
    const [personRow] = await db
      .select()
      .from(persons)
      .where(and(eq(persons.id, invitation.personId), eq(persons.registrationId, registration.id)))
      .limit(1)
    if (personRow) person = mapPerson(personRow)
  }

  c.set('invitation', invitation)
  c.set('registration', registration)
  if (person) c.set('person', person)
  await next()
}
