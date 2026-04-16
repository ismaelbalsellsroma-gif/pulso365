import type {
  AbsenceBalance, AbsenceRequest, AbsenceType,
  DemandForecast, Employee, EmployeeAvailability, Fichaje, FichajeBreak,
  LaborRules, Location, Notification, Organization, Profile, ShiftPlan, ShiftPlanItem,
  ShiftTemplate, StaffingRule,
} from "@/types";
import { format, addDays, startOfWeek } from "date-fns";

// IDs estáticos para relaciones consistentes
const ORG_ID = "demo-org-001";
const LOC_1 = "demo-loc-001";
const LOC_2 = "demo-loc-002";
const ADMIN_PROFILE_ID = "demo-profile-admin";

export const DEMO_ORG: Organization = {
  id: ORG_ID,
  name: "Bar La Plaza",
  slug: "bar-la-plaza-demo",
  country: "ES",
  timezone: "Europe/Madrid",
  plan: "pro",
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-01T00:00:00Z",
};

export const DEMO_PROFILE: Profile = {
  id: ADMIN_PROFILE_ID,
  organization_id: ORG_ID,
  email: "admin@demo.fichaje.app",
  full_name: "María García",
  role: "admin",
  avatar_url: null,
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-01T00:00:00Z",
};

export const DEMO_LOCATIONS: Location[] = [
  {
    id: LOC_1,
    organization_id: ORG_ID,
    name: "Bar La Plaza — Centro",
    address: "Calle Mayor 12, 28001 Madrid",
    timezone: "Europe/Madrid",
    latitude: 40.4168,
    longitude: -3.7038,
    geofence_radius_m: 100,
    kiosk_enabled: true,
    active: true,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
  },
  {
    id: LOC_2,
    organization_id: ORG_ID,
    name: "La Plaza — Terraza",
    address: "Plaza de Santa Ana 5, 28012 Madrid",
    timezone: "Europe/Madrid",
    latitude: 40.4141,
    longitude: -3.7004,
    geofence_radius_m: 80,
    kiosk_enabled: true,
    active: true,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
  },
];

export const DEMO_EMPLOYEES: Employee[] = [
  {
    id: "emp-001", organization_id: ORG_ID, profile_id: null,
    primary_location_id: LOC_1, employee_code: "E001",
    first_name: "Carlos", last_name: "López", email: "carlos@demo.com",
    phone: "600111222", position: "Camarero", hourly_cost: 12.5,
    contract_hours_week: 40, pin: "1234", photo_url: null, color: "#3B82F6",
    active: true, hired_at: "2024-03-01",
    created_at: "2025-01-01T00:00:00Z", updated_at: "2025-01-01T00:00:00Z",
  },
  {
    id: "emp-002", organization_id: ORG_ID, profile_id: null,
    primary_location_id: LOC_1, employee_code: "E002",
    first_name: "Laura", last_name: "Martínez", email: "laura@demo.com",
    phone: "600222333", position: "Cocinera", hourly_cost: 14,
    contract_hours_week: 35, pin: "5678", photo_url: null, color: "#F97316",
    active: true, hired_at: "2024-06-15",
    created_at: "2025-01-01T00:00:00Z", updated_at: "2025-01-01T00:00:00Z",
  },
  {
    id: "emp-003", organization_id: ORG_ID, profile_id: null,
    primary_location_id: LOC_2, employee_code: "E003",
    first_name: "Pablo", last_name: "Fernández", email: "pablo@demo.com",
    phone: "600333444", position: "Camarero", hourly_cost: 11.5,
    contract_hours_week: 30, pin: "9012", photo_url: null, color: "#10B981",
    active: true, hired_at: "2024-09-01",
    created_at: "2025-01-01T00:00:00Z", updated_at: "2025-01-01T00:00:00Z",
  },
  {
    id: "emp-004", organization_id: ORG_ID, profile_id: null,
    primary_location_id: LOC_1, employee_code: "E004",
    first_name: "Ana", last_name: "Ruiz", email: "ana@demo.com",
    phone: "600444555", position: "Encargada", hourly_cost: 16,
    contract_hours_week: 40, pin: "3456", photo_url: null, color: "#8B5CF6",
    active: true, hired_at: "2023-11-20",
    created_at: "2025-01-01T00:00:00Z", updated_at: "2025-01-01T00:00:00Z",
  },
  {
    id: "emp-005", organization_id: ORG_ID, profile_id: null,
    primary_location_id: LOC_2, employee_code: "E005",
    first_name: "Javier", last_name: "Sánchez", email: "javi@demo.com",
    phone: "600555666", position: "Camarero", hourly_cost: 11.5,
    contract_hours_week: 20, pin: "7890", photo_url: null, color: "#EF4444",
    active: true, hired_at: "2025-01-10",
    created_at: "2025-01-01T00:00:00Z", updated_at: "2025-01-01T00:00:00Z",
  },
];

export const DEMO_RULES: LaborRules = {
  id: "rules-001",
  organization_id: ORG_ID,
  max_hours_day: 9,
  max_hours_week: 40,
  min_rest_between_shifts_h: 12,
  min_rest_week_h: 36,
  require_geofence: false,
  require_photo: false,
  kiosk_enabled: true,
  allow_mobile_clock: true,
  early_tolerance_minutes: 10,
  late_tolerance_minutes: 10,
  auto_close_after_hours: 14,
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function hoursAgo(h: number) {
  return new Date(Date.now() - h * 3600_000).toISOString();
}

function minsAgo(m: number) {
  return new Date(Date.now() - m * 60_000).toISOString();
}

export function getDemoFichajes(): Fichaje[] {
  return [
    // Carlos: trabajando desde hace 3h
    {
      id: "fic-001", organization_id: ORG_ID, employee_id: "emp-001",
      location_id: LOC_1, work_date: todayStr(),
      clock_in_at: hoursAgo(3), clock_out_at: null,
      worked_minutes: null, break_minutes: 0, status: "open", source: "kiosk",
      clock_in_lat: 40.4168, clock_in_lng: -3.7038, clock_in_accuracy_m: 8,
      clock_out_lat: null, clock_out_lng: null, clock_out_accuracy_m: null,
      within_geofence: true, distance_from_location_m: 12,
      clock_in_photo_url: null, clock_out_photo_url: null,
      user_agent: null, ip_address: null, device_fingerprint: null,
      notes: null, edited_by: null, edited_at: null,
      created_at: hoursAgo(3), updated_at: hoursAgo(3),
    },
    // Laura: trabajando desde hace 4.5h, en pausa
    {
      id: "fic-002", organization_id: ORG_ID, employee_id: "emp-002",
      location_id: LOC_1, work_date: todayStr(),
      clock_in_at: hoursAgo(4.5), clock_out_at: null,
      worked_minutes: null, break_minutes: 15, status: "on_break", source: "web",
      clock_in_lat: 40.4169, clock_in_lng: -3.7040, clock_in_accuracy_m: 5,
      clock_out_lat: null, clock_out_lng: null, clock_out_accuracy_m: null,
      within_geofence: true, distance_from_location_m: 8,
      clock_in_photo_url: null, clock_out_photo_url: null,
      user_agent: null, ip_address: null, device_fingerprint: null,
      notes: null, edited_by: null, edited_at: null,
      created_at: hoursAgo(4.5), updated_at: minsAgo(15),
    },
    // Ana: ya ha salido — 6h turno
    {
      id: "fic-003", organization_id: ORG_ID, employee_id: "emp-004",
      location_id: LOC_1, work_date: todayStr(),
      clock_in_at: hoursAgo(7), clock_out_at: hoursAgo(1),
      worked_minutes: 330, break_minutes: 30, status: "closed", source: "kiosk",
      clock_in_lat: 40.4168, clock_in_lng: -3.7038, clock_in_accuracy_m: 10,
      clock_out_lat: 40.4168, clock_out_lng: -3.7039, clock_out_accuracy_m: 12,
      within_geofence: true, distance_from_location_m: 10,
      clock_in_photo_url: null, clock_out_photo_url: null,
      user_agent: null, ip_address: null, device_fingerprint: null,
      notes: null, edited_by: null, edited_at: null,
      created_at: hoursAgo(7), updated_at: hoursAgo(1),
    },
    // Javier: FUERA del geofence!
    {
      id: "fic-004", organization_id: ORG_ID, employee_id: "emp-005",
      location_id: LOC_2, work_date: todayStr(),
      clock_in_at: hoursAgo(2), clock_out_at: null,
      worked_minutes: null, break_minutes: 0, status: "open", source: "mobile",
      clock_in_lat: 40.4500, clock_in_lng: -3.6800, clock_in_accuracy_m: 50,
      clock_out_lat: null, clock_out_lng: null, clock_out_accuracy_m: null,
      within_geofence: false, distance_from_location_m: 4200,
      clock_in_photo_url: null, clock_out_photo_url: null,
      user_agent: null, ip_address: null, device_fingerprint: null,
      notes: null, edited_by: null, edited_at: null,
      created_at: hoursAgo(2), updated_at: hoursAgo(2),
    },
    // Pablo: no ha fichado hoy (sin fichaje)
  ];
}

export function getDemoBreaks(): FichajeBreak[] {
  return [
    {
      id: "brk-001", fichaje_id: "fic-002",
      break_start_at: minsAgo(15), break_end_at: null,
      duration_minutes: null, break_type: "pause",
      created_at: minsAgo(15),
    },
  ];
}

// ===== F3+F4: Turnos, cuadrantes, IA =====

export const DEMO_SHIFT_TEMPLATES: ShiftTemplate[] = [
  { id: "tpl-1", organization_id: ORG_ID, name: "Mañana", start_time: "08:00", end_time: "16:00", break_minutes: 30, color: "#3B82F6", roles: ["camarero","cocinero"], active: true, created_at: "", updated_at: "" },
  { id: "tpl-2", organization_id: ORG_ID, name: "Tarde", start_time: "16:00", end_time: "00:00", break_minutes: 30, color: "#F97316", roles: ["camarero","cocinero"], active: true, created_at: "", updated_at: "" },
  { id: "tpl-3", organization_id: ORG_ID, name: "Partido", start_time: "10:00", end_time: "16:00", break_minutes: 0, color: "#10B981", roles: [], active: true, created_at: "", updated_at: "" },
  { id: "tpl-4", organization_id: ORG_ID, name: "Turno completo", start_time: "09:00", end_time: "17:00", break_minutes: 30, color: "#8B5CF6", roles: ["encargado"], active: true, created_at: "", updated_at: "" },
];

export function getDemoShiftPlan(weekStart: string): ShiftPlan {
  return {
    id: "plan-demo-001",
    organization_id: ORG_ID,
    location_id: LOC_1,
    week_start: weekStart,
    status: "draft",
    generated_by: "ai",
    ai_explanation: "He generado un cuadrante de ejemplo con **12 turnos** para **5 empleados**. La cobertura es del **85%** con 2 turnos abiertos que necesitan cubrirse.",
    ai_suggestions: [
      { action: "assign_underused", description: "Pablo tiene pocas horas. Podría cubrir el turno abierto del sábado.", impact: "high" },
      { action: "balance_hours", description: "Ana tiene 8h más que Carlos. Redistribuir un turno mejoraría la equidad.", impact: "medium" },
    ],
    total_hours: 80,
    total_cost: 1040,
    coverage_score: 85,
    notes: null,
    published_at: null,
    published_by: null,
    created_at: "",
    updated_at: "",
  };
}

export function getDemoShiftItems(): ShiftPlanItem[] {
  const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
  const d = (i: number) => format(addDays(monday, i), "yyyy-MM-dd");

  return [
    { id: "si-01", plan_id: "plan-demo-001", employee_id: "emp-001", work_date: d(0), start_time: "08:00", end_time: "16:00", break_minutes: 30, role: "camarero", color: "#3B82F6", notes: null, is_open_shift: false, sort_order: 0, created_at: "", updated_at: "" },
    { id: "si-02", plan_id: "plan-demo-001", employee_id: "emp-001", work_date: d(2), start_time: "08:00", end_time: "16:00", break_minutes: 30, role: "camarero", color: "#3B82F6", notes: null, is_open_shift: false, sort_order: 1, created_at: "", updated_at: "" },
    { id: "si-03", plan_id: "plan-demo-001", employee_id: "emp-001", work_date: d(4), start_time: "08:00", end_time: "16:00", break_minutes: 30, role: "camarero", color: "#3B82F6", notes: null, is_open_shift: false, sort_order: 2, created_at: "", updated_at: "" },
    { id: "si-04", plan_id: "plan-demo-001", employee_id: "emp-002", work_date: d(0), start_time: "08:00", end_time: "16:00", break_minutes: 30, role: "cocinero", color: "#F97316", notes: null, is_open_shift: false, sort_order: 3, created_at: "", updated_at: "" },
    { id: "si-05", plan_id: "plan-demo-001", employee_id: "emp-002", work_date: d(1), start_time: "08:00", end_time: "16:00", break_minutes: 30, role: "cocinero", color: "#F97316", notes: null, is_open_shift: false, sort_order: 4, created_at: "", updated_at: "" },
    { id: "si-06", plan_id: "plan-demo-001", employee_id: "emp-002", work_date: d(3), start_time: "16:00", end_time: "00:00", break_minutes: 30, role: "cocinero", color: "#F97316", notes: null, is_open_shift: false, sort_order: 5, created_at: "", updated_at: "" },
    { id: "si-07", plan_id: "plan-demo-001", employee_id: "emp-004", work_date: d(0), start_time: "09:00", end_time: "17:00", break_minutes: 30, role: "encargado", color: "#8B5CF6", notes: null, is_open_shift: false, sort_order: 6, created_at: "", updated_at: "" },
    { id: "si-08", plan_id: "plan-demo-001", employee_id: "emp-004", work_date: d(1), start_time: "09:00", end_time: "17:00", break_minutes: 30, role: "encargado", color: "#8B5CF6", notes: null, is_open_shift: false, sort_order: 7, created_at: "", updated_at: "" },
    { id: "si-09", plan_id: "plan-demo-001", employee_id: "emp-004", work_date: d(2), start_time: "09:00", end_time: "17:00", break_minutes: 30, role: "encargado", color: "#8B5CF6", notes: null, is_open_shift: false, sort_order: 8, created_at: "", updated_at: "" },
    { id: "si-10", plan_id: "plan-demo-001", employee_id: "emp-003", work_date: d(1), start_time: "16:00", end_time: "00:00", break_minutes: 30, role: "camarero", color: "#10B981", notes: null, is_open_shift: false, sort_order: 9, created_at: "", updated_at: "" },
    { id: "si-11", plan_id: "plan-demo-001", employee_id: "emp-003", work_date: d(3), start_time: "16:00", end_time: "00:00", break_minutes: 30, role: "camarero", color: "#10B981", notes: null, is_open_shift: false, sort_order: 10, created_at: "", updated_at: "" },
    { id: "si-12", plan_id: "plan-demo-001", employee_id: "emp-005", work_date: d(5), start_time: "10:00", end_time: "16:00", break_minutes: 0, role: "camarero", color: "#EF4444", notes: null, is_open_shift: false, sort_order: 11, created_at: "", updated_at: "" },
  ];
}

export function getDemoDemand(weekStart: string): DemandForecast[] {
  const monday = new Date(weekStart + "T00:00:00");
  const result: DemandForecast[] = [];
  const slots = ["10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00","21:00","22:00"];
  const baseCurve = [10,20,40,65,55,30,25,30,45,60,70,50,25];
  const dayFactor = [1.0, 0.8, 0.9, 1.0, 1.2, 1.5, 1.3]; // lun-dom

  for (let d = 0; d < 7; d++) {
    const dateStr = format(addDays(monday, d), "yyyy-MM-dd");
    slots.forEach((slot, si) => {
      result.push({
        id: `dem-${d}-${si}`,
        organization_id: ORG_ID,
        location_id: LOC_1,
        forecast_date: dateStr,
        time_slot: slot,
        expected_covers: Math.round(baseCurve[si] * dayFactor[d]),
        expected_revenue: Math.round(baseCurve[si] * dayFactor[d] * 18),
        source: "historical",
        confidence: 75,
      });
    });
  }
  return result;
}

export function getDemoStaffingRules(): StaffingRule[] {
  return [
    { id: "sr-1", organization_id: ORG_ID, role: "camarero", covers_per_staff: 25, min_staff: 1, required_always: false },
    { id: "sr-2", organization_id: ORG_ID, role: "cocinero", covers_per_staff: 35, min_staff: 1, required_always: false },
    { id: "sr-3", organization_id: ORG_ID, role: "encargado", covers_per_staff: 999, min_staff: 1, required_always: true },
  ];
}

export function getDemoAvailability(): EmployeeAvailability[] {
  // Pablo no disponible martes y miércoles
  return [
    { id: "av-1", employee_id: "emp-003", day_of_week: 1, available: false, preferred_start: null, preferred_end: null, notes: "universidad" },
    { id: "av-2", employee_id: "emp-003", day_of_week: 2, available: false, preferred_start: null, preferred_end: null, notes: "universidad" },
    // Javier solo puede tardes
    { id: "av-3", employee_id: "emp-005", day_of_week: 0, available: true, preferred_start: "16:00", preferred_end: "00:00", notes: null },
    { id: "av-4", employee_id: "emp-005", day_of_week: 1, available: true, preferred_start: "16:00", preferred_end: "00:00", notes: null },
    { id: "av-5", employee_id: "emp-005", day_of_week: 2, available: true, preferred_start: "16:00", preferred_end: "00:00", notes: null },
    { id: "av-6", employee_id: "emp-005", day_of_week: 3, available: true, preferred_start: "16:00", preferred_end: "00:00", notes: null },
    { id: "av-7", employee_id: "emp-005", day_of_week: 4, available: true, preferred_start: "16:00", preferred_end: "00:00", notes: null },
  ];
}

// ===== F5+: Shift swaps =====

export function getDemoSwapRequests(): import("@/types").ShiftSwapRequest[] {
  return [
    { id: "sw-1", organization_id: ORG_ID, requester_id: "emp-003", target_id: "emp-001", requester_item_id: "si-10", target_item_id: "si-01", status: "pending", reason: "Tengo cita médica el martes, ¿me cambias al lunes?", decided_by: null, decided_at: null, created_at: minsAgo(120) },
    { id: "sw-2", organization_id: ORG_ID, requester_id: "emp-005", target_id: "emp-003", requester_item_id: "si-12", target_item_id: "si-11", status: "accepted", reason: "Prefiero trabajar el jueves", decided_by: ADMIN_PROFILE_ID, decided_at: hoursAgo(24), created_at: hoursAgo(48) },
  ];
}

// ===== F5: Ausencias, reportes, notificaciones =====

export function getDemoAbsenceTypes(): AbsenceType[] {
  return [
    { id: "at-1", organization_id: ORG_ID, name: "Vacaciones", code: "VAC", color: "#3B82F6", paid: true, generates_vacation: false, requires_document: false, max_days_year: 30, active: true, sort_order: 0 },
    { id: "at-2", organization_id: ORG_ID, name: "Baja médica", code: "IT", color: "#EF4444", paid: true, generates_vacation: true, requires_document: true, max_days_year: null, active: true, sort_order: 1 },
    { id: "at-3", organization_id: ORG_ID, name: "Asuntos propios", code: "AP", color: "#F97316", paid: false, generates_vacation: false, requires_document: false, max_days_year: 3, active: true, sort_order: 2 },
    { id: "at-4", organization_id: ORG_ID, name: "Permiso no retribuido", code: "PNR", color: "#64748B", paid: false, generates_vacation: false, requires_document: false, max_days_year: null, active: true, sort_order: 3 },
  ];
}

export function getDemoAbsenceRequests(): AbsenceRequest[] {
  return [
    { id: "ar-1", organization_id: ORG_ID, employee_id: "emp-001", absence_type_id: "at-1", start_date: "2026-05-01", end_date: "2026-05-10", days_count: 8, half_day: false, status: "approved", reason: "Vacaciones de primavera", document_url: null, decided_by: ADMIN_PROFILE_ID, decided_at: "2026-04-10T10:00:00Z", decision_notes: null, created_at: "2026-04-05T09:00:00Z", updated_at: "2026-04-10T10:00:00Z" },
    { id: "ar-2", organization_id: ORG_ID, employee_id: "emp-003", absence_type_id: "at-3", start_date: "2026-04-18", end_date: "2026-04-18", days_count: 1, half_day: false, status: "pending", reason: "Mudanza", document_url: null, decided_by: null, decided_at: null, decision_notes: null, created_at: "2026-04-15T08:00:00Z", updated_at: "2026-04-15T08:00:00Z" },
    { id: "ar-3", organization_id: ORG_ID, employee_id: "emp-002", absence_type_id: "at-2", start_date: "2026-04-07", end_date: "2026-04-11", days_count: 5, half_day: false, status: "approved", reason: "Gripe", document_url: null, decided_by: ADMIN_PROFILE_ID, decided_at: "2026-04-07T11:00:00Z", decision_notes: null, created_at: "2026-04-07T07:00:00Z", updated_at: "2026-04-07T11:00:00Z" },
    { id: "ar-4", organization_id: ORG_ID, employee_id: "emp-005", absence_type_id: "at-1", start_date: "2026-06-15", end_date: "2026-06-30", days_count: 12, half_day: false, status: "pending", reason: "Vacaciones verano", document_url: null, decided_by: null, decided_at: null, decision_notes: null, created_at: "2026-04-14T14:00:00Z", updated_at: "2026-04-14T14:00:00Z" },
  ];
}

export function getDemoAbsenceBalances(): AbsenceBalance[] {
  const year = new Date().getFullYear();
  return [
    { id: "ab-1", employee_id: "emp-001", absence_type_id: "at-1", year, entitled_days: 30, used_days: 8, pending_days: 0, carried_over: 2 },
    { id: "ab-2", employee_id: "emp-002", absence_type_id: "at-1", year, entitled_days: 30, used_days: 0, pending_days: 0, carried_over: 0 },
    { id: "ab-3", employee_id: "emp-003", absence_type_id: "at-1", year, entitled_days: 30, used_days: 3, pending_days: 1, carried_over: 0 },
    { id: "ab-4", employee_id: "emp-004", absence_type_id: "at-1", year, entitled_days: 30, used_days: 12, pending_days: 0, carried_over: 4 },
    { id: "ab-5", employee_id: "emp-005", absence_type_id: "at-1", year, entitled_days: 30, used_days: 0, pending_days: 12, carried_over: 0 },
    { id: "ab-6", employee_id: "emp-001", absence_type_id: "at-3", year, entitled_days: 3, used_days: 1, pending_days: 0, carried_over: 0 },
    { id: "ab-7", employee_id: "emp-002", absence_type_id: "at-2", year, entitled_days: 0, used_days: 5, pending_days: 0, carried_over: 0 },
  ];
}

export function getDemoNotifications(): Notification[] {
  return [
    { id: "n-1", organization_id: ORG_ID, recipient_employee_id: null, recipient_profile_id: ADMIN_PROFILE_ID, type: "absence_requested", title: "Pablo solicita 1 día de asuntos propios", body: "18 abr — Mudanza", link: "/app/ausencias", read: false, created_at: minsAgo(30) },
    { id: "n-2", organization_id: ORG_ID, recipient_employee_id: null, recipient_profile_id: ADMIN_PROFILE_ID, type: "absence_requested", title: "Javier solicita 12 días de vacaciones", body: "15-30 jun", link: "/app/ausencias", read: false, created_at: hoursAgo(2) },
    { id: "n-3", organization_id: ORG_ID, recipient_employee_id: null, recipient_profile_id: ADMIN_PROFILE_ID, type: "overtime_alert", title: "Ana acumula 42h esta semana", body: "Supera el límite de 40h/semana", link: "/app/reportes", read: true, created_at: hoursAgo(5) },
    { id: "n-4", organization_id: ORG_ID, recipient_employee_id: null, recipient_profile_id: ADMIN_PROFILE_ID, type: "schedule_published", title: "Cuadrante publicado", body: "Semana del 20 abr", link: "/app/cuadrante", read: true, created_at: hoursAgo(24) },
  ];
}

export function getDemoReportFichajes(from: string, to: string): Fichaje[] {
  const base = getDemoFichajes();
  // Generamos fichajes cerrados de días anteriores para el reporte
  const extra: Fichaje[] = [];
  const emps = ["emp-001","emp-002","emp-003","emp-004","emp-005"];
  for (let d = 1; d <= 7; d++) {
    const date = format(addDays(new Date(from + "T00:00:00"), d), "yyyy-MM-dd");
    if (date > to) break;
    emps.forEach((empId, i) => {
      if (Math.random() < 0.3) return; // 30% no trabaja
      const hours = 6 + Math.floor(Math.random() * 4);
      const startH = 8 + (i % 2 === 0 ? 0 : 8);
      const worked = hours * 60 - 30;
      extra.push({
        id: `rep-${d}-${i}`, organization_id: ORG_ID, employee_id: empId,
        location_id: LOC_1, work_date: date,
        clock_in_at: `${date}T${String(startH).padStart(2,"0")}:0${i}:00Z`,
        clock_out_at: `${date}T${String(startH + hours).padStart(2,"0")}:0${i}:00Z`,
        worked_minutes: worked, break_minutes: 30, status: "closed", source: "kiosk",
        clock_in_lat: 40.4168, clock_in_lng: -3.7038, clock_in_accuracy_m: 10,
        clock_out_lat: 40.4168, clock_out_lng: -3.7038, clock_out_accuracy_m: 10,
        within_geofence: i !== 4, distance_from_location_m: i === 4 ? 3500 : 15,
        clock_in_photo_url: null, clock_out_photo_url: null,
        user_agent: null, ip_address: null, device_fingerprint: null,
        notes: null, edited_by: null, edited_at: null, created_at: "", updated_at: "",
      });
    });
  }
  return [...base, ...extra];
}

/** Detecta si estamos en modo demo */
export function isDemoMode(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("fichaje_demo") === "1";
}

export function enableDemoMode() {
  localStorage.setItem("fichaje_demo", "1");
}

export function disableDemoMode() {
  localStorage.removeItem("fichaje_demo");
}
