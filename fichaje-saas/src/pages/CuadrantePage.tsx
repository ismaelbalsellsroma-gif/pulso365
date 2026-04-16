import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ChevronLeft, ChevronRight, Copy, Plus, Trash2, Sparkles, Send, X,
} from "lucide-react";
import { format, startOfWeek, addDays, addWeeks, subWeeks } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/lib/supabase";
import {
  isDemoMode, DEMO_EMPLOYEES, getDemoShiftPlan, getDemoShiftItems, DEMO_SHIFT_TEMPLATES,
} from "@/lib/demo";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/lib/utils";
import type { Employee, ShiftPlan, ShiftPlanItem, ShiftTemplate, Profile } from "@/types";
import { Link } from "react-router-dom";

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

const emptyItem: Partial<ShiftPlanItem> = {
  employee_id: "", work_date: "", start_time: "09:00", end_time: "17:00",
  break_minutes: 0, role: "", color: "#0ea5e9", notes: "",
};

export default function CuadrantePage({ profile }: { profile: Profile }) {
  const orgId = profile.organization_id!;
  const demo = isDemoMode();
  const qc = useQueryClient();

  const [weekRef, setWeekRef] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyItem);

  const weekDates = useMemo(() => getWeekDates(weekRef), [weekRef]);
  const weekStart = format(weekDates[0], "yyyy-MM-dd");
  const weekEnd = format(weekDates[6], "yyyy-MM-dd");

  // ─── queries ────────────────────────────────────────────────────────────

  const { data: employees = [] } = useQuery({
    queryKey: ["employees", orgId],
    queryFn: async () => {
      if (demo) return DEMO_EMPLOYEES;
      const { data, error } = await supabase.from("employees").select("*")
        .eq("organization_id", orgId).eq("active", true).order("first_name");
      if (error) throw error;
      return (data as Employee[]) ?? [];
    },
  });

  const { data: plan } = useQuery({
    queryKey: ["shift-plan", orgId, weekStart],
    queryFn: async () => {
      if (demo) return getDemoShiftPlan(weekStart);
      const { data, error } = await supabase.from("shift_plans").select("*")
        .eq("organization_id", orgId).eq("week_start", weekStart).maybeSingle();
      if (error) throw error;
      return (data as ShiftPlan | null) ?? null;
    },
  });

  const { data: items = [] } = useQuery({
    queryKey: ["shift-items", plan?.id],
    enabled: !!plan,
    queryFn: async () => {
      if (demo) return getDemoShiftItems();
      const { data, error } = await supabase.from("shift_plan_items").select("*")
        .eq("plan_id", plan!.id).order("sort_order");
      if (error) throw error;
      return (data as ShiftPlanItem[]) ?? [];
    },
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["shift-templates", orgId],
    queryFn: async () => {
      if (demo) return DEMO_SHIFT_TEMPLATES;
      const { data, error } = await supabase.from("shift_templates").select("*")
        .eq("organization_id", orgId).eq("active", true).order("name");
      if (error) throw error;
      return (data as ShiftTemplate[]) ?? [];
    },
  });

  // ─── mutations ──────────────────────────────────────────────────────────

  const ensurePlan = async (): Promise<string> => {
    if (plan) return plan.id;
    const { data, error } = await supabase.from("shift_plans").insert({
      organization_id: orgId, week_start: weekStart, status: "draft",
    }).select().single();
    if (error) throw error;
    qc.invalidateQueries({ queryKey: ["shift-plan"] });
    return data.id;
  };

  const saveMut = useMutation({
    mutationFn: async () => {
      if (demo) { toast.info("Modo demo — los cambios no se guardan"); return; }
      const planId = await ensurePlan();
      const payload = { ...form, plan_id: planId };
      if (editId) {
        const { error } = await supabase.from("shift_plan_items").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("shift_plan_items").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shift-items"] });
      setDialogOpen(false);
      toast.success(editId ? "Turno actualizado" : "Turno asignado");
    },
    onError: (e: any) => toast.error(e?.message ?? "Error"),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      if (demo) { toast.info("Modo demo"); return; }
      const { error } = await supabase.from("shift_plan_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["shift-items"] }); toast.success("Turno eliminado"); },
  });

  const publishMut = useMutation({
    mutationFn: async () => {
      if (demo) { toast.success("Cuadrante publicado (demo)"); return; }
      if (!plan) return;
      const { error } = await supabase.from("shift_plans").update({
        status: "published", published_at: new Date().toISOString(), published_by: profile.id,
      }).eq("id", plan.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["shift-plan"] }); toast.success("Cuadrante publicado"); },
  });

  // ─── handlers ───────────────────────────────────────────────────────────

  function openNew(empId: string, fecha: string) {
    setEditId(null);
    setForm({ ...emptyItem, employee_id: empId, work_date: fecha });
    setDialogOpen(true);
  }
  function openEdit(item: ShiftPlanItem) {
    setEditId(item.id);
    setForm({
      employee_id: item.employee_id, work_date: item.work_date,
      start_time: item.start_time, end_time: item.end_time,
      break_minutes: item.break_minutes, role: item.role ?? "",
      color: item.color, notes: item.notes ?? "",
    });
    setDialogOpen(true);
  }
  function applyTemplate(t: ShiftTemplate) {
    setForm((f) => ({ ...f, start_time: t.start_time, end_time: t.end_time, break_minutes: t.break_minutes, color: t.color }));
  }

  // ─── KPIs ───────────────────────────────────────────────────────────────

  const totalHours = items.reduce((s, i) => s + shiftHours(i.start_time, i.end_time, i.break_minutes), 0);
  const totalCost = items.reduce((s, i) => {
    const emp = employees.find((e) => e.id === i.employee_id);
    return s + shiftHours(i.start_time, i.end_time, i.break_minutes) * (emp?.hourly_cost ?? 0);
  }, 0);

  return (
    <div>
      <PageHeader
        title="Cuadrante semanal"
        description="Planifica y publica los turnos del equipo"
        actions={
          <div className="flex gap-2 flex-wrap">
            <Link to="/app/cuadrante-ia">
              <Button variant="primary" className="gap-1.5">
                <Sparkles className="h-4 w-4" /> Generar con IA
              </Button>
            </Link>
            {plan?.status === "draft" && items.length > 0 && (
              <Button variant="success" onClick={() => publishMut.mutate()} disabled={publishMut.isPending}>
                <Send className="h-4 w-4" /> Publicar
              </Button>
            )}
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="kpi"><div className="kpi-label">Horas planificadas</div><div className="kpi-value">{totalHours.toFixed(1)}h</div></div>
        <div className="kpi"><div className="kpi-label">Coste estimado</div><div className="kpi-value">{formatMoney(totalCost)}</div></div>
        <div className="kpi"><div className="kpi-label">Empleados</div><div className="kpi-value">{employees.length}</div></div>
        <div className="kpi"><div className="kpi-label">Estado</div><div className="kpi-value">
          <Badge variant={plan?.status === "published" ? "green" : plan?.status === "draft" ? "amber" : "slate"}>
            {plan?.status === "published" ? "Publicado" : plan?.status === "draft" ? "Borrador" : "Sin plan"}
          </Badge>
        </div></div>
      </div>

      {/* Navegación de semanas */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="sm" onClick={() => setWeekRef((d) => subWeeks(d, 1))}><ChevronLeft className="h-4 w-4" /></Button>
        <span className="text-sm font-semibold">
          {format(weekDates[0], "d MMM", { locale: es })} — {format(weekDates[6], "d MMM yyyy", { locale: es })}
        </span>
        <Button variant="ghost" size="sm" onClick={() => setWeekRef((d) => addWeeks(d, 1))}><ChevronRight className="h-4 w-4" /></Button>
      </div>

      {/* Grid */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-40 sticky left-0 bg-slate-50 z-10">Empleado</th>
                {weekDates.map((d, i) => (
                  <th key={i} className="px-2 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 min-w-[120px]">
                    <div>{DAYS[i]}</div>
                    <div className="text-[10px] font-normal">{format(d, "d MMM", { locale: es })}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-medium sticky left-0 bg-white z-10">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: emp.color ?? "#0ea5e9" }}>
                        {emp.first_name.charAt(0)}{emp.last_name?.charAt(0) ?? ""}
                      </div>
                      <div>
                        <div className="text-xs font-semibold">{emp.first_name} {emp.last_name ?? ""}</div>
                        <div className="text-[10px] text-slate-500">{emp.position ?? ""}</div>
                      </div>
                    </div>
                  </td>
                  {weekDates.map((d, i) => {
                    const dateStr = format(d, "yyyy-MM-dd");
                    const dayItems = items.filter((it) => it.employee_id === emp.id && it.work_date === dateStr);
                    return (
                      <td key={i} className="px-1 py-1 text-center align-top">
                        {dayItems.length > 0 ? (
                          dayItems.map((it) => (
                            <button
                              key={it.id}
                              onClick={() => openEdit(it)}
                              className="w-full rounded-lg px-2 py-1.5 mb-0.5 text-[10px] font-semibold text-white cursor-pointer hover:opacity-80 transition-opacity text-left"
                              style={{ backgroundColor: it.color || "#0ea5e9" }}
                            >
                              <div>{it.start_time}–{it.end_time}</div>
                              {it.role && <div className="opacity-75">{it.role}</div>}
                            </button>
                          ))
                        ) : (
                          <button
                            onClick={() => openNew(emp.id, dateStr)}
                            className="w-full h-10 rounded-lg border border-dashed border-slate-200 hover:bg-slate-50 transition-colors text-slate-400 text-[10px] flex items-center justify-center"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {employees.length === 0 && (
                <tr><td colSpan={8} className="text-center py-10 text-slate-500 text-sm">No hay empleados. Crea el primero en la sección Empleados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* AI explanation */}
      {plan?.ai_explanation && (
        <Card className="mt-6">
          <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-brand-500" /> Explicación de la IA</CardTitle></CardHeader>
          <div className="p-5 text-sm text-slate-700 whitespace-pre-line">{plan.ai_explanation}</div>
          {plan.ai_suggestions && plan.ai_suggestions.length > 0 && (
            <div className="px-5 pb-5 space-y-2">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sugerencias</div>
              {plan.ai_suggestions.map((s, i) => (
                <div key={i} className="flex items-start gap-3 rounded-lg bg-brand-50 border border-brand-100 p-3">
                  <Badge variant={s.impact === "high" ? "red" : s.impact === "medium" ? "amber" : "slate"} className="mt-0.5 shrink-0">{s.impact}</Badge>
                  <p className="text-sm text-slate-700">{s.description}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Dialog */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-elevated max-w-md w-full">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-lg">{editId ? "Editar turno" : "Asignar turno"}</h3>
              <button onClick={() => setDialogOpen(false)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              {templates.length > 0 && (
                <div>
                  <Label>Plantilla rápida</Label>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {templates.map((t) => (
                      <button key={t.id} onClick={() => applyTemplate(t)} className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-white hover:opacity-80" style={{ backgroundColor: t.color }}>{t.name}</button>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Inicio</Label><Input type="time" className="mt-1.5" value={form.start_time ?? ""} onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))} /></div>
                <div><Label>Fin</Label><Input type="time" className="mt-1.5" value={form.end_time ?? ""} onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Pausa (min)</Label><Input type="number" min={0} className="mt-1.5" value={form.break_minutes ?? 0} onChange={(e) => setForm((f) => ({ ...f, break_minutes: parseInt(e.target.value) || 0 }))} /></div>
                <div><Label>Rol</Label><Input className="mt-1.5" value={form.role ?? ""} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} placeholder="camarero" /></div>
                <div><Label>Color</Label><Input type="color" className="mt-1.5 h-10 p-1" value={form.color ?? "#0ea5e9"} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} /></div>
              </div>
              <div><Label>Notas</Label><Input className="mt-1.5" value={form.notes ?? ""} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Opcional" /></div>
            </div>
            <div className="px-5 py-4 border-t border-slate-200 flex justify-between">
              <div>
                {editId && <Button variant="danger" size="sm" onClick={() => { delMut.mutate(editId); setDialogOpen(false); }}><Trash2 className="h-3.5 w-3.5" /> Eliminar</Button>}
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>{saveMut.isPending ? "Guardando..." : "Guardar"}</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
