import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Check, Clock, X } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { isDemoMode, DEMO_EMPLOYEES, getDemoFichajes, getDemoShiftItems } from "@/demo";
import { supabase } from "@/shared/lib/supabase";
import { PageHeader } from "@/shared/components/PageHeader";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { formatTime, todayDate, minutesToHours } from "@/shared/lib/time";
import type { Employee, Fichaje, ShiftPlanItem, Profile } from "@/types";

function timeToMin(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

function isoToMin(iso: string) {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

interface Comparison {
  emp: Employee;
  planned: ShiftPlanItem | null;
  fichaje: Fichaje | null;
  plannedStart: number | null;
  realStart: number | null;
  diffMinutes: number | null;
  status: "on_time" | "late" | "early" | "no_show" | "no_plan" | "extra";
}

export default function PlannedVsRealPage({ profile }: { profile: Profile }) {
  const orgId = profile.organization_id!;
  const demo = isDemoMode();
  const today = todayDate();

  const { data: employees = [] } = useQuery({
    queryKey: ["employees", orgId],
    queryFn: async () => {
      if (demo) return DEMO_EMPLOYEES;
      const { data } = await supabase.from("employees").select("*").eq("organization_id", orgId).eq("active", true).order("first_name");
      return (data as Employee[]) ?? [];
    },
  });

  const { data: fichajes = [] } = useQuery({
    queryKey: ["fichajes-today", orgId, today],
    refetchInterval: 15_000,
    queryFn: async () => {
      if (demo) return getDemoFichajes();
      const { data } = await supabase.from("clock_sessions").select("*").eq("organization_id", orgId).eq("work_date", today);
      return (data as Fichaje[]) ?? [];
    },
  });

  const { data: planned = [] } = useQuery({
    queryKey: ["planned-today", orgId, today],
    queryFn: async () => {
      if (demo) return getDemoShiftItems().filter((i) => i.work_date === today);
      const { data } = await supabase.from("shift_plan_items").select("*, shift_plans!inner(organization_id)").eq("shift_plans.organization_id", orgId).eq("work_date", today);
      return (data as ShiftPlanItem[]) ?? [];
    },
  });

  const comparisons: Comparison[] = useMemo(() => {
    const result: Comparison[] = [];

    for (const emp of employees) {
      const plan = planned.find((p) => p.employee_id === emp.id);
      const fich = fichajes.find((f) => f.employee_id === emp.id);

      if (!plan && !fich) continue;

      const plannedStart = plan ? timeToMin(plan.start_time) : null;
      const realStart = fich?.clock_in_at ? isoToMin(fich.clock_in_at) : null;

      let diffMinutes: number | null = null;
      let status: Comparison["status"];

      if (plan && fich && realStart !== null && plannedStart !== null) {
        diffMinutes = realStart - plannedStart;
        if (Math.abs(diffMinutes) <= 5) status = "on_time";
        else if (diffMinutes > 5) status = "late";
        else status = "early";
      } else if (plan && !fich) {
        status = "no_show";
      } else if (!plan && fich) {
        status = "extra";
      } else {
        status = "no_plan";
      }

      result.push({ emp, planned: plan ?? null, fichaje: fich ?? null, plannedStart, realStart, diffMinutes, status });
    }

    return result.sort((a, b) => {
      const order = { no_show: 0, late: 1, extra: 2, early: 3, on_time: 4, no_plan: 5 };
      return (order[a.status] ?? 5) - (order[b.status] ?? 5);
    });
  }, [employees, planned, fichajes]);

  const statusMeta: Record<string, { label: string; variant: "red" | "amber" | "green" | "blue" | "slate"; icon: typeof Check }> = {
    on_time: { label: "Puntual", variant: "green", icon: Check },
    late: { label: "Tarde", variant: "red", icon: AlertTriangle },
    early: { label: "Antes", variant: "blue", icon: Clock },
    no_show: { label: "No fichó", variant: "red", icon: X },
    extra: { label: "Sin turno", variant: "amber", icon: AlertTriangle },
    no_plan: { label: "—", variant: "slate", icon: Clock },
  };

  const lateCount = comparisons.filter((c) => c.status === "late").length;
  const noShowCount = comparisons.filter((c) => c.status === "no_show").length;
  const onTimeCount = comparisons.filter((c) => c.status === "on_time").length;
  const punctualityRate = comparisons.length > 0 ? Math.round((onTimeCount / comparisons.filter((c) => c.status !== "extra" && c.status !== "no_plan").length) * 100) || 0 : 0;

  return (
    <div>
      <PageHeader title="Planificado vs Real" description={`${format(new Date(), "EEEE d 'de' MMMM", { locale: es })} — comparativa en vivo`} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="kpi"><div className="kpi-label">Puntualidad</div><div className={`kpi-value ${punctualityRate >= 80 ? "text-emerald-600" : punctualityRate >= 50 ? "text-amber-600" : "text-red-600"}`}>{punctualityRate}%</div></div>
        <div className="kpi"><div className="kpi-label">Puntuales</div><div className="kpi-value text-emerald-600">{onTimeCount}</div></div>
        <div className="kpi"><div className="kpi-label">Tarde</div><div className="kpi-value text-red-600">{lateCount}</div></div>
        <div className="kpi"><div className="kpi-label">No ficharon</div><div className="kpi-value text-red-600">{noShowCount}</div></div>
      </div>

      {noShowCount > 0 && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span><strong>{noShowCount} empleado(s)</strong> tienen turno planificado pero no han fichado.</span>
        </div>
      )}

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-4 w-4 text-brand-500" /> Detalle por empleado</CardTitle></CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3 font-semibold">Empleado</th>
                <th className="px-3 py-3 font-semibold text-center">Turno planificado</th>
                <th className="px-3 py-3 font-semibold text-center">Entrada real</th>
                <th className="px-3 py-3 font-semibold text-center">Diferencia</th>
                <th className="px-3 py-3 font-semibold text-center">Horas fichadas</th>
                <th className="px-3 py-3 font-semibold text-center">Estado</th>
              </tr>
            </thead>
            <tbody>
              {comparisons.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-500">No hay datos para hoy.</td></tr>
              )}
              {comparisons.map((c) => {
                const meta = statusMeta[c.status];
                return (
                  <tr key={c.emp.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: c.emp.color ?? "#0ea5e9" }}>
                          {c.emp.first_name.charAt(0)}{c.emp.last_name?.charAt(0) ?? ""}
                        </div>
                        <div>
                          <div className="font-semibold">{c.emp.first_name} {c.emp.last_name ?? ""}</div>
                          <div className="text-[10px] text-slate-500">{c.emp.position ?? ""}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center tabular-nums text-slate-600">
                      {c.planned ? `${c.planned.start_time} – ${c.planned.end_time}` : "—"}
                    </td>
                    <td className={`px-3 py-3 text-center tabular-nums font-semibold ${c.status === "late" ? "text-red-600" : c.status === "early" ? "text-blue-600" : ""}`}>
                      {c.fichaje?.clock_in_at ? formatTime(c.fichaje.clock_in_at) : "—"}
                    </td>
                    <td className="px-3 py-3 text-center tabular-nums">
                      {c.diffMinutes !== null ? (
                        <span className={c.diffMinutes > 5 ? "text-red-600 font-semibold" : c.diffMinutes < -5 ? "text-blue-600" : "text-emerald-600"}>
                          {c.diffMinutes > 0 ? "+" : ""}{c.diffMinutes} min
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-3 py-3 text-center tabular-nums">
                      {c.fichaje?.worked_minutes ? minutesToHours(c.fichaje.worked_minutes) : c.fichaje?.clock_in_at ? "en curso" : "—"}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <Badge variant={meta.variant}>{meta.label}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
