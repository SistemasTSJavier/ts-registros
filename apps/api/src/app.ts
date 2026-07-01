import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { env } from './env.js'
import { bootstrapDatabase } from './db/bootstrap.js'
import { db, initDb } from './db/client.js'
import { registrationTypes, users } from './db/schema.js'
import { adminRoutes } from './routes/admin.js'
import { authRoutes } from './routes/auth.js'
import { catalogRoutes } from './routes/catalog.js'
import { clienteRoutes } from './routes/cliente.js'
import { emailRoutes } from './routes/email.js'
import { portalRoutes } from './routes/portal.js'
import { ensureDocumentsBucket } from './services/storage.js'

function corsOrigins() {
  const origins = new Set<string>([env.APP_URL, 'http://localhost:5173'])
  if (process.env.VERCEL_URL) {
    origins.add(`https://${process.env.VERCEL_URL}`)
  }
  if (process.env.VERCEL_BRANCH_URL) {
    origins.add(`https://${process.env.VERCEL_BRANCH_URL}`)
  }
  return [...origins]
}

export function createApp() {
  const app = new Hono()

  app.use(
    '*',
    cors({
      origin: corsOrigins(),
      allowHeaders: ['Content-Type', 'Authorization', 'X-Portal-Token', 'X-Email-Secret'],
    }),
  )

  app.get('/health', (c) => c.json({ ok: true }))
  app.get('/api/health', (c) => c.json({ ok: true }))

  app.get('/api/setup/status', async (c) => {
    try {
      const userCount = await db.select({ id: users.id }).from(users)
      const typeCount = await db.select({ id: registrationTypes.id }).from(registrationTypes)
      return c.json({
        ok: true,
        users: userCount.length,
        registrationTypes: typeCount.length,
        adminConfigured: Boolean(env.ADMIN_EMAIL && env.ADMIN_PASSWORD),
      })
    } catch (error) {
      return c.json(
        {
          ok: false,
          message: error instanceof Error ? error.message : 'Error de base de datos',
        },
        500,
      )
    }
  })

  app.route('/api/auth', authRoutes)
  app.route('/api', catalogRoutes)
  app.route('/api/admin', adminRoutes)
  app.route('/api/cliente', clienteRoutes)
  app.route('/api/portal', portalRoutes)
  app.route('/api/email', emailRoutes)

  app.onError((err, c) => {
    console.error(err)
    if (err.name === 'ZodError') {
      return c.json({ message: 'Datos inválidos' }, 400)
    }
    return c.json({ message: err.message || 'Error interno' }, 500)
  })

  return app
}

let ready: Promise<Hono> | null = null

export async function getApp() {
  if (!ready) {
    ready = (async () => {
      await initDb()
      await bootstrapDatabase()
      try {
        await ensureDocumentsBucket()
      } catch (error) {
        console.warn('Storage bucket setup skipped:', error instanceof Error ? error.message : error)
      }
      return createApp()
    })()
  }
  return ready
}
