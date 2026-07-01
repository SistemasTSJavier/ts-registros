# Deploy en Vercel

Un solo proyecto en Vercel sirve el **frontend** (Vite) y la **API** (Hono serverless en `/api/*`).

## 1. Requisitos

- Cuenta en [Vercel](https://vercel.com)
- Proyecto Supabase configurado (ver `supabase/README.md`)
- CLI: `npm i -g vercel`

## 2. Login y primer deploy

Desde la raíz del repositorio:

```bash
vercel login
vercel link
vercel env pull .env.vercel.local   # opcional, para revisar vars
vercel deploy
```

Para producción:

```bash
vercel --prod
```

También puedes conectar el repo en [vercel.com/new](https://vercel.com/new): **Root Directory** = `.` (raíz del monorepo).

## 3. Variables de entorno en Vercel

En **Project → Settings → Environment Variables**, añade:

### API (serverless — sin prefijo `VITE_`)

| Variable | Valor |
|----------|--------|
| `DATABASE_URL` | URI de Supabase (**Session pooler**, puerto `6543`, recomendado en serverless) |
| `SUPABASE_URL` | URL del proyecto |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key |
| `JWT_SECRET` | Mínimo 32 caracteres aleatorios |
| `APP_URL` | URL de producción, ej. `https://tu-app.vercel.app` |
| `ADMIN_EMAIL` | Admin inicial |
| `ADMIN_PASSWORD` | Contraseña admin (mín. 8 caracteres) |
| `ADMIN_NAME` | Nombre del admin |
| `RESEND_API_KEY` | Opcional |
| `RESEND_FROM_EMAIL` | Remitente verificado en Resend |
| `EMAIL_API_SECRET` | Opcional |

### Frontend (build time)

| Variable | Valor |
|----------|--------|
| `VITE_USE_MOCK` | `false` |
| `VITE_API_URL` | *(vacío)* — las peticiones van al mismo dominio `/api` |
| `VITE_APP_URL` | Misma URL que `APP_URL` |
| `VITE_EMAIL_ENABLED` | `true` si usas Resend |
| `VITE_EMAIL_API_SECRET` | Igual que `EMAIL_API_SECRET` si aplica |

> **Importante:** Tras cambiar variables `VITE_*`, haz **Redeploy** para que el build las incorpore.

## 4. Supabase: connection string para Vercel

En Supabase → **Settings → Database → Connection string**:

- Modo **URI**
- **Session pooler** (no conexión directa `db.xxx:5432` en serverless)

Ejemplo:

```
postgresql://postgres.[ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres
```

## 5. Reset de base (una vez)

Con `DATABASE_URL` apuntando a tu Supabase:

```bash
npm run db:reset
```

Eso deja catálogo + admin; sin tenants ni registros demo.

## 6. Comprobar deploy

- Frontend: `https://tu-app.vercel.app`
- API: `https://tu-app.vercel.app/api/health` → `{ "ok": true }`
- Login admin con `ADMIN_EMAIL` / `ADMIN_PASSWORD`

## 7. Dominio propio (opcional)

En Vercel → **Domains**, añade tu dominio y actualiza `APP_URL` y `VITE_APP_URL`.

## Troubleshooting

| Problema | Solución |
|----------|----------|
| Login 401 | Revisa `JWT_SECRET` y que exista el admin (`db:reset`) |
| API 500 / timeout DB | Usa pooler `6543`, no puerto directo `5432` |
| CORS | `APP_URL` debe coincidir con la URL pública (incl. `https://`) |
| Mock en producción | `VITE_USE_MOCK=false` y redeploy |
| Subida de archivos | Bucket `documents` en Supabase Storage |
