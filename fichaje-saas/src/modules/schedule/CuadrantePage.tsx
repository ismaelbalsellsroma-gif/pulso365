import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ChevronLeft, ChevronRight, Plus, Trash2, Sparkles, X,
  Copy, FileText, AlertTriangle, AlertCircle, CalendarOff,
} from "lucide-react";
import { format, startOfWeek, addDays, addWeeks, subWeeks } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/shared/lib/supabase";
import {
  isDemoMode, DEMO_EMPLOYEES, getDemoShiftPlan, getDemoShiftItems, DEMO_SHIFT_TEMPLATES,
  getDemoAbsenceRequests,
} from "@/demo";
import { DEMO_RULES } from "@/demo";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { formatMoney } from "@/shared/lib/utils";
import type {
  AbsenceRequest, Employee, LaborRules, Profile,
  ShiftPlan, ShiftPlanItem, ShiftTemplate,
} from "@/types";
import { Link } from "react-router-dom";
import { validateShift, overtimeStatusFor, type ValidationResult } from "./validation";

const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function getWeekDates(ref: Date) {
  const monday = startOfWeek(ref, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

function timeToMin(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

function shiftHours(s: string, e: string, brk: number) {
  let d = timeToMin(e) - timeToMin(s);
  if (d <= 0) d += 24 * 60;
  return Math.max(0, (d - brk) / 60);
}

function formatHM(hours: number) {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${String(h).padStart(2, "0")}h${m > 0 ? String(m).padStart(2, "0") : "00"}`;
}

const ROLE_COLORS: Record<string, string> = {
  camarero: "#FBBF24", cocinero: "#F87171", "responsable sala": "#818CF8",
  encargado: "#818CF8", limpieza: "#86EFAC", barra: "#67E8F9",
};

function roleColor(role: string | null) {
  if (!role) return "#CBD5E1";
  const key = role.toLowerCase();
  for (const [k, v] of Object.entries(ROLE_COLORS)) {
    if (key.includes(k)) return v;
  }
  return "#93C5FD";
}

const emptyItem: Partial<ShiftPlanItem> = {
  employee_id: "", work_date: "", start_time: "09:00", end_time: "17:00",
  break_minutes: 30, role: "", color: "#FBBF24", notes: "",
};

export default function CuadrantePage({ profile }: { profile: Profile }) {
  const orgId = profile.organization_id!;
  const demo = isDemoMode();
  const qc = useQueryClient();

  const [weekRef, setWeekRef] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyItem);
  const [repeatDays, setRepeatDays] = useState<boolean[]>([false, false, false, false, false, false, false]);
  const [dialogTab, setDialogTab] = useState<"turno" | "ausencia">("turno");

  const weekDates = useMemo(() => getWeekDates(weekRef), [weekRef]);
  const weekStart = format(weekDates[0], "yyyy-MM-dd");

  const { data: employees = [] } = useQuery({
    queryKey: ["employees", orgId],
    queryFn: async () => {
      if (demo) return DEMO_EMPLOYEES;
      const { data } = await supabase.from("employees").select("*").eq("organization_id", orgId).eq("active", true).order("first_name");
      return (data as Employee[]) ?? [];
    },
  });

  const { data: plan } = useQuery({
    queryKey: ["shift-plan", orgId, weekStart],
    queryFn: async () => {
      if (demo) return getDemoShiftPlan(weekStart);
      const { data } = await supabase.from("shift_plans").select("*").eq("organization_id", orgId).eq("week_start", weekStart).maybeSingle();
      return (data as ShiftPlan | null) ?? null;
    },
  });

  const { data: items = [] } = useQuery({
    queryKey: ["shift-items", plan?.id],
    enabled: !!plan,
    queryFn: async () => {
      if (demo) return getDemoShiftItems();
      const { data } = await supabase.from("shift_plan_items").select("*").eq("plan_id", plan!.id).order("sort_order");
      return (data as ShiftPlanItem[]) ?? [];
    },
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["shift-templates", orgId],
    queryFn: async () => {
      if (demo) return DEMO_SHIFT_TEMPLATES;
      const { data } = await supabase.from("shift_templates").select("*").eq("organization_id", orgId).eq("active", true).order("name");
      return (data as ShiftTemplate[]) ?? [];
    },
  });

  // Ausencias aprobadas (para validar turnos)
  const { data: approvedAbsences = [] } = useQuery({
    queryKey: ["absences-approved", orgId],
    queryFn: async () => {
      if (demo) return getDemoAbsenceRequests().filter((a) => a.status === "approved");
      const { data } = await supabase
        .from("absence_requests").select("*")
        .eq("organization_id", orgId).eq("status", "approved");
      return (data as AbsenceRequest[]) ?? [];
    },
  });

  // Reglas laborales (para validar duraciones, descansos, etc.)
  const { data: laborRules } = useQuery({
    queryKey: ["labor-rules", orgId],
    queryFn: async () => {
      if (demo) return DEMO_RULES;
      const { data } = await supabase.from("labor_rules").select("*").eq("organization_id", orgId).maybeSingle();
      return (data as LaborRules | null) ?? DEMO_RULES;
    },
  });

  // Validaciones del turno actual (en el modal)
  const validations: ValidationResult[] = useMemo(() => {
    if (!dialogOpen || !form.employee_id || !form.work_date) return [];
    return validateShift(
      {
        id: editId ?? undefined,
        employee_id: form.employee_id!,
        work_date: form.work_date!,
        start_time: form.start_time ?? "09:00",
        end_time: form.end_time ?? "17:00",
        break_minutes: form.break_minutes ?? 0,
        role: form.role ?? null,
      },
      { employees, existingShifts: items, approvedAbsences, laborRules: laborRules ?? null }
    );
  }, [dialogOpen, form, editId, employees, items, approvedAbsences, laborRules]);

  const blockingViolations = validations.filter((v) => v.blocking);

  const saveMut = useMutation({
    mutationFn: async () => {
      if (demo) { toast.info("Modo demo — los cambios no se guardan"); return; }
      let planId = plan?.id;
      if (!planId) {
        const { data } = await supabase.from("shift_plans").insert({ organization_id: orgId, week_start: weekStart, status: "draft" }).select().single();
        planId = data?.id;
        qc.invalidateQueries({ queryKey: ["shift-plan"] });
      }
      const payload = { ...form, plan_id: planId };
      if (editId) {
        await supabase.from("shift_plan_items").update(payload).eq("id", editId);
      } else {
        await supabase.from("shift_plan_items").insert(payload);
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["shift-items"] }); setDialogOpen(false); toast.success(editId ? "Turno actualizado" : "Turno asignado"); },
    onError: (e: any) => toast.error(e?.message ?? "Error"),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      if (demo) return;
      await supabase.from("shift_plan_items").delete().eq("id", id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["shift-items"] }); toast.success("Turno eliminado"); },
  });

  const publishMut = useMutation({
    mutationFn: async () => {
      if (demo) { toast.success("Cuadrante publicado (demo)"); return; }
      if (!plan) return;
      await supabase.from("shift_plans").update({ status: "published", published_at: new Date().toISOString(), published_by: profile.id }).eq("id", plan.id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["shift-plan"] }); toast.success("Cuadrante publicado"); },
  });

  function openNew(empId: string, fecha: string) {
    setEditId(null);
    setForm({ ...emptyItem, employee_id: empId, work_date: fecha });
    setRepeatDays([false, false, false, false, false, false, false]);
    setDialogTab("turno");
    setDialogOpen(true);
  }
  function openEdit(item: ShiftPlanItem) {
    setEditId(item.id);
    setForm({ employee_id: item.employee_id, work_date: item.work_date, start_time: item.start_time, end_time: item.end_time, break_minutes: item.break_minutes, role: item.role ?? "", color: item.color, notes: item.notes ?? "" });
    setDialogTab("turno");
    setDialogOpen(true);
  }
  function applyTemplate(t: ShiftTemplate) {
    setForm((f) => ({ ...f, start_time: t.start_time, end_time: t.end_time, break_minutes: t.break_minutes, color: t.color, role: t.roles[0] ?? f.role }));
  }

  const empWeekHours = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items) {
      const h = shiftHours(item.start_time, item.end_time, item.break_minutes);
      map.set(item.employee_id, (map.get(item.employee_id) ?? 0) + h);
    }
    return map;
  }, [items]);

  const dayTotals = useMemo(() => {
    return weekDates.map((d) => {
      const dateStr = format(d, "yyyy-MM-dd");
      const dayItems = items.filter((it) => it.work_date === dateStr);
      const hours = dayItems.reduce((s, it) => s + shiftHours(it.start_time, it.end_time, it.break_minutes), 0);
      const empCount = new Set(dayItems.map((it) => it.employee_id)).size;
      return { hours, empCount };
    });
  }, [items, weekDates]);

  const totalWeekHours = dayTotals.reduce((s, d) => s + d.hours, 0);
  const totalWeekCost = items.reduce((s, it) => {
    const emp = employees.find((e) => e.id === it.employee_id);
    return s + shiftHours(it.start_time, it.end_time, it.break_minutes) * (emp?.hourly_cost ?? 0);
  }, 0);

  const unassignedItems = items.filter((it) => it.is_open_shift);
  const todayStr = format(new Date(), "yyyy-MM-dd");

  // Helper: \u00bfest\u00e1 ese empleado de ausencia ese d\u00eda?
  function absenceOnDate(employeeId: string, dateStr: string): AbsenceRequest | null {
    return approvedAbsences.find(
      (a) => a.employee_id === employeeId && dateStr >= a.start_date && dateStr <= a.end_date
    ) ?? null;
  }

  // Overtime status del empleado en esta semana
  function empOvertimeStatus(employeeId: string, contractWeekly: number | null) {
    return overtimeStatusFor(
      employeeId,
      format(weekDates[0], "yyyy-MM-dd"),
      format(weekDates[6], "yyyy-MM-dd"),
      contractWeekly,
      items
    );
  }

  return (
    <div>
      {/* TOP BAR */}
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setWeekRef((d) => subWeeks(d, 1))}><ChevronLeft className="h-4 w-4" /></Button>
            <div className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-semibold">
              {format(weekDates[0], "d MMM", { locale: es })} - {format(weekDates[6], "d MMM yyyy", { locale: es })}
            </div>
            <Button variant="ghost" size="sm" onClick={() => setWeekRef((d) => addWeeks(d, 1))}><ChevronRight className="h-4 w-4" /></Button>
            <div className="bg-slate-100 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-600">
              Semana {format(weekDates[0], "w")}
            </div>
          </div>

          <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
            {(["Día", "Semana", "Mes"] as const).map((v) => (
              <button key={v} className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${v === "Semana" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                {v}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Link to="/app/cuadrante-ia">
              <Button size="sm" variant="ghost" className="gap-1.5"><Sparkles className="h-3.5 w-3.5" /> IA</Button>
            </Link>
            <Button size="sm" variant="ghost" className="gap-1.5"><Copy className="h-3.5 w-3.5" /> Copiar</Button>
            {plan?.status === "draft" && items.length > 0 ? (
              <Button size="sm" variant="primary" className="gap-1.5 rounded-full px-5" onClick={() => publishMut.mutate()} disabled={publishMut.isPending}>
                Publicar la planificaci\u00f3n
              </Button>
            ) : plan?.status === "published" ? (
              <div className="text-xs text-emerald-600 font-semibold bg-emerald-50 border border-emerald-200 rounded-full px-4 py-1.5">Horario compartido</div>
            ) : (
              <Button size="sm" variant="primary" className="gap-1.5 rounded-full px-5 opacity-50" disabled>Publicar la planificaci\u00f3n</Button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm border-b border-slate-200 pb-1">
          <button className="font-semibold text-brand-600 border-b-2 border-brand-600 pb-1 px-1">Empleados</button>
          <button className="text-slate-500 hover:text-slate-700 pb-1 px-1">Puestos</button>
        </div>
      </div>

      {/* GRID */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: 900 }}>
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-3 py-2.5 text-left w-44 sticky left-0 bg-white z-10 border-r border-slate-100" />
                {weekDates.map((d, i) => {
                  const dateStr = format(d, "yyyy-MM-dd");
                  const isToday = dateStr === todayStr;
                  return (
                    <th key={i} className={`px-1 py-2.5 text-center min-w-[120px] ${isToday ? "bg-brand-50/50" : ""}`}>
                      <div className="text-xs font-medium text-slate-500">{DAYS[i]}.</div>
                      <div className={`text-sm font-semibold ${isToday ? "bg-brand-600 text-white rounded-full w-7 h-7 flex items-center justify-center mx-auto" : "text-slate-700"}`}>
                        {format(d, "d")}
                      </div>
                      <div className="text-[10px] text-slate-400">{format(d, "MMM", { locale: es })}.</div>
                    </th>
                  );
                })}
                <th className="px-2 py-2.5 text-center w-20 border-l border-slate-200 bg-slate-50">
                  <div className="text-[10px] font-semibold text-slate-500 uppercase">Total</div>
                </th>
                <th className="px-2 py-2.5 text-center w-20 bg-slate-50">
                  <div className="text-[10px] font-semibold text-slate-500 uppercase">Contadores</div>
                </th>
              </tr>
            </thead>

            <tbody>
              {/* Sin asignar */}
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <td className="px-3 py-2 sticky left-0 bg-slate-50/50 z-10 border-r border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-slate-300 flex items-center justify-center text-[10px] font-bold text-white">N/A</div>
                    <div className="text-xs font-semibold text-slate-500">Sin asignar</div>
                  </div>
                </td>
                {weekDates.map((d, i) => {
                  const dateStr = format(d, "yyyy-MM-dd");
                  const unassigned = unassignedItems.filter((it) => it.work_date === dateStr);
                  return (
                    <td key={i} className={`px-1 py-1 text-center align-top ${dateStr === todayStr ? "bg-brand-50/30" : ""}`}>
                      {unassigned.map((it) => <ShiftBlock key={it.id} item={it} onClick={() => openEdit(it)} />)}
                    </td>
                  );
                })}
                <td className="px-2 py-2 text-center border-l border-slate-200 bg-slate-50 font-mono text-xs text-slate-400">00h00</td>
                <td className="px-2 py-2 text-center bg-slate-50" />
              </tr>

              {/* Employees */}
              {employees.map((emp) => {
                const weekH = empWeekHours.get(emp.id) ?? 0;
                const contractH = emp.contract_hours_week ?? 40;
                const diff = weekH - contractH;

                return (
                  <tr key={emp.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="px-3 py-2 sticky left-0 bg-white z-10 border-r border-slate-100">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ backgroundColor: emp.color ?? "#0ea5e9" }}>
                          {emp.first_name.charAt(0)}{emp.last_name?.charAt(0) ?? ""}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-900 truncate">{emp.first_name} {emp.last_name ?? ""}</div>
                          <div className="text-[10px] text-slate-400">{contractH}h</div>
                        </div>
                      </div>
                    </td>

                    {weekDates.map((d, i) => {
                      const dateStr = format(d, "yyyy-MM-dd");
                      const dayItems = items.filter((it) => it.employee_id === emp.id && it.work_date === dateStr && !it.is_open_shift);
                      const isToday = dateStr === todayStr;
                      const absence = absenceOnDate(emp.id, dateStr);
                      return (
                        <td key={i} className={`px-1 py-1 text-center align-top ${isToday ? "bg-brand-50/30" : ""}`}>
                          {absence ? (
                            <div className="w-full h-10 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-semibold flex items-center justify-center gap-1" title={`Ausencia aprobada: ${absence.reason ?? ""}`}>
                              <CalendarOff className="h-3 w-3" />
                              Ausente
                            </div>
                          ) : dayItems.length > 0 ? (
                            dayItems.map((it) => <ShiftBlock key={it.id} item={it} onClick={() => openEdit(it)} />)
                          ) : (
                            <button onClick={() => openNew(emp.id, dateStr)} className="w-full h-10 rounded-lg border border-dashed border-slate-200 hover:border-brand-300 hover:bg-brand-50/30 transition-all text-slate-300 hover:text-brand-500 text-xs flex items-center justify-center">
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </td>
                      );
                    })}

                    <td className={`px-2 py-2 text-center border-l border-slate-200 ${
                      empOvertimeStatus(emp.id, contractH) === "danger" ? "bg-red-50" :
                      empOvertimeStatus(emp.id, contractH) === "warning" ? "bg-amber-50" : "bg-slate-50"
                    }`}>
                      <div className={`font-mono text-xs font-bold ${
                        empOvertimeStatus(emp.id, contractH) === "danger" ? "text-red-700" :
                        empOvertimeStatus(emp.id, contractH) === "warning" ? "text-amber-700" : "text-slate-800"
                      }`}>{formatHM(weekH)}</div>
                    </td>
                    <td className="px-2 py-2 text-center bg-slate-50">
                      {diff > 0 && <div className="text-[10px] font-bold text-amber-600">+ {formatHM(diff)}</div>}
                      {diff < -2 && <div className="text-[10px] font-semibold text-blue-500">&mdash; {formatHM(Math.abs(diff))}</div>}
                    </td>
                  </tr>
                );
              })}

              {employees.length === 0 && (
                <tr><td colSpan={10} className="text-center py-10 text-slate-500 text-sm">No hay empleados. Crea el primero en Empleados.</td></tr>
              )}
            </tbody>

            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50">
                <td className="px-3 py-2.5 sticky left-0 bg-slate-50 z-10 border-r border-slate-100">
                  <div className="text-[10px] font-semibold text-slate-500 uppercase">Total d\u00eda</div>
                </td>
                {dayTotals.map((dt, i) => (
                  <td key={i} className="px-1 py-2.5 text-center">
                    <div className="font-mono text-xs font-bold text-slate-700">{formatHM(dt.hours)}</div>
                    <div className="text-[10px] text-slate-400">{dt.empCount} emp.</div>
                  </td>
                ))}
                <td className="px-2 py-2.5 text-center border-l border-slate-200">
                  <div className="font-mono text-xs font-bold text-slate-900">{formatHM(totalWeekHours)}</div>
                </td>
                <td className="px-2 py-2.5 text-center">
                  <div className="text-[10px] font-semibold text-slate-600">{formatMoney(totalWeekCost)}</div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {plan?.ai_explanation && (
        <div className="mt-4 bg-white border border-brand-100 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-brand-700"><Sparkles className="h-4 w-4" /> Explicaci\u00f3n de la IA</div>
          <div className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">{plan.ai_explanation}</div>
        </div>
      )}

      {/* DIALOG */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-start justify-center pt-[10vh] p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-elevated max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg text-slate-900">{editId ? "Editar turno" : "A\u00f1adir un turno de trabajo"}</h3>
                  <div className="text-sm text-slate-500">
                    {employees.find((e) => e.id === form.employee_id)?.first_name ?? ""} {employees.find((e) => e.id === form.employee_id)?.last_name ?? ""} &middot; {form.work_date ? format(new Date(form.work_date + "T00:00:00"), "EEEE d 'de' MMMM yyyy", { locale: es }) : ""}
                  </div>
                </div>
                <button onClick={() => setDialogOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
              </div>
              <div className="flex gap-4 mt-3 border-b border-slate-200 -mb-[1px]">
                <button onClick={() => setDialogTab("turno")} className={`pb-2 text-sm font-semibold ${dialogTab === "turno" ? "text-brand-600 border-b-2 border-brand-600" : "text-slate-400"}`}>Turno</button>
                <button onClick={() => setDialogTab("ausencia")} className={`pb-2 text-sm font-semibold ${dialogTab === "ausencia" ? "text-brand-600 border-b-2 border-brand-600" : "text-slate-400"}`}>Ausencia</button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {dialogTab === "turno" ? (
                <>
                  <div>
                    <Label className="text-slate-500 text-xs">Horarios</Label>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <Input type="time" className="w-28" value={form.start_time ?? ""} onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))} />
                      <span className="text-slate-400">&mdash;</span>
                      <Input type="time" className="w-28" value={form.end_time ?? ""} onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))} />
                      <div className="text-xs text-slate-400 flex items-center gap-1">
                        <span className="text-slate-500 font-semibold">Descanso</span>
                        <Input type="number" min={0} className="w-16" value={form.break_minutes ?? 0} onChange={(e) => setForm((f) => ({ ...f, break_minutes: parseInt(e.target.value) || 0 }))} />
                        <span>min</span>
                      </div>
                      <div className="ml-auto text-xs text-slate-500">
                        Duraci\u00f3n: <span className="font-semibold">{formatHM(shiftHours(form.start_time ?? "09:00", form.end_time ?? "17:00", form.break_minutes ?? 0))}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-slate-500 text-xs">Puesto</Label>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="h-6 w-6 rounded-full shrink-0" style={{ backgroundColor: roleColor(form.role ?? null) }} />
                      <select className="flex-1 h-10 px-3 bg-white rounded-lg border border-slate-200 text-sm" value={form.role ?? ""} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value, color: roleColor(e.target.value) }))}>
                        <option value="">Seleccionar puesto...</option>
                        <option value="Camarero">Camarero</option>
                        <option value="Cocinero">Cocinero</option>
                        <option value="Responsable Sala">Responsable Sala</option>
                        <option value="Limpieza">Limpieza</option>
                        <option value="Barra">Barra</option>
                        <option value="Encargado">Encargado</option>
                      </select>
                    </div>
                  </div>

                  {templates.length > 0 && (
                    <div>
                      <Label className="text-slate-500 text-xs">Plantilla r\u00e1pida</Label>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {templates.map((t) => (
                          <button key={t.id} onClick={() => applyTemplate(t)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white hover:opacity-80" style={{ backgroundColor: t.color }}>{t.name}</button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <Label className="text-slate-500 text-xs">Tareas</Label>
                    <button className="mt-1.5 text-sm text-slate-400 hover:text-brand-600 flex items-center gap-1"><Plus className="h-3 w-3" /> A\u00f1adir una tarea</button>
                  </div>

                  <div>
                    <Label className="text-slate-500 text-xs">Notas</Label>
                    <textarea className="mt-1.5 w-full h-16 px-3 py-2 rounded-lg border border-slate-200 text-sm resize-none placeholder:text-slate-300" placeholder="A\u00f1adir una nota" value={form.notes ?? ""} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
                  </div>

                  {!editId && (
                    <div>
                      <Label className="text-slate-500 text-xs">Repetir turno</Label>
                      <div className="flex items-center gap-2 mt-2">
                        {DAYS.map((d, i) => (
                          <button key={i} onClick={() => setRepeatDays((r) => r.map((v, j) => j === i ? !v : v))}
                            className={`h-8 w-8 rounded-full text-xs font-semibold transition-colors ${repeatDays[i] ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                            {d.slice(0, 2)}
                          </button>
                        ))}
                        <button onClick={() => setRepeatDays([true, true, true, true, true, true, true])} className="text-xs text-brand-600 font-semibold ml-2 hover:underline">Seleccionar todo</button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-6 text-slate-500 text-sm">
                  Para crear una ausencia, ve a la secci\u00f3n <Link to="/app/ausencias" className="text-brand-600 font-semibold hover:underline">Ausencias</Link>.
                </div>
              )}

              {/* Panel de validaciones */}
              {dialogTab === "turno" && validations.length > 0 && (
                <div className="space-y-1.5 mt-2">
                  {validations.map((v, i) => (
                    <div
                      key={i}
                      className={`flex items-start gap-2 rounded-lg p-2.5 text-xs ${
                        v.severity === "error"
                          ? "bg-red-50 border border-red-200 text-red-800"
                          : "bg-amber-50 border border-amber-200 text-amber-800"
                      }`}
                    >
                      {v.severity === "error" ? (
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      )}
                      <span className="font-medium">{v.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {dialogTab === "turno" && (
              <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
                <div>
                  {editId && <Button variant="danger" size="sm" onClick={() => { delMut.mutate(editId); setDialogOpen(false); }}><Trash2 className="h-3.5 w-3.5" /> Eliminar</Button>}
                  {!editId && <button className="text-sm text-brand-600 font-semibold hover:underline">+ A\u00f1adir otro turno</button>}
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                  <Button
                    onClick={() => saveMut.mutate()}
                    disabled={saveMut.isPending || blockingViolations.length > 0}
                    title={blockingViolations.length > 0 ? "Resuelve los conflictos para guardar" : ""}
                  >
                    {saveMut.isPending ? "Guardando..." : "Guardar"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ShiftBlock({ item, onClick }: { item: ShiftPlanItem; onClick: () => void }) {
  const h = shiftHours(item.start_time, item.end_time, item.break_minutes);
  const bg = roleColor(item.role);

  return (
    <button onClick={onClick}
      className="w-full rounded-lg px-2 py-1.5 mb-0.5 text-left cursor-pointer hover:opacity-85 transition-opacity border-l-[3px] relative group"
      style={{ borderColor: bg, backgroundColor: bg + "22" }}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-slate-800">{item.start_time} - {item.end_time}</span>
        <span className="text-[10px] font-semibold text-slate-500 ml-1">{formatHM(h)}</span>
      </div>
      <div className="text-[10px] font-medium" style={{ color: bg }}>{item.role ?? ""}</div>
      {item.notes && <div className="absolute top-1 right-1"><FileText className="h-3 w-3 text-slate-400" /></div>}
    </button>
  );
}
