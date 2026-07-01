import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import { env } from '../env.js'
import * as schema from './schema.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const { Pool } = pg

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: env.DATABASE_URL.includes('supabase') ? { rejectUnauthorized: false } : undefined,
  max: process.env.VERCEL ? 1 : 10,
})

export const db = drizzle(pool, { schema })

async function runMigrations() {
  const migrationId = '00001_init'
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  const existing = await pool.query('SELECT id FROM _schema_migrations WHERE id = $1', [migrationId])
  if (existing.rowCount && existing.rowCount > 0) return

  const sqlPath = join(__dirname, 'migrations', '00001_init.sql')
  const sql = readFileSync(sqlPath, 'utf-8')
  await pool.query(sql)
  await pool.query('INSERT INTO _schema_migrations (id) VALUES ($1) ON CONFLICT DO NOTHING', [migrationId])
}

export async function initDb() {
  await runMigrations()
}

export async function closeDb() {
  await pool.end()
}
