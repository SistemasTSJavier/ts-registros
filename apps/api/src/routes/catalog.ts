import { Hono } from 'hono'
import { db } from '../db/client.js'
import { registrationTypes } from '../db/schema.js'
import { mapRegistrationType } from '../lib/mappers.js'

export const catalogRoutes = new Hono()

catalogRoutes.get('/registration-types', async (c) => {
  const rows = await db.select().from(registrationTypes)
  return c.json(rows.map(mapRegistrationType))
})
