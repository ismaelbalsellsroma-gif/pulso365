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
