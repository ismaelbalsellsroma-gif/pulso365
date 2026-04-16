/**
 * Tipos manuales del esquema de F1.
 * En una siguiente fase los generaríamos con `supabase gen types typescript`.
 */

export type UserRole = "admin" | "manager" | "employee";

export type FichajeStatus =
  | "open"
  | "on_break"
  | "closed"
  | "edited"
  | "invalid";

export type FichajeSource =
  | "web"
  | "mobile"
  | "kiosk"
  | "manual"
  | "auto_close";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  country: string;
  timezone: string;
  plan: "free" | "starter" | "pro" | "enterprise";
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  organization_id: string | null;
  email: string | null;
  full_name: string | null;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Location {
  id: string;
  organization_id: string;
  name: string;
  address: string | null;
  timezone: string;
  latitude: number | null;
  longitude: number | null;
  geofence_radius_m: number;
  kiosk_enabled: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: string;
  organization_id: string;
  profile_id: string | null;
  primary_location_id: string | null;
  employee_code: string | null;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  position: string | null;
  hourly_cost: number | null;
  contract_hours_week: number | null;
  pin: string;
  photo_url: string | null;
  color: string | null;
  active: boolean;
  hired_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LaborRules {
  id: string;
  organization_id: string;
  max_hours_day: number;
  max_hours_week: number;
  min_rest_between_shifts_h: number;
  min_rest_week_h: number;
  require_geofence: boolean;
  require_photo: boolean;
  kiosk_enabled: boolean;
  allow_mobile_clock: boolean;
  early_tolerance_minutes: number;
  late_tolerance_minutes: number;
  auto_close_after_hours: number;
}

export interface Fichaje {
  id: string;
  organization_id: string;
  employee_id: string;
  location_id: string | null;
  work_date: string;
  clock_in_at: string;
  clock_out_at: string | null;
  worked_minutes: number | null;
  break_minutes: number;
  status: FichajeStatus;
  source: FichajeSource;
  clock_in_lat: number | null;
  clock_in_lng: number | null;
  clock_in_accuracy_m: number | null;
  clock_out_lat: number | null;
  clock_out_lng: number | null;
  clock_out_accuracy_m: number | null;
  within_geofence: boolean | null;
  distance_from_location_m: number | null;
  clock_in_photo_url: string | null;
  clock_out_photo_url: string | null;
  user_agent: string | null;
  ip_address: string | null;
  device_fingerprint: string | null;
  notes: string | null;
  edited_by: string | null;
  edited_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FichajeBreak {
  id: string;
  fichaje_id: string;
  break_start_at: string;
  break_end_at: string | null;
  duration_minutes: number | null;
  break_type: "pause" | "meal" | "smoke" | "other";
  created_at: string;
}

// ===== F3+F4: Turnos y cuadrantes =====

export interface ShiftTemplate {
  id: string;
  organization_id: string;
  name: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  color: string;
  roles: string[];
  active: boolean;
  created_at: string;
  updated_at: string;
}

export type ShiftPlanStatus = "draft" | "published" | "archived";

export interface ShiftPlan {
  id: string;
  organization_id: string;
  location_id: string | null;
  week_start: string;
  status: ShiftPlanStatus;
  generated_by: "manual" | "ai" | "copy";
  ai_explanation: string | null;
  ai_suggestions: AiSuggestion[] | null;
  total_hours: number;
  total_cost: number;
  coverage_score: number | null;
  notes: string | null;
  published_at: string | null;
  published_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShiftPlanItem {
  id: string;
  plan_id: string;
  employee_id: string;
  work_date: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  role: string | null;
  color: string;
  notes: string | null;
  is_open_shift: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface OpenShift {
  id: string;
  organization_id: string;
  location_id: string | null;
  work_date: string;
  start_time: string;
  end_time: string;
  role: string | null;
  slots: number;
  claimed_by: string[];
  status: "open" | "filled" | "cancelled";
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShiftSwapRequest {
  id: string;
  organization_id: string;
  requester_id: string;
  target_id: string | null;
  requester_item_id: string;
  target_item_id: string | null;
  status: "pending" | "accepted" | "rejected" | "cancelled";
  reason: string | null;
  decided_by: string | null;
  decided_at: string | null;
  created_at: string;
}

export interface EmployeeSkill {
  id: string;
  employee_id: string;
  skill: string;
  level: number;
}

export interface EmployeeAvailability {
  id: string;
  employee_id: string;
  day_of_week: number;
  available: boolean;
  preferred_start: string | null;
  preferred_end: string | null;
  notes: string | null;
}

export interface DemandForecast {
  id: string;
  organization_id: string;
  location_id: string | null;
  forecast_date: string;
  time_slot: string;
  expected_covers: number;
  expected_revenue: number | null;
  source: "manual" | "historical" | "ai" | "reservation";
  confidence: number | null;
}

export interface StaffingRule {
  id: string;
  organization_id: string;
  role: string;
  covers_per_staff: number;
  min_staff: number;
  required_always: boolean;
}

export interface AiSuggestion {
  action: string;
  description: string;
  impact: "high" | "medium" | "low";
  auto_apply?: boolean;
}

/** Resultado del solver IA */
export interface SolverResult {
  items: Omit<ShiftPlanItem, "id" | "plan_id" | "created_at" | "updated_at">[];
  totalHours: number;
  totalCost: number;
  coverageScore: number;
  warnings: SolverWarning[];
  explanation: string;
  suggestions: AiSuggestion[];
  openShifts: { date: string; start: string; end: string; role: string }[];
}

export interface SolverWarning {
  type: "uncovered_slot" | "overtime" | "short_rest" | "over_weekly_hours" | "no_skill_match";
  message: string;
  severity: "error" | "warning" | "info";
  employee_id?: string;
  date?: string;
}

// ===== F5: Ausencias, notificaciones, convenios =====

export interface AbsenceType {
  id: string;
  organization_id: string;
  name: string;
  code: string;
  color: string;
  paid: boolean;
  generates_vacation: boolean;
  requires_document: boolean;
  max_days_year: number | null;
  active: boolean;
  sort_order: number;
}

export type AbsenceStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface AbsenceRequest {
  id: string;
  organization_id: string;
  employee_id: string;
  absence_type_id: string;
  start_date: string;
  end_date: string;
  days_count: number;
  half_day: boolean;
  status: AbsenceStatus;
  reason: string | null;
  document_url: string | null;
  decided_by: string | null;
  decided_at: string | null;
  decision_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AbsenceBalance {
  id: string;
  employee_id: string;
  absence_type_id: string;
  year: number;
  entitled_days: number;
  used_days: number;
  pending_days: number;
  carried_over: number;
}

export type NotificationType =
  | "schedule_published" | "shift_changed" | "shift_swap_request" | "shift_swap_decided"
  | "absence_requested" | "absence_decided" | "open_shift_available"
  | "clock_reminder" | "overtime_alert" | "system";

export interface Notification {
  id: string;
  organization_id: string;
  recipient_employee_id: string | null;
  recipient_profile_id: string | null;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

export interface LaborLawES {
  id: string;
  organization_id: string;
  convenio: "hosteleria" | "comercio" | "construccion" | "oficinas" | "custom";
  max_hours_year: number;
  max_hours_day: number;
  max_hours_week: number;
  max_overtime_hours_year: number;
  min_rest_daily_h: number;
  min_rest_weekly_h: number;
  min_break_after_hours: number;
  min_break_minutes: number;
  sunday_surcharge_pct: number;
  holiday_surcharge_pct: number;
  national_holidays: string[];
  regional_holidays: string[];
  night_start: string;
  night_end: string;
  night_surcharge_pct: number;
  overtime_first_hours: number;
  overtime_first_pct: number;
  overtime_after_pct: number;
  vacation_days_year: number;
  vacation_accrual_start: string;
  trial_period_days: number;
  active: boolean;
}

