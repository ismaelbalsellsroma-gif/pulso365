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
