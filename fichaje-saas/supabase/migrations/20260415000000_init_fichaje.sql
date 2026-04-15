-- =============================================================================
-- Fichaje SaaS — F1: Modelo de datos inicial
-- Multi-tenant (organizations) + multi-local (locations) + RLS completo.
-- =============================================================================

-- Extensiones necesarias
create extension if not exists "pgcrypto";

-- =============================================================================
-- ORGANIZATIONS (tenants)
-- =============================================================================
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  country text not null default 'ES',
  timezone text not null default 'Europe/Madrid',
  plan text not null default 'free' check (plan in ('free','starter','pro','enterprise')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =============================================================================
-- PROFILES (1:1 con auth.users)
-- =============================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  email text,
  full_name text,
  role text not null default 'employee' check (role in ('admin','manager','employee')),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists profiles_org_idx on public.profiles(organization_id);

-- =============================================================================
-- LOCATIONS (centros de trabajo — local, sede, bar, restaurante, hotel)
-- =============================================================================
create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  address text,
  timezone text not null default 'Europe/Madrid',
  latitude numeric(10,7),
  longitude numeric(10,7),
  geofence_radius_m integer not null default 100,
  kiosk_enabled boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists locations_org_idx on public.locations(organization_id);

-- =============================================================================
-- EMPLOYEES (personal — no necesariamente con cuenta Supabase)
-- =============================================================================
create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  primary_location_id uuid references public.locations(id) on delete set null,
  employee_code text,
  first_name text not null,
  last_name text,
  email text,
  phone text,
  position text,
  hourly_cost numeric(10,2),
  contract_hours_week numeric(5,2),
  pin text not null check (char_length(pin) between 4 and 6),
  photo_url text,
  color text default '#0ea5e9',
  active boolean not null default true,
  hired_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, employee_code),
  unique (organization_id, pin)
);
create index if not exists employees_org_idx on public.employees(organization_id);
create index if not exists employees_location_idx on public.employees(primary_location_id);

-- =============================================================================
-- LABOR RULES (reglas laborales globales por organización)
-- =============================================================================
create table if not exists public.labor_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade unique,
  max_hours_day numeric(4,2) not null default 9,
  max_hours_week numeric(5,2) not null default 40,
  min_rest_between_shifts_h numeric(4,2) not null default 12,
  min_rest_week_h numeric(4,2) not null default 36,
  require_geofence boolean not null default false,
  require_photo boolean not null default false,
  kiosk_enabled boolean not null default true,
  allow_mobile_clock boolean not null default true,
  early_tolerance_minutes int not null default 10,
  late_tolerance_minutes int not null default 10,
  auto_close_after_hours int not null default 14,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =============================================================================
-- FICHAJES (sesiones de trabajo — un registro por jornada abierta)
-- =============================================================================
create table if not exists public.fichajes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  location_id uuid references public.locations(id) on delete set null,
  work_date date not null,
  clock_in_at timestamptz not null,
  clock_out_at timestamptz,
  worked_minutes integer,
  break_minutes integer not null default 0,
  status text not null default 'open' check (status in ('open','on_break','closed','edited','invalid')),
  source text not null default 'web' check (source in ('web','mobile','kiosk','manual','auto_close')),
  -- Geolocalización
  clock_in_lat numeric(10,7),
  clock_in_lng numeric(10,7),
  clock_in_accuracy_m numeric(8,2),
  clock_out_lat numeric(10,7),
  clock_out_lng numeric(10,7),
  clock_out_accuracy_m numeric(8,2),
  within_geofence boolean,
  distance_from_location_m numeric(10,2),
  -- Fotos anti-fraude
  clock_in_photo_url text,
  clock_out_photo_url text,
  -- Telemetría
  user_agent text,
  ip_address text,
  device_fingerprint text,
  -- Edición
  notes text,
  edited_by uuid references public.profiles(id),
  edited_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists fichajes_org_date_idx on public.fichajes(organization_id, work_date);
create index if not exists fichajes_employee_date_idx on public.fichajes(employee_id, work_date);
create index if not exists fichajes_status_idx on public.fichajes(status) where status in ('open','on_break');

-- =============================================================================
-- FICHAJE BREAKS (pausas dentro de una jornada)
-- =============================================================================
create table if not exists public.fichaje_breaks (
  id uuid primary key default gen_random_uuid(),
  fichaje_id uuid not null references public.fichajes(id) on delete cascade,
  break_start_at timestamptz not null,
  break_end_at timestamptz,
  duration_minutes integer,
  break_type text not null default 'pause' check (break_type in ('pause','meal','smoke','other')),
  created_at timestamptz not null default now()
);
create index if not exists breaks_fichaje_idx on public.fichaje_breaks(fichaje_id);

-- =============================================================================
-- FICHAJE AUDIT (historial de cambios para trazabilidad)
-- =============================================================================
create table if not exists public.fichaje_audit (
  id uuid primary key default gen_random_uuid(),
  fichaje_id uuid not null references public.fichajes(id) on delete cascade,
  changed_by uuid references public.profiles(id),
  action text not null check (action in ('create','update','delete','auto_close')),
  field text,
  old_value text,
  new_value text,
  reason text,
  created_at timestamptz not null default now()
);
create index if not exists audit_fichaje_idx on public.fichaje_audit(fichaje_id);

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================
create or replace function public.current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id from public.profiles where id = auth.uid() limit 1;
$$;

create or replace function public.current_role_name()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid() limit 1;
$$;

create or replace function public.is_org_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid()), '') in ('admin','manager');
$$;

-- Trigger: crear profile en signup, asociar a la organización del metadata si viene
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  org_id uuid;
begin
  begin
    org_id := (new.raw_user_meta_data ->> 'organization_id')::uuid;
  exception when others then
    org_id := null;
  end;

  insert into public.profiles (id, organization_id, email, full_name, role)
  values (
    new.id,
    org_id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'role', 'employee')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Trigger: updated_at automático
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$ begin
  create trigger touch_organizations before update on public.organizations for each row execute procedure public.touch_updated_at();
exception when duplicate_object then null; end $$;
do $$ begin
  create trigger touch_profiles before update on public.profiles for each row execute procedure public.touch_updated_at();
exception when duplicate_object then null; end $$;
do $$ begin
  create trigger touch_locations before update on public.locations for each row execute procedure public.touch_updated_at();
exception when duplicate_object then null; end $$;
do $$ begin
  create trigger touch_employees before update on public.employees for each row execute procedure public.touch_updated_at();
exception when duplicate_object then null; end $$;
do $$ begin
  create trigger touch_fichajes before update on public.fichajes for each row execute procedure public.touch_updated_at();
exception when duplicate_object then null; end $$;
do $$ begin
  create trigger touch_labor_rules before update on public.labor_rules for each row execute procedure public.touch_updated_at();
exception when duplicate_object then null; end $$;

-- =============================================================================
-- RLS
-- =============================================================================
alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.locations enable row level security;
alter table public.employees enable row level security;
alter table public.labor_rules enable row level security;
alter table public.fichajes enable row level security;
alter table public.fichaje_breaks enable row level security;
alter table public.fichaje_audit enable row level security;

-- Organizations: un usuario solo ve su organización
drop policy if exists orgs_select on public.organizations;
create policy orgs_select on public.organizations
  for select using (id = public.current_org_id());

drop policy if exists orgs_update on public.organizations;
create policy orgs_update on public.organizations
  for update using (id = public.current_org_id() and public.current_role_name() = 'admin');

-- Profiles
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (organization_id = public.current_org_id() or id = auth.uid());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update using (id = auth.uid());

drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update on public.profiles
  for update using (organization_id = public.current_org_id() and public.current_role_name() = 'admin');

-- Locations
drop policy if exists locations_select on public.locations;
create policy locations_select on public.locations
  for select using (organization_id = public.current_org_id());

drop policy if exists locations_write on public.locations;
create policy locations_write on public.locations
  for all using (organization_id = public.current_org_id() and public.is_org_manager())
  with check (organization_id = public.current_org_id() and public.is_org_manager());

-- Employees
drop policy if exists employees_select on public.employees;
create policy employees_select on public.employees
  for select using (organization_id = public.current_org_id());

drop policy if exists employees_write on public.employees;
create policy employees_write on public.employees
  for all using (organization_id = public.current_org_id() and public.is_org_manager())
  with check (organization_id = public.current_org_id() and public.is_org_manager());

-- Labor rules
drop policy if exists labor_rules_select on public.labor_rules;
create policy labor_rules_select on public.labor_rules
  for select using (organization_id = public.current_org_id());

drop policy if exists labor_rules_write on public.labor_rules;
create policy labor_rules_write on public.labor_rules
  for all using (organization_id = public.current_org_id() and public.current_role_name() = 'admin')
  with check (organization_id = public.current_org_id() and public.current_role_name() = 'admin');

-- Fichajes: todos los miembros ven los de su org; solo managers editan los ajenos;
-- un empleado puede crear/actualizar su propio fichaje (si tiene profile).
drop policy if exists fichajes_select on public.fichajes;
create policy fichajes_select on public.fichajes
  for select using (organization_id = public.current_org_id());

drop policy if exists fichajes_insert on public.fichajes;
create policy fichajes_insert on public.fichajes
  for insert with check (organization_id = public.current_org_id());

drop policy if exists fichajes_update_manager on public.fichajes;
create policy fichajes_update_manager on public.fichajes
  for update using (organization_id = public.current_org_id() and public.is_org_manager());

drop policy if exists fichajes_update_self on public.fichajes;
create policy fichajes_update_self on public.fichajes
  for update using (
    organization_id = public.current_org_id()
    and employee_id in (select id from public.employees where profile_id = auth.uid())
  );

drop policy if exists fichajes_delete_manager on public.fichajes;
create policy fichajes_delete_manager on public.fichajes
  for delete using (organization_id = public.current_org_id() and public.is_org_manager());

-- Breaks: heredan permisos del fichaje padre
drop policy if exists breaks_all on public.fichaje_breaks;
create policy breaks_all on public.fichaje_breaks
  for all using (
    exists (
      select 1 from public.fichajes f
      where f.id = fichaje_id and f.organization_id = public.current_org_id()
    )
  )
  with check (
    exists (
      select 1 from public.fichajes f
      where f.id = fichaje_id and f.organization_id = public.current_org_id()
    )
  );

-- Audit: solo lectura para la org
drop policy if exists audit_select on public.fichaje_audit;
create policy audit_select on public.fichaje_audit
  for select using (
    exists (
      select 1 from public.fichajes f
      where f.id = fichaje_id and f.organization_id = public.current_org_id()
    )
  );

drop policy if exists audit_insert on public.fichaje_audit;
create policy audit_insert on public.fichaje_audit
  for insert with check (
    exists (
      select 1 from public.fichajes f
      where f.id = fichaje_id and f.organization_id = public.current_org_id()
    )
  );

-- =============================================================================
-- BOOTSTRAP: función RPC para crear la organización al registrarse.
-- Resuelve el chicken-and-egg de RLS (un usuario nuevo no tiene org todavía,
-- así que no puede insertar en `organizations` por RLS).
-- =============================================================================
create or replace function public.bootstrap_organization(
  org_name text,
  full_user_name text default null
)
returns public.organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slug text;
  v_org public.organizations;
  v_existing_org_id uuid;
begin
  if auth.uid() is null then
    raise exception 'No hay sesión';
  end if;

  -- Verificar que el usuario no tiene ya una organización
  select organization_id into v_existing_org_id
  from public.profiles where id = auth.uid();
  if v_existing_org_id is not null then
    raise exception 'Este usuario ya pertenece a una organización';
  end if;

  -- Generar slug único (suficientemente randomizado)
  v_slug := regexp_replace(lower(coalesce(org_name, 'org')), '[^a-z0-9]+', '-', 'g');
  v_slug := trim(both '-' from v_slug);
  if v_slug = '' then v_slug := 'org'; end if;
  v_slug := v_slug || '-' || substr(md5(random()::text || clock_timestamp()::text), 1, 6);

  -- Crear organización
  insert into public.organizations (name, slug)
  values (org_name, v_slug)
  returning * into v_org;

  -- Asignar profile (asegurándonos de que existe — el trigger lo debería haber creado)
  insert into public.profiles (id, organization_id, role, full_name, email)
  values (
    auth.uid(),
    v_org.id,
    'admin',
    full_user_name,
    (select email from auth.users where id = auth.uid())
  )
  on conflict (id) do update set
    organization_id = excluded.organization_id,
    role = 'admin',
    full_name = coalesce(excluded.full_name, public.profiles.full_name);

  -- Reglas laborales por defecto
  insert into public.labor_rules (organization_id)
  values (v_org.id)
  on conflict (organization_id) do nothing;

  return v_org;
end;
$$;

grant execute on function public.bootstrap_organization(text, text) to authenticated;
