-- MULTI-TENANT MINIMO OBLIGATORIO
-- Este script contiene SOLO lo necesario para que el sistema funcione a largo plazo
-- con roles por servicio (tenant = workspace), sin tablas opcionales.

create extension if not exists pgcrypto;

-- 1) Roles por tenant/workspace (obligatorio)
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

-- 2) Trigger updated_at (obligatorio para mantenimiento correcto)
create or replace function public.touch_updated_at_user_workspace_role()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_user_workspace_role_updated_at on public.user_workspace_role;
create trigger trg_user_workspace_role_updated_at
before update on public.user_workspace_role
for each row execute function public.touch_updated_at_user_workspace_role();

-- 3) Backfill obligatorio desde modelo actual
-- member -> officer
insert into public.user_workspace_role (workspace_id, user_email, role, is_active)
select uw.workspace_id, lower(uw.user_email), 'officer', true
from public.user_workspace uw
on conflict (workspace_id, user_email, role)
do update set is_active = true, updated_at = now();

-- owner -> admin
insert into public.user_workspace_role (workspace_id, user_email, role, is_active)
select uw.workspace_id, lower(uw.user_email), 'admin', true
from public.user_workspace uw
where uw.role = 'owner'
on conflict (workspace_id, user_email, role)
do update set is_active = true, updated_at = now();
