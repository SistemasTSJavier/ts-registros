import { serve } from '@hono/node-server'
import { env } from './env.js'
import { getApp } from './app.js'
import { closeDb } from './db/client.js'

async function main() {
  const app = await getApp()

  serve({ fetch: app.fetch, port: env.PORT }, (info) => {
    console.log(`API listening on http://localhost:${info.port}`)
  })
}

main().catch(async (err) => {
  console.error('Failed to start API:', err)
  await closeDb()
  process.exit(1)
})

process.on('SIGINT', async () => {
  await closeDb()
  process.exit(0)
})
