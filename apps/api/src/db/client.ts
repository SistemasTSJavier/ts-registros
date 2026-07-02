import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import { env } from '../env.js'
import { INIT_MIGRATION_SQL } from './migration-sql.js'
import * as schema from './schema.js'

const { Pool } = pg

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: env.DATABASE_URL.includes('supabase') ? { rejectUnauthorized: false } : undefined,
  max: process.env.VERCEL ? 1 : 10,
  connectionTimeoutMillis: 15_000,
  idleTimeoutMillis: 5_000,
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

  await pool.query(INIT_MIGRATION_SQL)
  await pool.query('INSERT INTO _schema_migrations (id) VALUES ($1) ON CONFLICT DO NOTHING', [migrationId])
}

export async function initDb() {
  await runMigrations()
}

export async function closeDb() {
  await pool.end()
}
