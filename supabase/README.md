# Supabase setup — AppWeb Registros

This project uses **Supabase PostgreSQL** for data and **Supabase Storage** for uploaded documents. The Hono API (`apps/api`) connects with the service role key.

## 1. Create a Supabase project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard) and create a new project.
2. Wait until the database is ready.

## 2. Get connection details

In **Project Settings → Database**:

- Copy the **Connection string** (URI mode, pooler recommended for server apps).
- Use it as `DATABASE_URL` in `apps/api/.env`.

In **Project Settings → API**:

- `SUPABASE_URL` — Project URL
- `SUPABASE_SERVICE_ROLE_KEY` — `service_role` key (keep secret, server-only)

## 3. Configure environment

```bash
cp apps/api/.env.example apps/api/.env
```

Edit `apps/api/.env`:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL URI from Supabase |
| `SUPABASE_URL` | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key |
| `JWT_SECRET` | At least 32 random characters |
| `ADMIN_EMAIL` | First admin login email |
| `ADMIN_PASSWORD` | Admin password (min 8 chars) |
| `ADMIN_NAME` | Display name for admin |
| `RESEND_API_KEY` | Optional, for real emails |
| `RESEND_FROM_EMAIL` | Verified sender in Resend |
| `APP_URL` | `http://localhost:5173` in dev |

For the web app:

```bash
cp apps/web/.env.example apps/web/.env
```

Set:

```env
VITE_USE_MOCK=false
VITE_API_URL=
```

With `VITE_API_URL` empty, Vite proxies `/api` to `http://localhost:3001`.

## 4. Install dependencies

From the repository root:

```bash
npm install
```

## 5. Apply schema and start clean

Migrations run automatically when the API starts. To wipe all data and start fresh (catalog types + one admin user):

```bash
npm run db:reset
```

This leaves:

- **3 registration types** (visitante, proveedor, cliente)
- **1 admin user** from `ADMIN_EMAIL` / `ADMIN_PASSWORD`
- **0 tenants, registrations, or portal data**

## 6. First use of the CRM

1. Log in at `/login` with your admin credentials.
2. In **Admin → Clientes**, create a tenant (company).
3. Create a **cliente** user for that tenant (the API generates a temporary password).
4. Log in as cliente → **Nuevo registro** → add people → invitations are sent.
5. Open the portal link from the invitation to upload documents and complete the flow.

## 7. Storage bucket

On first start the API tries to create a private bucket named `documents`. You can also create it manually in **Storage → New bucket** (`documents`, private).

## 8. Run dev (web + API)

```bash
npm run dev
```

- Web: [http://localhost:5173](http://localhost:5173)
- API: [http://localhost:3001](http://localhost:3001)

## 9. Apply SQL manually (optional)

The file `supabase/migrations/00001_init.sql` contains the full schema, indexes, and RLS flags. The API applies it on startup if not yet recorded in `_schema_migrations`. You can also run it in the Supabase SQL editor.

## Troubleshooting

- **SSL errors**: The API enables SSL when `DATABASE_URL` contains `supabase`.
- **JWT / 401**: Log in again; the web app stores `accessToken` from login.
- **Upload failures**: Confirm the `documents` bucket exists and `SUPABASE_SERVICE_ROLE_KEY` is set.
- **No admin after reset**: Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `apps/api/.env`, then run `npm run db:reset` again.
