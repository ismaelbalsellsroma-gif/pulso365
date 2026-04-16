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
create table if not exists public.clock_sessions (
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
create index if not exists clock_sessions_org_date_idx on public.clock_sessions(organization_id, work_date);
create index if not exists clock_sessions_employee_date_idx on public.clock_sessions(employee_id, work_date);
create index if not exists clock_sessions_status_idx on public.clock_sessions(status) where status in ('open','on_break');

-- =============================================================================
-- FICHAJE BREAKS (pausas dentro de una jornada)
-- =============================================================================
create table if not exists public.fichaje_breaks (
  id uuid primary key default gen_random_uuid(),
  fichaje_id uuid not null references public.clock_sessions(id) on delete cascade,
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
  fichaje_id uuid not null references public.clock_sessions(id) on delete cascade,
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
  create trigger touch_clock_sessions before update on public.clock_sessions for each row execute procedure public.touch_updated_at();
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
alter table public.clock_sessions enable row level security;
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
drop policy if exists clock_sessions_select on public.clock_sessions;
create policy clock_sessions_select on public.clock_sessions
  for select using (organization_id = public.current_org_id());

drop policy if exists clock_sessions_insert on public.clock_sessions;
create policy clock_sessions_insert on public.clock_sessions
  for insert with check (organization_id = public.current_org_id());

drop policy if exists clock_sessions_update_manager on public.clock_sessions;
create policy clock_sessions_update_manager on public.clock_sessions
  for update using (organization_id = public.current_org_id() and public.is_org_manager());

drop policy if exists clock_sessions_update_self on public.clock_sessions;
create policy clock_sessions_update_self on public.clock_sessions
  for update using (
    organization_id = public.current_org_id()
    and employee_id in (select id from public.employees where profile_id = auth.uid())
  );

drop policy if exists clock_sessions_delete_manager on public.clock_sessions;
create policy clock_sessions_delete_manager on public.clock_sessions
  for delete using (organization_id = public.current_org_id() and public.is_org_manager());

-- Breaks: heredan permisos del fichaje padre
drop policy if exists breaks_all on public.fichaje_breaks;
create policy breaks_all on public.fichaje_breaks
  for all using (
    exists (
      select 1 from public.clock_sessions f
      where f.id = fichaje_id and f.organization_id = public.current_org_id()
    )
  )
  with check (
    exists (
      select 1 from public.clock_sessions f
      where f.id = fichaje_id and f.organization_id = public.current_org_id()
    )
  );

-- Audit: solo lectura para la org
drop policy if exists audit_select on public.fichaje_audit;
create policy audit_select on public.fichaje_audit
  for select using (
    exists (
      select 1 from public.clock_sessions f
      where f.id = fichaje_id and f.organization_id = public.current_org_id()
    )
  );

drop policy if exists audit_insert on public.fichaje_audit;
create policy audit_insert on public.fichaje_audit
  for insert with check (
    exists (
      select 1 from public.clock_sessions f
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
-- =============================================================================
-- Fichaje SaaS — F3+F4: Turnos, cuadrantes y soporte IA
-- =============================================================================

-- =============================================================================
-- PLANTILLAS DE TURNO (templates reutilizables)
-- =============================================================================
create table if not exists public.shift_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  start_time text not null,         -- "09:00"
  end_time text not null,           -- "17:00"
  break_minutes integer not null default 0,
  color text not null default '#0ea5e9',
  roles text[] default '{}',        -- ["camarero","cocinero"]
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists shift_templates_org_idx on public.shift_templates(organization_id);
alter table public.shift_templates enable row level security;
drop policy if exists shift_templates_select on public.shift_templates;
create policy shift_templates_select on public.shift_templates for select using (organization_id = public.current_org_id());
drop policy if exists shift_templates_write on public.shift_templates;
create policy shift_templates_write on public.shift_templates for all
  using (organization_id = public.current_org_id() and public.is_org_manager())
  with check (organization_id = public.current_org_id() and public.is_org_manager());

-- =============================================================================
-- SHIFT PLANS (borradores de cuadrante — uno por semana)
-- =============================================================================
create table if not exists public.shift_plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  location_id uuid references public.locations(id) on delete set null,
  week_start date not null,          -- siempre lunes
  status text not null default 'draft' check (status in ('draft','published','archived')),
  generated_by text default 'manual' check (generated_by in ('manual','ai','copy')),
  ai_explanation text,               -- explicación IA en lenguaje llano
  ai_suggestions jsonb,              -- sugerencias accionables [{action, description, impact}]
  total_hours numeric(8,2) default 0,
  total_cost numeric(10,2) default 0,
  coverage_score numeric(5,2),       -- 0-100%
  notes text,
  published_at timestamptz,
  published_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, location_id, week_start)
);
create index if not exists shift_plans_org_idx on public.shift_plans(organization_id, week_start);
alter table public.shift_plans enable row level security;
drop policy if exists shift_plans_select on public.shift_plans;
create policy shift_plans_select on public.shift_plans for select using (organization_id = public.current_org_id());
drop policy if exists shift_plans_write on public.shift_plans;
create policy shift_plans_write on public.shift_plans for all
  using (organization_id = public.current_org_id() and public.is_org_manager())
  with check (organization_id = public.current_org_id() and public.is_org_manager());

-- =============================================================================
-- SHIFT PLAN ITEMS (asignaciones individuales empleado+día+franja)
-- =============================================================================
create table if not exists public.shift_plan_items (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.shift_plans(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  work_date date not null,
  start_time text not null,
  end_time text not null,
  break_minutes integer not null default 0,
  role text,
  color text default '#0ea5e9',
  notes text,
  is_open_shift boolean not null default false,
  sort_order integer default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists shift_items_plan_idx on public.shift_plan_items(plan_id);
create index if not exists shift_items_emp_date_idx on public.shift_plan_items(employee_id, work_date);
alter table public.shift_plan_items enable row level security;
drop policy if exists shift_items_select on public.shift_plan_items;
create policy shift_items_select on public.shift_plan_items for select using (
  exists (select 1 from public.shift_plans p where p.id = plan_id and p.organization_id = public.current_org_id())
);
drop policy if exists shift_items_write on public.shift_plan_items;
create policy shift_items_write on public.shift_plan_items for all
  using (exists (select 1 from public.shift_plans p where p.id = plan_id and p.organization_id = public.current_org_id() and public.is_org_manager()))
  with check (exists (select 1 from public.shift_plans p where p.id = plan_id and p.organization_id = public.current_org_id() and public.is_org_manager()));

-- =============================================================================
-- OPEN SHIFTS (turnos sin cubrir ofrecidos a todo el equipo)
-- =============================================================================
create table if not exists public.open_shifts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  location_id uuid references public.locations(id) on delete set null,
  work_date date not null,
  start_time text not null,
  end_time text not null,
  role text,
  slots integer not null default 1,
  claimed_by uuid[] default '{}',
  status text not null default 'open' check (status in ('open','filled','cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists open_shifts_org_idx on public.open_shifts(organization_id, work_date);
alter table public.open_shifts enable row level security;
drop policy if exists open_shifts_select on public.open_shifts;
create policy open_shifts_select on public.open_shifts for select using (organization_id = public.current_org_id());
drop policy if exists open_shifts_write on public.open_shifts;
create policy open_shifts_write on public.open_shifts for all
  using (organization_id = public.current_org_id())
  with check (organization_id = public.current_org_id());

-- =============================================================================
-- SHIFT SWAP REQUESTS (intercambios de turno entre empleados)
-- =============================================================================
create table if not exists public.shift_swap_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  requester_id uuid not null references public.employees(id) on delete cascade,
  target_id uuid references public.employees(id) on delete set null,
  requester_item_id uuid not null references public.shift_plan_items(id) on delete cascade,
  target_item_id uuid references public.shift_plan_items(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','accepted','rejected','cancelled')),
  reason text,
  decided_by uuid references public.profiles(id),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.shift_swap_requests enable row level security;
drop policy if exists swap_select on public.shift_swap_requests;
create policy swap_select on public.shift_swap_requests for select using (organization_id = public.current_org_id());
drop policy if exists swap_write on public.shift_swap_requests;
create policy swap_write on public.shift_swap_requests for all
  using (organization_id = public.current_org_id())
  with check (organization_id = public.current_org_id());

-- =============================================================================
-- EMPLOYEE SKILLS (habilidades/roles por empleado — para el solver IA)
-- =============================================================================
create table if not exists public.employee_skills (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  skill text not null,
  level integer not null default 1 check (level between 1 and 5),
  created_at timestamptz not null default now(),
  unique (employee_id, skill)
);
alter table public.employee_skills enable row level security;
drop policy if exists skills_select on public.employee_skills;
create policy skills_select on public.employee_skills for select using (
  exists (select 1 from public.employees e where e.id = employee_id and e.organization_id = public.current_org_id())
);
drop policy if exists skills_write on public.employee_skills;
create policy skills_write on public.employee_skills for all
  using (exists (select 1 from public.employees e where e.id = employee_id and e.organization_id = public.current_org_id() and public.is_org_manager()))
  with check (exists (select 1 from public.employees e where e.id = employee_id and e.organization_id = public.current_org_id() and public.is_org_manager()));

-- =============================================================================
-- EMPLOYEE AVAILABILITY (disponibilidad semanal preferida)
-- =============================================================================
create table if not exists public.employee_availability (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),  -- 0=lunes
  available boolean not null default true,
  preferred_start text,   -- "09:00"
  preferred_end text,     -- "17:00"
  notes text,
  unique (employee_id, day_of_week)
);
alter table public.employee_availability enable row level security;
drop policy if exists avail_select on public.employee_availability;
create policy avail_select on public.employee_availability for select using (
  exists (select 1 from public.employees e where e.id = employee_id and e.organization_id = public.current_org_id())
);
drop policy if exists avail_write on public.employee_availability;
create policy avail_write on public.employee_availability for all
  using (exists (select 1 from public.employees e where e.id = employee_id and e.organization_id = public.current_org_id()))
  with check (exists (select 1 from public.employees e where e.id = employee_id and e.organization_id = public.current_org_id()));

-- =============================================================================
-- DEMAND FORECAST (previsión de demanda por franja — input para IA)
-- =============================================================================
create table if not exists public.demand_forecast (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  location_id uuid references public.locations(id) on delete set null,
  forecast_date date not null,
  time_slot text not null,           -- "13:00"
  expected_covers integer default 0, -- comensales estimados
  expected_revenue numeric(10,2),
  source text default 'manual' check (source in ('manual','historical','ai','reservation')),
  confidence numeric(5,2),           -- 0-100%
  created_at timestamptz not null default now(),
  unique (organization_id, location_id, forecast_date, time_slot)
);
create index if not exists demand_org_date_idx on public.demand_forecast(organization_id, forecast_date);
alter table public.demand_forecast enable row level security;
drop policy if exists demand_select on public.demand_forecast;
create policy demand_select on public.demand_forecast for select using (organization_id = public.current_org_id());
drop policy if exists demand_write on public.demand_forecast;
create policy demand_write on public.demand_forecast for all
  using (organization_id = public.current_org_id() and public.is_org_manager())
  with check (organization_id = public.current_org_id() and public.is_org_manager());

-- =============================================================================
-- STAFFING RULES (ratios de personal por rol — input para el solver)
-- =============================================================================
create table if not exists public.staffing_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  role text not null,                -- "camarero", "cocinero", "encargado"
  covers_per_staff integer default 30,
  min_staff integer default 1,
  required_always boolean default false,  -- e.g. siempre ≥1 encargado
  created_at timestamptz not null default now(),
  unique (organization_id, role)
);
alter table public.staffing_rules enable row level security;
drop policy if exists staffing_select on public.staffing_rules;
create policy staffing_select on public.staffing_rules for select using (organization_id = public.current_org_id());
drop policy if exists staffing_write on public.staffing_rules;
create policy staffing_write on public.staffing_rules for all
  using (organization_id = public.current_org_id() and public.current_role_name() = 'admin')
  with check (organization_id = public.current_org_id() and public.current_role_name() = 'admin');

-- Updated_at triggers
do $$ begin create trigger touch_shift_templates before update on public.shift_templates for each row execute procedure public.touch_updated_at(); exception when duplicate_object then null; end $$;
do $$ begin create trigger touch_shift_plans before update on public.shift_plans for each row execute procedure public.touch_updated_at(); exception when duplicate_object then null; end $$;
do $$ begin create trigger touch_shift_plan_items before update on public.shift_plan_items for each row execute procedure public.touch_updated_at(); exception when duplicate_object then null; end $$;
do $$ begin create trigger touch_open_shifts before update on public.open_shifts for each row execute procedure public.touch_updated_at(); exception when duplicate_object then null; end $$;
-- =============================================================================
-- F5: Ausencias, notificaciones, convenios colectivos ES
-- =============================================================================

-- =============================================================================
-- ABSENCE TYPES (tipos configurables de ausencia)
-- =============================================================================
create table if not exists public.absence_types (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  code text not null,
  color text not null default '#64748B',
  paid boolean not null default false,
  generates_vacation boolean not null default true,
  requires_document boolean not null default false,
  max_days_year integer,
  active boolean not null default true,
  sort_order integer default 0,
  created_at timestamptz not null default now(),
  unique (organization_id, code)
);
alter table public.absence_types enable row level security;
create policy absence_types_select on public.absence_types for select using (organization_id = public.current_org_id());
create policy absence_types_write on public.absence_types for all
  using (organization_id = public.current_org_id() and public.is_org_manager())
  with check (organization_id = public.current_org_id() and public.is_org_manager());

-- =============================================================================
-- ABSENCE REQUESTS (solicitudes de ausencia)
-- =============================================================================
create table if not exists public.absence_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  absence_type_id uuid not null references public.absence_types(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  days_count numeric(5,1) not null default 1,
  half_day boolean not null default false,
  status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled')),
  reason text,
  document_url text,
  decided_by uuid references public.profiles(id),
  decided_at timestamptz,
  decision_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists absence_req_emp_idx on public.absence_requests(employee_id, start_date);
create index if not exists absence_req_org_idx on public.absence_requests(organization_id, status);
alter table public.absence_requests enable row level security;
create policy absence_req_select on public.absence_requests for select using (organization_id = public.current_org_id());
create policy absence_req_insert on public.absence_requests for insert with check (organization_id = public.current_org_id());
create policy absence_req_update on public.absence_requests for update using (organization_id = public.current_org_id());

-- =============================================================================
-- ABSENCE BALANCES (contadores de vacaciones por empleado y año)
-- =============================================================================
create table if not exists public.absence_balances (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  absence_type_id uuid not null references public.absence_types(id) on delete cascade,
  year integer not null,
  entitled_days numeric(5,1) not null default 0,
  used_days numeric(5,1) not null default 0,
  pending_days numeric(5,1) not null default 0,
  carried_over numeric(5,1) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, absence_type_id, year)
);
alter table public.absence_balances enable row level security;
create policy balances_select on public.absence_balances for select using (
  exists (select 1 from public.employees e where e.id = employee_id and e.organization_id = public.current_org_id())
);
create policy balances_write on public.absence_balances for all
  using (exists (select 1 from public.employees e where e.id = employee_id and e.organization_id = public.current_org_id() and public.is_org_manager()))
  with check (exists (select 1 from public.employees e where e.id = employee_id and e.organization_id = public.current_org_id() and public.is_org_manager()));

-- =============================================================================
-- NOTIFICATIONS (sistema de notificaciones in-app)
-- =============================================================================
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  recipient_employee_id uuid references public.employees(id) on delete cascade,
  recipient_profile_id uuid references public.profiles(id) on delete cascade,
  type text not null check (type in (
    'schedule_published','shift_changed','shift_swap_request','shift_swap_decided',
    'absence_requested','absence_decided','open_shift_available',
    'clock_reminder','overtime_alert','system'
  )),
  title text not null,
  body text,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notif_recipient_idx on public.notifications(recipient_employee_id, read);
create index if not exists notif_profile_idx on public.notifications(recipient_profile_id, read);
alter table public.notifications enable row level security;
create policy notif_select on public.notifications for select using (organization_id = public.current_org_id());
create policy notif_insert on public.notifications for insert with check (organization_id = public.current_org_id());
create policy notif_update on public.notifications for update using (organization_id = public.current_org_id());

-- =============================================================================
-- SPANISH LABOR LAW CONFIG (convenios colectivos ES)
-- =============================================================================
create table if not exists public.labor_law_es (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade unique,
  convenio text not null default 'hosteleria' check (convenio in ('hosteleria','comercio','construccion','oficinas','custom')),
  -- Jornada
  max_hours_year integer not null default 1826,
  max_hours_day numeric(4,1) not null default 9,
  max_hours_week numeric(5,1) not null default 40,
  max_overtime_hours_year integer not null default 80,
  -- Descansos
  min_rest_daily_h numeric(4,1) not null default 12,
  min_rest_weekly_h numeric(4,1) not null default 36,
  min_break_after_hours numeric(4,1) not null default 6,
  min_break_minutes integer not null default 15,
  -- Festivos y domingos
  sunday_surcharge_pct numeric(5,2) not null default 0,
  holiday_surcharge_pct numeric(5,2) not null default 0,
  national_holidays text[] not null default '{}',
  regional_holidays text[] not null default '{}',
  -- Nocturnidad (22:00-06:00)
  night_start text not null default '22:00',
  night_end text not null default '06:00',
  night_surcharge_pct numeric(5,2) not null default 25,
  -- Horas extras
  overtime_first_hours integer not null default 8,
  overtime_first_pct numeric(5,2) not null default 25,
  overtime_after_pct numeric(5,2) not null default 50,
  -- Vacaciones
  vacation_days_year integer not null default 30,
  vacation_accrual_start text not null default 'hire_date',
  -- Periodo de prueba
  trial_period_days integer not null default 60,
  -- Config
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.labor_law_es enable row level security;
create policy labor_law_es_select on public.labor_law_es for select using (organization_id = public.current_org_id());
create policy labor_law_es_write on public.labor_law_es for all
  using (organization_id = public.current_org_id() and public.current_role_name() = 'admin')
  with check (organization_id = public.current_org_id() and public.current_role_name() = 'admin');

-- Triggers updated_at
do $$ begin create trigger touch_absence_requests before update on public.absence_requests for each row execute procedure public.touch_updated_at(); exception when duplicate_object then null; end $$;
do $$ begin create trigger touch_absence_balances before update on public.absence_balances for each row execute procedure public.touch_updated_at(); exception when duplicate_object then null; end $$;
do $$ begin create trigger touch_labor_law_es before update on public.labor_law_es for each row execute procedure public.touch_updated_at(); exception when duplicate_object then null; end $$;
