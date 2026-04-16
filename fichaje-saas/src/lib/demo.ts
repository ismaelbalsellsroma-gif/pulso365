import type { Employee, Fichaje, FichajeBreak, LaborRules, Location, Organization, Profile } from "@/types";

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
