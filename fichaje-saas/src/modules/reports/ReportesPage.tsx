import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, FileText, Clock, Euro, AlertTriangle, Users } from "lucide-react";
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/shared/lib/supabase";
import { isDemoMode, DEMO_EMPLOYEES, getDemoFichajes, getDemoReportFichajes } from "@/demo";
import { PageHeader } from "@/shared/components/PageHeader";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { formatMoney } from "@/shared/lib/utils";
import { minutesToHours } from "@/shared/lib/time";
import type { Employee, Fichaje, Profile } from "@/types";

type Period = "week" | "month" | "custom";

export default function ReportesPage({ profile }: { profile: Profile }) {
  const orgId = profile.organization_id!;
  const demo = isDemoMode();
  const [period, setPeriod] = useState<Period>("week");
  const [customFrom, setCustomFrom] = useState(format(subDays(new Date(), 7), "yyyy-MM-dd"));
  const [customTo, setCustomTo] = useState(format(new Date(), "yyyy-MM-dd"));

  const dateRange = useMemo(() => {
    const now = new Date();
    if (period === "week") return { from: format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"), to: format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd") };
    if (period === "month") return { from: format(startOfMonth(now), "yyyy-MM-dd"), to: format(endOfMonth(now), "yyyy-MM-dd") };
    return { from: customFrom, to: customTo };
  }, [period, customFrom, customTo]);

  const { data: employees = [] } = useQuery({
    queryKey: ["employees", orgId],
    queryFn: async () => { if (demo) return DEMO_EMPLOYEES; const { data } = await supabase.from("employees").select("*").eq("organization_id", orgId).eq("active", true).order("first_name"); return (data as Employee[]) ?? []; },
  });

  const { data: fichajes = [] } = useQuery({
    queryKey: ["report-fichajes", orgId, dateRange.from, dateRange.to],
    queryFn: async () => {
      if (demo) return getDemoReportFichajes(dateRange.from, dateRange.to);
      const { data } = await supabase.from("clock_sessions").select("*").eq("organization_id", orgId).gte("work_date", dateRange.from).lte("work_date", dateRange.to);
      return (data as Fichaje[]) ?? [];
    },
  });

  // Métricas por empleado
  const empStats = useMemo(() => {
    return employees.map((emp) => {
      const empF = fichajes.filter((f) => f.employee_id === emp.id);
      const totalMin = empF.reduce((s, f) => s + (f.worked_minutes ?? 0), 0);
      const contractWeekly = emp.contract_hours_week ?? 40;
      const weeklyMinLimit = contractWeekly * 60;
      const overtime = Math.max(0, totalMin - weeklyMinLimit);
      const cost = (totalMin / 60) * (emp.hourly_cost ?? 0);
      const overtimeCost = (overtime / 60) * (emp.hourly_cost ?? 0) * 1.25;
      const lateCount = empF.filter((f) => {
        if (!f.clock_in_at) return false;
        const h = new Date(f.clock_in_at).getHours();
        const m = new Date(f.clock_in_at).getMinutes();
        return (h * 60 + m) > 9 * 60 + 15; // simplificado: tarde si ficha después de 9:15
      }).length;
      const daysWorked = new Set(empF.map((f) => f.work_date)).size;
      const avgHoursDay = daysWorked > 0 ? totalMin / 60 / daysWorked : 0;

      return {
        emp, totalMin, overtime, cost, overtimeCost, lateCount, daysWorked, avgHoursDay,
        sessions: empF.length,
        outsideGeofence: empF.filter((f) => f.within_geofence === false).length,
      };
    }).sort((a, b) => b.totalMin - a.totalMin);
  }, [employees, fichajes]);

  // KPIs globales
  const totalHours = empStats.reduce((s, e) => s + e.totalMin, 0) / 60;
  const totalCost = empStats.reduce((s, e) => s + e.cost, 0);
  const totalOvertime = empStats.reduce((s, e) => s + e.overtime, 0) / 60;
  const totalLate = empStats.reduce((s, e) => s + e.lateCount, 0);
  const totalOutside = empStats.reduce((s, e) => s + e.outsideGeofence, 0);

  // Exportar CSV
  function exportCSV() {
    const headers = ["Empleado", "Puesto", "Horas", "H. Extra", "Coste", "Tardanzas", "Días", "Fuera Geofence"];
    const rows = empStats.map((s) => [
      `${s.emp.first_name} ${s.emp.last_name ?? ""}`, s.emp.position ?? "", (s.totalMin / 60).toFixed(1),
      (s.overtime / 60).toFixed(1), s.cost.toFixed(2), s.lateCount, s.daysWorked, s.outsideGeofence,
    ]);
    const csv = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reporte-${dateRange.from}-${dateRange.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <PageHeader title="Reportes" description="Horas trabajadas, extras, coste laboral y tardanzas" actions={
        <Button variant="secondary" onClick={exportCSV}><Download className="h-4 w-4" /> Exportar CSV</Button>
      } />

      {/* Period selector */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(["week", "month", "custom"] as Period[]).map((p) => (
          <button key={p} onClick={() => setPeriod(p)}
            className={`px-4 h-9 rounded-lg text-sm font-semibold transition-colors ${period === p ? "bg-brand-600 text-white" : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"}`}>
            {p === "week" ? "Esta semana" : p === "month" ? "Este mes" : "Personalizado"}
          </button>
        ))}
        {period === "custom" && (
          <div className="flex items-center gap-2 ml-2">
            <input type="date" className="h-9 px-3 rounded-lg border border-slate-200 text-sm" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
            <span className="text-slate-400">→</span>
            <input type="date" className="h-9 px-3 rounded-lg border border-slate-200 text-sm" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
        <div className="kpi"><div className="kpi-label"><Clock className="h-3 w-3 inline mr-1" />Horas totales</div><div className="kpi-value">{totalHours.toFixed(1)}h</div></div>
        <div className="kpi"><div className="kpi-label"><AlertTriangle className="h-3 w-3 inline mr-1" />Horas extra</div><div className="kpi-value text-amber-600">{totalOvertime.toFixed(1)}h</div></div>
        <div className="kpi"><div className="kpi-label"><Euro className="h-3 w-3 inline mr-1" />Coste laboral</div><div className="kpi-value">{formatMoney(totalCost)}</div></div>
        <div className="kpi"><div className="kpi-label">Tardanzas</div><div className="kpi-value text-red-600">{totalLate}</div></div>
        <div className="kpi"><div className="kpi-label">Fuera geofence</div><div className="kpi-value text-red-600">{totalOutside}</div></div>
      </div>

      {/* Tabla detallada */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-4 w-4 text-brand-500" /> Detalle por empleado</CardTitle></CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3 font-semibold">Empleado</th>
                <th className="px-3 py-3 font-semibold text-center">Días</th>
                <th className="px-3 py-3 font-semibold text-center">Horas</th>
                <th className="px-3 py-3 font-semibold text-center">Media/día</th>
                <th className="px-3 py-3 font-semibold text-center">H. Extra</th>
                <th className="px-3 py-3 font-semibold text-right">Coste</th>
                <th className="px-3 py-3 font-semibold text-center">Tardanzas</th>
                <th className="px-3 py-3 font-semibold text-center">Geofence</th>
              </tr>
            </thead>
            <tbody>
              {empStats.map((s) => (
                <tr key={s.emp.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: s.emp.color ?? "#0ea5e9" }}>
                        {s.emp.first_name.charAt(0)}{s.emp.last_name?.charAt(0) ?? ""}
                      </div>
                      <div>
                        <div className="font-semibold">{s.emp.first_name} {s.emp.last_name ?? ""}</div>
                        <div className="text-[10px] text-slate-500">{s.emp.position ?? ""} · {s.emp.contract_hours_week ?? "—"}h/sem</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center tabular-nums">{s.daysWorked}</td>
                  <td className="px-3 py-3 text-center font-semibold tabular-nums">{(s.totalMin / 60).toFixed(1)}h</td>
                  <td className="px-3 py-3 text-center tabular-nums text-slate-500">{s.avgHoursDay.toFixed(1)}h</td>
                  <td className="px-3 py-3 text-center tabular-nums">
                    {s.overtime > 0 ? <Badge variant="amber">{(s.overtime / 60).toFixed(1)}h</Badge> : <span className="text-slate-400">0</span>}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums font-semibold">{formatMoney(s.cost)}</td>
                  <td className="px-3 py-3 text-center">
                    {s.lateCount > 0 ? <Badge variant="red">{s.lateCount}</Badge> : <span className="text-slate-400">0</span>}
                  </td>
                  <td className="px-3 py-3 text-center">
                    {s.outsideGeofence > 0 ? <Badge variant="red">{s.outsideGeofence}</Badge> : <span className="text-slate-400">0</span>}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 border-t-2 border-slate-200 font-semibold">
                <td className="px-5 py-3">Total</td>
                <td className="px-3 py-3 text-center tabular-nums">{empStats.reduce((s, e) => s + e.daysWorked, 0)}</td>
                <td className="px-3 py-3 text-center tabular-nums">{totalHours.toFixed(1)}h</td>
                <td className="px-3 py-3 text-center tabular-nums">—</td>
                <td className="px-3 py-3 text-center tabular-nums">{totalOvertime.toFixed(1)}h</td>
                <td className="px-3 py-3 text-right tabular-nums">{formatMoney(totalCost)}</td>
                <td className="px-3 py-3 text-center tabular-nums">{totalLate}</td>
                <td className="px-3 py-3 text-center tabular-nums">{totalOutside}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  );
}
