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

