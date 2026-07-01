# Registros CRM — Visitas y Proveedores

CRM multi-tenant para gestión de visitas a planta, proveedores y accesos con QR.

## Stack

- **Frontend**: Vite + React 19 + TypeScript + Tailwind CSS 4
- **API**: Hono + PostgreSQL (Supabase)
- **Estado**: TanStack Query + Zustand
- **Storage**: Supabase Storage (documentos)

## Inicio rápido

```bash
npm install
cp apps/api/.env.example apps/api/.env   # configurar Supabase + admin
cp apps/web/.env.example apps/web/.env   # VITE_USE_MOCK=false
npm run db:reset                         # base limpia + catálogo + admin
npm run dev
```

- Web: http://localhost:5173
- API: http://localhost:3001

Detalle de Supabase: `supabase/README.md`  
Deploy en Vercel: `VERCEL.md`

## Primer uso

1. Inicia sesión como **admin** (`ADMIN_EMAIL` / `ADMIN_PASSWORD` en `apps/api/.env`).
2. Crea un **cliente** (tenant) desde Admin.
3. Crea un usuario **cliente** para ese tenant.
4. Como cliente: nuevo registro → invitaciones → validación → acceso QR.

## Módulos

1. **Admin** (`/admin`) — CRUD clientes, vista global, logs
2. **Cliente** (`/cliente`) — Crear registros, invitar, validar documentos
3. **Portal** (`/portal`) — Registro de personas, documentos, verificación INE mock, QR de acceso

## Build

```bash
npm run build
```

## Mock local (sin backend)

En `apps/web/.env` pon `VITE_USE_MOCK=true` y ejecuta solo `npm run dev:web`. Los datos mock arrancan vacíos; necesitas crear usuarios vía handlers o usar la API real.
