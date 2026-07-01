import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().min(1),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().default('Registros <onboarding@resend.dev>'),
  APP_URL: z.string().url().default('http://localhost:5173'),
  EMAIL_API_SECRET: z.string().optional(),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(8).optional(),
  ADMIN_NAME: z.string().default('Administrador'),
})

const requiredKeys = [
  'DATABASE_URL',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'JWT_SECRET',
] as const

const missing = requiredKeys.filter((key) => !process.env[key]?.trim())

if (missing.length > 0) {
  const hint =
    process.env.VERCEL === '1'
      ? ` Añádelas en Vercel → Project → Settings → Environment Variables (sin prefijo VITE_) y haz Redeploy.`
      : ` Cópialas en apps/api/.env`
  throw new Error(`Variables de entorno faltantes: ${missing.join(', ')}.${hint}`)
}

export const env = envSchema.parse(process.env)
