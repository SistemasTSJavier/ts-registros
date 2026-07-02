import { handle } from 'hono/vercel'
import { Hono } from 'hono'

const root = new Hono()

root.all('*', async (c) => {
  try {
    const { getApp } = await import('../../api/src/app.js')
    const app = await getApp()
    return app.fetch(c.req.raw, c.env)
  } catch (error) {
    console.error('API init failed:', error)
    const message = error instanceof Error ? error.message : 'Error al iniciar la API'
    return c.json({ message, error: message }, 500)
  }
})

export default handle(root)

export const config = {
  maxDuration: 30,
}
