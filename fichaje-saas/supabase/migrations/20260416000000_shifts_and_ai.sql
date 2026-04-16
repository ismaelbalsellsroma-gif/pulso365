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
