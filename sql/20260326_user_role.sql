-- Roles de acceso por usuario (Supabase/Postgres).
-- Reemplaza OFFICER_EMAILS / ADMIN_EMAILS por una gestión en BD.

create table if not exists public.user_role (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  role text not null check (role in ('officer', 'admin')),
  is_active boolean not null default true,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists user_role_unique_active_role
  on public.user_role (lower(user_email), role);

create index if not exists user_role_email_idx
  on public.user_role (lower(user_email));

create or replace function public.set_updated_at_user_role()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_user_role_updated_at on public.user_role;
create trigger trg_user_role_updated_at
before update on public.user_role
for each row execute function public.set_updated_at_user_role();

-- Ejemplos:
-- insert into public.user_role (user_email, role) values ('oficial@empresa.com', 'officer')
-- on conflict (lower(user_email), role) do update set is_active = true, updated_at = now();
--
-- insert into public.user_role (user_email, role) values ('admin@empresa.com', 'admin')
-- on conflict (lower(user_email), role) do update set is_active = true, updated_at = now();
