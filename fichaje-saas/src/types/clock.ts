export type FichajeStatus = "open" | "on_break" | "closed" | "edited" | "invalid";
export type FichajeSource = "web" | "mobile" | "kiosk" | "manual" | "auto_close";

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
