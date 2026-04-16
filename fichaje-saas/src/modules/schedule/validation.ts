/**
 * Motor de validaciones de turnos.
 * Centraliza toda la l\u00f3gica de detecci\u00f3n de conflictos y violaciones de reglas.
 * Lo usan: CuadrantePage (al crear/editar turno), CuadranteIA (al generar),
 * y SettingsPage (para mostrar el estado de las reglas).
 */

import type {
  AbsenceRequest, Employee, LaborRules, Location, ShiftPlanItem,
} from "@/types";
import { DAY_KEYS, type DayKey } from "@/types/core";

export type ValidationSeverity = "error" | "warning" | "info";

export interface ValidationResult {
  type:
    | "overlap"           // El empleado ya tiene un turno solapado
    | "absence_conflict"  // Empleado tiene ausencia aprobada
    | "rest_short"        // Descanso entre turnos < m\u00ednimo
    | "weekly_overtime"   // Supera m\u00e1ximo horas/semana
    | "daily_overtime"    // Supera m\u00e1ximo horas/d\u00eda
    | "no_break"          // Turno > 6h sin pausa
    | "weekly_rest"       // Sin descanso semanal
    | "no_skill"          // Empleado sin la habilidad requerida
    | "outside_availability"  // Fuera de disponibilidad declarada
    | "outside_opening"   // Fuera del horario de apertura del local
    | "location_closed";  // El local est\u00e1 cerrado ese d\u00eda
  severity: ValidationSeverity;
  message: string;
  blocking?: boolean;     // Si true, no se debe permitir guardar
}

export interface ValidationContext {
  employees: Employee[];
  existingShifts: ShiftPlanItem[];   // Turnos ya planificados (otros)
  approvedAbsences: AbsenceRequest[]; // Ausencias aprobadas
  laborRules: LaborRules | null;
  location?: Location | null;        // Para validar contra horario de apertura
}

/**
 * Convierte "HH:MM" a minutos desde medianoche.
 */
function timeToMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

/**
 * Calcula horas trabajadas de un turno (descontando pausa).
 */
export function shiftHours(start: string, end: string, breakMin = 0): number {
  let d = timeToMin(end) - timeToMin(start);
  if (d <= 0) d += 24 * 60;
  return Math.max(0, (d - breakMin) / 60);
}

/**
 * Comprueba si dos turnos en la misma fecha se solapan.
 */
function shiftsOverlap(
  a: { start_time: string; end_time: string },
  b: { start_time: string; end_time: string }
): boolean {
  const aStart = timeToMin(a.start_time);
  let aEnd = timeToMin(a.end_time);
  if (aEnd <= aStart) aEnd += 24 * 60;
  const bStart = timeToMin(b.start_time);
  let bEnd = timeToMin(b.end_time);
  if (bEnd <= bStart) bEnd += 24 * 60;
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Calcula horas planificadas en una semana (lunes-domingo) para un empleado.
 */
function weeklyHoursForEmployee(
  employeeId: string,
  weekStartISO: string,
  weekEndISO: string,
  shifts: ShiftPlanItem[],
  excludeId?: string
): number {
  return shifts
    .filter((s) =>
      s.employee_id === employeeId &&
      s.work_date >= weekStartISO &&
      s.work_date <= weekEndISO &&
      s.id !== excludeId
    )
    .reduce((sum, s) => sum + shiftHours(s.start_time, s.end_time, s.break_minutes), 0);
}

/**
 * Devuelve el lunes y domingo de la semana de una fecha dada.
 */
function getWeekRange(dateISO: string): { start: string; end: string } {
  const d = new Date(dateISO + "T00:00:00");
  const day = (d.getDay() + 6) % 7; // 0 = lunes
  const monday = new Date(d);
  monday.setDate(d.getDate() - day);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (x: Date) => x.toISOString().slice(0, 10);
  return { start: fmt(monday), end: fmt(sunday) };
}

/**
 * Valida un turno propuesto contra todas las reglas.
 * Devuelve la lista de problemas detectados.
 */
export function validateShift(
  shift: {
    id?: string;
    employee_id: string;
    work_date: string;
    start_time: string;
    end_time: string;
    break_minutes: number;
    role?: string | null;
  },
  ctx: ValidationContext
): ValidationResult[] {
  const results: ValidationResult[] = [];
  const { employees, existingShifts, approvedAbsences, laborRules, location } = ctx;
  const emp = employees.find((e) => e.id === shift.employee_id);

  // ============ HORARIO DE APERTURA DEL LOCAL ============
  if (location?.opening_hours) {
    const dayIdx = (new Date(shift.work_date + "T00:00:00").getDay() + 6) % 7; // 0=lunes
    const dayKey: DayKey = DAY_KEYS[dayIdx];
    const day = location.opening_hours[dayKey];
    if (day && !day.open) {
      results.push({
        type: "location_closed",
        severity: "warning",
        message: `${location.name} est\u00e1 cerrado el ${["lunes","martes","mi\u00e9rcoles","jueves","viernes","s\u00e1bado","domingo"][dayIdx]}`,
      });
    } else if (day && day.open) {
      // Comprobar que el turno cae dentro de la franja de apertura
      const openMin = timeToMin(day.from);
      let closeMin = timeToMin(day.to);
      if (closeMin <= openMin) closeMin += 24 * 60; // cierra al d\u00eda siguiente

      const shiftStart = timeToMin(shift.start_time);
      let shiftEnd = timeToMin(shift.end_time);
      if (shiftEnd <= shiftStart) shiftEnd += 24 * 60;

      if (shiftStart < openMin || shiftEnd > closeMin) {
        results.push({
          type: "outside_opening",
          severity: "warning",
          message: `Turno fuera del horario de apertura (${day.from} - ${day.to})`,
        });
      }
    }
  }

  // ============ AUSENCIA APROBADA ============
  const conflictAbsence = approvedAbsences.find(
    (a) =>
      a.employee_id === shift.employee_id &&
      a.status === "approved" &&
      shift.work_date >= a.start_date &&
      shift.work_date <= a.end_date
  );
  if (conflictAbsence) {
    results.push({
      type: "absence_conflict",
      severity: "error",
      message: `${emp?.first_name ?? "Este empleado"} tiene una ausencia aprobada el ${shift.work_date}`,
      blocking: true,
    });
  }

  // ============ SOLAPAMIENTO ============
  const sameDayShifts = existingShifts.filter(
    (s) =>
      s.employee_id === shift.employee_id &&
      s.work_date === shift.work_date &&
      s.id !== shift.id
  );
  for (const other of sameDayShifts) {
    if (shiftsOverlap(shift, other)) {
      results.push({
        type: "overlap",
        severity: "error",
        message: `Solapa con otro turno: ${other.start_time} - ${other.end_time}`,
        blocking: true,
      });
      break;
    }
  }

  // ============ DURACI\u00d3N + REGLAS LABORALES ============
  const hours = shiftHours(shift.start_time, shift.end_time, shift.break_minutes);

  if (laborRules) {
    // Horas m\u00e1ximas/d\u00eda
    if (hours > laborRules.max_hours_day) {
      results.push({
        type: "daily_overtime",
        severity: "warning",
        message: `Turno de ${hours.toFixed(1)}h supera el m\u00e1ximo de ${laborRules.max_hours_day}h/d\u00eda`,
      });
    }

    // Horas m\u00e1ximas/semana
    const { start: ws, end: we } = getWeekRange(shift.work_date);
    const weekHours = weeklyHoursForEmployee(
      shift.employee_id, ws, we, existingShifts, shift.id
    ) + hours;
    if (weekHours > laborRules.max_hours_week) {
      results.push({
        type: "weekly_overtime",
        severity: "warning",
        message: `Total semanal: ${weekHours.toFixed(1)}h supera el m\u00e1ximo de ${laborRules.max_hours_week}h`,
      });
    }

    // Pausa obligatoria si turno > X horas
    if (hours > 6 && shift.break_minutes < 15) {
      results.push({
        type: "no_break",
        severity: "warning",
        message: `Turno de ${hours.toFixed(1)}h sin pausa (m\u00ednimo legal: 15 min para >6h)`,
      });
    }

    // Descanso m\u00ednimo entre turnos
    const otherShifts = existingShifts.filter(
      (s) => s.employee_id === shift.employee_id && s.id !== shift.id
    );
    for (const other of otherShifts) {
      const restHours = computeRestBetween(other, shift);
      if (restHours !== null && restHours < laborRules.min_rest_between_shifts_h) {
        results.push({
          type: "rest_short",
          severity: "warning",
          message: `Solo ${restHours.toFixed(1)}h de descanso desde turno anterior (m\u00ednimo: ${laborRules.min_rest_between_shifts_h}h)`,
        });
        break;
      }
    }
  }

  return results;
}

/**
 * Calcula horas de descanso entre dos turnos (si est\u00e1n en d\u00edas adyacentes o el mismo d\u00eda).
 * Devuelve null si no hay relaci\u00f3n temporal directa.
 */
function computeRestBetween(
  shiftA: { work_date: string; start_time: string; end_time: string },
  shiftB: { work_date: string; start_time: string; end_time: string }
): number | null {
  const dA = new Date(shiftA.work_date + "T00:00:00");
  const dB = new Date(shiftB.work_date + "T00:00:00");
  const diffDays = Math.abs((dB.getTime() - dA.getTime()) / 86400000);
  if (diffDays > 1) return null;

  const [first, second] =
    dA <= dB ? [shiftA, shiftB] : [shiftB, shiftA];

  // Hora absoluta de fin del primero y de inicio del segundo
  const firstEndDate = new Date(first.work_date + "T00:00:00");
  const fEnd = timeToMin(first.end_time);
  const fStart = timeToMin(first.start_time);
  if (fEnd <= fStart) firstEndDate.setDate(firstEndDate.getDate() + 1);
  firstEndDate.setMinutes(fEnd);

  const secondStartDate = new Date(second.work_date + "T00:00:00");
  secondStartDate.setMinutes(timeToMin(second.start_time));

  const diffH = (secondStartDate.getTime() - firstEndDate.getTime()) / 3600000;
  if (diffH < 0) return 0;
  return diffH;
}

/**
 * Estado de overtime de un empleado para destacar visualmente en el grid.
 */
export type OvertimeStatus = "none" | "warning" | "danger";

export function overtimeStatusFor(
  employeeId: string,
  weekStartISO: string,
  weekEndISO: string,
  contractWeekly: number | null,
  shifts: ShiftPlanItem[]
): OvertimeStatus {
  const contract = contractWeekly ?? 40;
  const hours = weeklyHoursForEmployee(employeeId, weekStartISO, weekEndISO, shifts);
  // 120 min antes del l\u00edmite = warning
  if (hours >= contract) return "danger";
  if (hours >= contract - 2) return "warning";
  return "none";
}
