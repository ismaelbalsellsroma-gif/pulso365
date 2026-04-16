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
