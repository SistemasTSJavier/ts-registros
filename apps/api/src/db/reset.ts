import { bootstrapDatabase, resetDatabase } from './bootstrap.js'
import { closeDb, initDb } from './client.js'

const mode = process.argv[2] ?? 'reset'

async function main() {
  await initDb()
  if (mode === 'bootstrap') {
    await bootstrapDatabase()
    console.log('Bootstrap completado.')
  } else {
    await resetDatabase()
    console.log('Reset completado.')
  }
  await closeDb()
}

main().catch(async (err) => {
  console.error(err)
  await closeDb()
  process.exit(1)
})
