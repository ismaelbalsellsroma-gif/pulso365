/**
 * Motor de generación automática de cuadrantes (F4).
 *
 * Pipeline de 4 etapas:
 *   A) Calcular demanda de personal por franja
 *   B) Construir slots candidatos desde plantillas
 *   C) Asignar empleados (greedy + repair)
 *   D) Generar explicación y sugerencias
 *
 * Todo corre en el navegador (no necesita Edge Function).
 * En producción se movería a un Edge Function para no bloquear el UI.
 */

import type {
  DemandForecast,
  Employee,
  EmployeeAvailability,
  LaborRules,
  ShiftPlanItem,
  ShiftTemplate,
  SolverResult,
  SolverWarning,
  StaffingRule,
  AiSuggestion,
} from "@/types";
import { format, addDays, startOfWeek } from "date-fns";

// ─── helpers ────────────────────────────────────────────────────────────────

function timeToMin(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

function shiftMinutes(start: string, end: string, brk: number) {
  let d = timeToMin(end) - timeToMin(start);
  if (d <= 0) d += 24 * 60;
  return Math.max(0, d - brk);
}

function weekDates(monday: string): string[] {
  const d = new Date(monday + "T00:00:00");
  return Array.from({ length: 7 }, (_, i) => format(addDays(d, i), "yyyy-MM-dd"));
}

function mondayOf(d: Date): string {
  return format(startOfWeek(d, { weekStartsOn: 1 }), "yyyy-MM-dd");
}

// ─── Etapa A: calcular necesidades de personal ─────────────────────────────

interface StaffNeed {
  date: string;
  slot: string;
  role: string;
  needed: number;
}

function computeStaffNeeds(
  dates: string[],
  demand: DemandForecast[],
  rules: StaffingRule[]
): StaffNeed[] {
  const needs: StaffNeed[] = [];
  const slots = [
    "08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00",
    "16:00","17:00","18:00","19:00","20:00","21:00","22:00","23:00",
  ];

  for (const date of dates) {
    for (const slot of slots) {
      const fc = demand.find(
        (d) => d.forecast_date === date && d.time_slot === slot
      );
      const covers = fc?.expected_covers ?? 0;
      if (covers === 0 && !rules.some((r) => r.required_always)) continue;

      for (const rule of rules) {
        const fromDemand = Math.ceil(covers / Math.max(1, rule.covers_per_staff));
        const need = Math.max(rule.min_staff, fromDemand);
        if (rule.required_always || need > 0) {
          needs.push({ date, slot, role: rule.role, needed: Math.max(need, rule.required_always ? rule.min_staff : 0) });
        }
      }
    }
  }
  return needs;
}

// ─── Etapa B+C: asignación greedy ──────────────────────────────────────────

interface EmployeeMeta {
  emp: Employee;
  weekMinutes: number;
  lastEndMin: number;      // minuto del día en que acabó su último turno (para descanso)
  lastDate: string | null;
  availability: EmployeeAvailability[];
  daysWorked: Set<string>;
}

function isAvailable(
  meta: EmployeeMeta,
  date: string,
  startTime: string,
  endTime: string,
  laborRules: LaborRules
): { ok: boolean; reason?: string } {
  const dayIdx = (new Date(date + "T00:00:00").getDay() + 6) % 7; // 0=lunes

  // Disponibilidad declarada
  const avail = meta.availability.find((a) => a.day_of_week === dayIdx);
  if (avail && !avail.available) return { ok: false, reason: "no-disponible" };

  // Horas máximas por semana
  const shiftMins = shiftMinutes(startTime, endTime, 0);
  if ((meta.weekMinutes + shiftMins) / 60 > laborRules.max_hours_week) {
    return { ok: false, reason: "excede-horas-semana" };
  }

  // Horas máximas por día
  if (shiftMins / 60 > laborRules.max_hours_day) {
    return { ok: false, reason: "excede-horas-dia" };
  }

  // Descanso mínimo entre turnos
  if (meta.lastDate === date || (meta.lastDate && meta.lastDate < date)) {
    if (meta.lastDate === date) return { ok: false, reason: "ya-tiene-turno" };
    // Comprobar gap entre turno anterior y este
    const lastEndTotal = meta.lastEndMin;
    const thisStartTotal = timeToMin(startTime);
    // Si fue ayer, gap = (24*60 - lastEnd) + thisStart
    const yesterday = format(addDays(new Date(date + "T00:00:00"), -1), "yyyy-MM-dd");
    if (meta.lastDate === yesterday) {
      const gap = (24 * 60 - lastEndTotal) + thisStartTotal;
      if (gap < laborRules.min_rest_between_shifts_h * 60) {
        return { ok: false, reason: "descanso-insuficiente" };
      }
    }
  }

  return { ok: true };
}

function bestTemplate(
  templates: ShiftTemplate[],
  role: string,
  slot: string
): ShiftTemplate | null {
  // Buscar la plantilla que cubre la franja y el rol
  const slotMin = timeToMin(slot);
  return (
    templates.find((t) => {
      const s = timeToMin(t.start_time);
      let e = timeToMin(t.end_time);
      if (e <= s) e += 24 * 60;
      const coversSlot = s <= slotMin && slotMin < e;
      const matchesRole = t.roles.length === 0 || t.roles.includes(role);
      return coversSlot && matchesRole && t.active;
    }) ?? null
  );
}

// ─── Solver principal ──────────────────────────────────────────────────────

export interface SolverInput {
  weekStart: string;          // "2026-04-20" (lunes)
  employees: Employee[];
  templates: ShiftTemplate[];
  demand: DemandForecast[];
  staffingRules: StaffingRule[];
  availability: EmployeeAvailability[];
  laborRules: LaborRules;
}

export function solveSchedule(input: SolverInput): SolverResult {
  const {
    weekStart, employees, templates, demand,
    staffingRules, availability, laborRules,
  } = input;

  const dates = weekDates(weekStart);
  const warnings: SolverWarning[] = [];
  const items: SolverResult["items"] = [];
  const openShifts: SolverResult["openShifts"] = [];

  // Inicializar metadatos por empleado
  const metas = new Map<string, EmployeeMeta>();
  for (const emp of employees.filter((e) => e.active)) {
    metas.set(emp.id, {
      emp,
      weekMinutes: 0,
      lastEndMin: 0,
      lastDate: null,
      availability: availability.filter((a) => a.employee_id === emp.id),
      daysWorked: new Set(),
    });
  }

  // Etapa A: necesidades
  const needs = computeStaffNeeds(dates, demand, staffingRules);

  // Agrupar necesidades por date+role → determinar turnos necesarios
  const dateRoleNeeds = new Map<string, { date: string; role: string; peakNeed: number }>();
  for (const n of needs) {
    const key = `${n.date}|${n.role}`;
    const existing = dateRoleNeeds.get(key);
    if (!existing || n.needed > existing.peakNeed) {
      dateRoleNeeds.set(key, { date: n.date, role: n.role, peakNeed: n.needed });
    }
  }

  // Etapa C: asignar greedy por día + rol
  const assignedByDate = new Map<string, Set<string>>(); // date → set of employee IDs

  for (const { date, role, peakNeed } of dateRoleNeeds.values()) {
    if (!assignedByDate.has(date)) assignedByDate.set(date, new Set());
    const dateAssigned = assignedByDate.get(date)!;

    // Encontrar la mejor plantilla para esta franja
    const busySlots = needs.filter((n) => n.date === date && n.role === role && n.needed > 0);
    if (busySlots.length === 0) continue;

    // Usar la franja con más demanda para elegir plantilla
    const peakSlot = busySlots.reduce((a, b) => (a.needed >= b.needed ? a : b));
    const tpl = bestTemplate(templates, role, peakSlot.slot);
    if (!tpl) continue;

    // Asignar peakNeed empleados a este turno
    let assigned = 0;
    // Ordenar candidatos: menos horas esta semana primero, luego menor coste
    const candidates = [...metas.values()]
      .filter((m) => {
        if (dateAssigned.has(m.emp.id)) return false;
        const pos = (m.emp.position ?? "").toLowerCase();
        return role === "" || pos.includes(role.toLowerCase()) || staffingRules.length <= 1;
      })
      .sort((a, b) => a.weekMinutes - b.weekMinutes || (a.emp.hourly_cost ?? 99) - (b.emp.hourly_cost ?? 99));

    for (const meta of candidates) {
      if (assigned >= peakNeed) break;
      const check = isAvailable(meta, date, tpl.start_time, tpl.end_time, laborRules);
      if (!check.ok) continue;

      const mins = shiftMinutes(tpl.start_time, tpl.end_time, tpl.break_minutes);
      items.push({
        employee_id: meta.emp.id,
        work_date: date,
        start_time: tpl.start_time,
        end_time: tpl.end_time,
        break_minutes: tpl.break_minutes,
        role,
        color: tpl.color,
        notes: null,
        is_open_shift: false,
        sort_order: items.length,
      });

      meta.weekMinutes += mins;
      meta.lastEndMin = timeToMin(tpl.end_time);
      meta.lastDate = date;
      meta.daysWorked.add(date);
      dateAssigned.add(meta.emp.id);
      assigned++;
    }

    // Si no hay suficientes → open shift
    if (assigned < peakNeed) {
      const gap = peakNeed - assigned;
      for (let i = 0; i < gap; i++) {
        openShifts.push({
          date,
          start: tpl.start_time,
          end: tpl.end_time,
          role,
        });
      }
      warnings.push({
        type: "uncovered_slot",
        message: `Faltan ${gap} ${role}(s) el ${date} (${tpl.start_time}-${tpl.end_time})`,
        severity: "warning",
        date,
      });
    }
  }

  // ─── Repair: detectar problemas ──────────────────────────────────────────

  for (const meta of metas.values()) {
    if (meta.weekMinutes / 60 > laborRules.max_hours_week) {
      warnings.push({
        type: "over_weekly_hours",
        message: `${meta.emp.first_name} ${meta.emp.last_name ?? ""} tiene ${(meta.weekMinutes / 60).toFixed(1)}h planificadas (máx ${laborRules.max_hours_week}h)`,
        severity: "error",
        employee_id: meta.emp.id,
      });
    }
  }

  // ─── Métricas ────────────────────────────────────────────────────────────

  const totalMinutes = items.reduce(
    (s, i) => s + shiftMinutes(i.start_time, i.end_time, i.break_minutes), 0
  );
  const totalHours = totalMinutes / 60;
  const totalCost = items.reduce((s, i) => {
    const emp = employees.find((e) => e.id === i.employee_id);
    const rate = emp?.hourly_cost ?? 0;
    return s + (shiftMinutes(i.start_time, i.end_time, i.break_minutes) / 60) * rate;
  }, 0);

  // Coverage: % de necesidades cubiertas
  const totalNeeded = [...dateRoleNeeds.values()].reduce((s, n) => s + n.peakNeed, 0);
  const totalAssigned = items.length;
  const coverageScore = totalNeeded > 0 ? Math.round((totalAssigned / totalNeeded) * 100) : 100;

  // ─── Etapa D: explicación y sugerencias ──────────────────────────────────

  const explanation = generateExplanation(items, employees, dates, totalHours, totalCost, coverageScore, warnings, openShifts);
  const suggestions = generateSuggestions(items, employees, metas, warnings, openShifts, laborRules);

  return {
    items,
    totalHours: Math.round(totalHours * 10) / 10,
    totalCost: Math.round(totalCost * 100) / 100,
    coverageScore,
    warnings,
    explanation,
    suggestions,
    openShifts,
  };
}

// ─── Etapa D: explicación en lenguaje natural ──────────────────────────────

function generateExplanation(
  items: SolverResult["items"],
  employees: Employee[],
  dates: string[],
  totalHours: number,
  totalCost: number,
  coverage: number,
  warnings: SolverWarning[],
  openShifts: SolverResult["openShifts"]
): string {
  const empCount = new Set(items.map((i) => i.employee_id)).size;
  const days = new Set(items.map((i) => i.work_date)).size;

  let text = `He generado un cuadrante con **${items.length} turnos** para **${empCount} empleados** a lo largo de **${days} días**, con un total de **${totalHours.toFixed(1)} horas** y un coste estimado de **${totalCost.toFixed(2)} €**.\n\n`;

  if (coverage >= 100) {
    text += `La cobertura es del **${coverage}%** — todas las franjas están cubiertas.\n\n`;
  } else {
    text += `La cobertura es del **${coverage}%**. Hay **${openShifts.length} turno(s) sin cubrir** que he marcado como "open shifts" para que tu equipo los pueda reclamar.\n\n`;
  }

  if (warnings.length > 0) {
    const errors = warnings.filter((w) => w.severity === "error");
    const warns = warnings.filter((w) => w.severity === "warning");
    if (errors.length > 0) {
      text += `⚠️ **${errors.length} problema(s) graves** que deberías revisar:\n`;
      errors.forEach((w) => { text += `- ${w.message}\n`; });
      text += "\n";
    }
    if (warns.length > 0) {
      text += `💡 **${warns.length} aviso(s)**:\n`;
      warns.forEach((w) => { text += `- ${w.message}\n`; });
      text += "\n";
    }
  }

  // Resumen por empleado
  const byEmp = new Map<string, number>();
  for (const item of items) {
    const mins = shiftMinutes(item.start_time, item.end_time, item.break_minutes);
    byEmp.set(item.employee_id, (byEmp.get(item.employee_id) ?? 0) + mins);
  }
  text += "**Reparto de horas:**\n";
  for (const [empId, mins] of byEmp.entries()) {
    const emp = employees.find((e) => e.id === empId);
    if (!emp) continue;
    const name = `${emp.first_name} ${emp.last_name ?? ""}`.trim();
    const contract = emp.contract_hours_week ?? 0;
    const pct = contract > 0 ? Math.round((mins / 60 / contract) * 100) : 0;
    text += `- ${name}: ${(mins / 60).toFixed(1)}h`;
    if (contract > 0) text += ` (${pct}% de sus ${contract}h/semana)`;
    text += "\n";
  }

  return text;
}

function generateSuggestions(
  items: SolverResult["items"],
  employees: Employee[],
  metas: Map<string, EmployeeMeta>,
  warnings: SolverWarning[],
  openShifts: SolverResult["openShifts"],
  rules: LaborRules
): AiSuggestion[] {
  const suggestions: AiSuggestion[] = [];

  // Sugerir empleados infrautilizados para cubrir open shifts
  if (openShifts.length > 0) {
    const underused = [...metas.values()]
      .filter((m) => {
        const contract = m.emp.contract_hours_week ?? 40;
        return m.weekMinutes / 60 < contract * 0.5;
      })
      .map((m) => `${m.emp.first_name} ${m.emp.last_name ?? ""}`.trim());

    if (underused.length > 0) {
      suggestions.push({
        action: "assign_underused",
        description: `${underused.slice(0, 3).join(", ")} tienen pocas horas esta semana. Podrían cubrir los ${openShifts.length} turno(s) abiertos.`,
        impact: "high",
      });
    }
  }

  // Sugerir equilibrar horas si hay mucha diferencia
  const hours = [...metas.values()].map((m) => m.weekMinutes / 60).filter((h) => h > 0);
  if (hours.length >= 2) {
    const max = Math.max(...hours);
    const min = Math.min(...hours);
    if (max - min > 10) {
      suggestions.push({
        action: "balance_hours",
        description: `La diferencia entre el empleado con más y menos horas es de ${(max - min).toFixed(1)}h. Considera redistribuir para mayor equidad.`,
        impact: "medium",
      });
    }
  }

  // Sugerir reducir coste si hay empleados caros asignados en exceso
  const expensive = [...metas.values()]
    .filter((m) => (m.emp.hourly_cost ?? 0) > 15 && m.weekMinutes > 0)
    .sort((a, b) => (b.emp.hourly_cost ?? 0) - (a.emp.hourly_cost ?? 0));
  if (expensive.length > 0 && employees.length > 3) {
    const top = expensive[0];
    suggestions.push({
      action: "reduce_cost",
      description: `${top.emp.first_name} tiene el coste más alto (${top.emp.hourly_cost}€/h) con ${(top.weekMinutes / 60).toFixed(1)}h asignadas. Intercambiar algún turno con empleados más económicos puede ahorrar costes.`,
      impact: "low",
    });
  }

  // Siempre sugerir revisar
  if (items.length > 0) {
    suggestions.push({
      action: "review",
      description: "Revisa el cuadrante antes de publicar. Puedes arrastrar turnos entre empleados o editar horas manualmente.",
      impact: "low",
    });
  }

  return suggestions;
}
