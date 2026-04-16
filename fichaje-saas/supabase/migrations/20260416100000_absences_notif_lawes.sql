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
