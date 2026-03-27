-- Multi-tenant core (workspace = tenant)
-- Ejecutar en Supabase SQL Editor.

-- 1) Catálogo tenant (alias de workspace para escalabilidad futura)
create table if not exists public.tenant (
  id uuid primary key,
  code text unique not null,
  name text null,
  status text not null default 'active' check (status in ('active', 'suspended', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Backfill: cada workspace existente pasa a tenant.
insert into public.tenant (id, code, name)
select w.id, w.join_code, concat('Servicio ', w.join_code)
from public.workspace w
on conflict (id) do nothing;

-- 2) Integración por tenant (independiente por servicio)
create table if not exists public.tenant_integration (
  tenant_id uuid primary key references public.tenant(id) on delete cascade,
  drive_folder_id text not null,
  sheets_spreadsheet_id text not null,
  sheets_programadas_sheet_name text not null default 'Programadas',
  sheets_sin_cita_sheet_name text not null default 'Sin cita',
  mail_mode text not null default 'oauth' check (mail_mode in ('oauth', 'smtp')),
  smtp_from text null,
  branding_name text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Backfill inicial desde workspace (si ya existe la info ahí).
insert into public.tenant_integration (
  tenant_id,
  drive_folder_id,
  sheets_spreadsheet_id
)
select
  w.id,
  w.drive_folder_id,
  w.sheets_spreadsheet_id
from public.workspace w
on conflict (tenant_id) do nothing;

-- 3) Roles por tenant
create table if not exists public.user_workspace_role (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace(id) on delete cascade,
  user_email text not null,
  role text not null check (role in ('admin', 'officer')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, user_email, role)
);

create index if not exists user_workspace_role_workspace_idx
  on public.user_workspace_role (workspace_id);

create index if not exists user_workspace_role_email_idx
  on public.user_workspace_role (lower(user_email));

-- Backfill recomendado:
-- owner -> admin + officer
-- member -> officer
insert into public.user_workspace_role (workspace_id, user_email, role, is_active)
select uw.workspace_id, lower(uw.user_email), 'officer', true
from public.user_workspace uw
on conflict (workspace_id, user_email, role)
do update set is_active = true, updated_at = now();

insert into public.user_workspace_role (workspace_id, user_email, role, is_active)
select uw.workspace_id, lower(uw.user_email), 'admin', true
from public.user_workspace uw
where uw.role = 'owner'
on conflict (workspace_id, user_email, role)
do update set is_active = true, updated_at = now();

-- 4) Auditoría por tenant
create table if not exists public.workspace_audit_log (
  id bigserial primary key,
  workspace_id uuid not null references public.workspace(id) on delete cascade,
  actor_email text not null,
  event_type text not null,
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists workspace_audit_workspace_idx
  on public.workspace_audit_log (workspace_id, created_at desc);

-- 5) Trigger updated_at reusable
create or replace function public.touch_updated_at_generic()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_tenant_updated_at on public.tenant;
create trigger trg_tenant_updated_at
before update on public.tenant
for each row execute function public.touch_updated_at_generic();

drop trigger if exists trg_tenant_integration_updated_at on public.tenant_integration;
create trigger trg_tenant_integration_updated_at
before update on public.tenant_integration
for each row execute function public.touch_updated_at_generic();

drop trigger if exists trg_user_workspace_role_updated_at on public.user_workspace_role;
create trigger trg_user_workspace_role_updated_at
before update on public.user_workspace_role
for each row execute function public.touch_updated_at_generic();
