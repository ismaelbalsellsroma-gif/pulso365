export type AbsenceStatus = "pending" | "approved" | "rejected" | "cancelled";

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
