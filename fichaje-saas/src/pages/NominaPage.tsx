import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Euro, Moon, Sun, Calendar, AlertTriangle } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/lib/supabase";
import { isDemoMode, DEMO_EMPLOYEES, getDemoReportFichajes } from "@/lib/demo";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils";
import type { Employee, Fichaje, LaborLawES, Profile } from "@/types";

const DEMO_LAW: LaborLawES = {
  id: "law-1", organization_id: "", convenio: "hosteleria",
  max_hours_year: 1826, max_hours_day: 9, max_hours_week: 40,
  max_overtime_hours_year: 80, min_rest_daily_h: 12, min_rest_weekly_h: 36,
  min_break_after_hours: 6, min_break_minutes: 15,
  sunday_surcharge_pct: 0, holiday_surcharge_pct: 75,
  national_holidays: ["2026-01-01","2026-01-06","2026-04-02","2026-04-03","2026-05-01","2026-08-15","2026-10-12","2026-11-01","2026-12-06","2026-12-08","2026-12-25"],
  regional_holidays: [], night_start: "22:00", night_end: "06:00",
  night_surcharge_pct: 25, overtime_first_hours: 8, overtime_first_pct: 25,
  overtime_after_pct: 50, vacation_days_year: 30, vacation_accrual_start: "hire_date",
  trial_period_days: 60, active: true,
};

function timeToMin(t: string) { const [h, m] = t.split(":").map(Number); return h * 60 + (m || 0); }

function nightMinutes(clockIn: string, clockOut: string | null, nightStart: string, nightEnd: string) {
  if (!clockOut) return 0;
  const inH = new Date(clockIn).getHours();
  const inM = new Date(clockIn).getMinutes();
  const outH = new Date(clockOut).getHours();
  const outM = new Date(clockOut).getMinutes();
  const ns = timeToMin(nightStart);
  const ne = timeToMin(nightEnd);
  let nightMins = 0;
  // Simplified: count minutes in 22:00-06:00 range
  for (let m = inH * 60 + inM; m < outH * 60 + outM + (outH < inH ? 1440 : 0); m++) {
    const hour = m % 1440;
    if (hour >= ns || hour < ne) nightMins++;
  }
  return nightMins;
}

export default function NominaPage({ profile }: { profile: Profile }) {
  const orgId = profile.organization_id!;
  const demo = isDemoMode();
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));

  const monthStart = `${month}-01`;
  const monthEnd = format(endOfMonth(new Date(`${month}-01`)), "yyyy-MM-dd");

  const { data: employees = [] } = useQuery({
    queryKey: ["employees", orgId],
    queryFn: async () => { if (demo) return DEMO_EMPLOYEES; const { data } = await supabase.from("employees").select("*").eq("organization_id", orgId).eq("active", true).order("first_name"); return (data as Employee[]) ?? []; },
  });

  const { data: fichajes = [] } = useQuery({
    queryKey: ["nomina-fichajes", orgId, monthStart, monthEnd],
    queryFn: async () => {
      if (demo) return getDemoReportFichajes(monthStart, monthEnd);
      const { data } = await supabase.from("clock_sessions").select("*").eq("organization_id", orgId).gte("work_date", monthStart).lte("work_date", monthEnd);
      return (data as Fichaje[]) ?? [];
    },
  });

  const { data: law } = useQuery({
    queryKey: ["labor-law-es", orgId],
    queryFn: async () => { if (demo) return DEMO_LAW; const { data } = await supabase.from("labor_law_es").select("*").eq("organization_id", orgId).maybeSingle(); return (data as LaborLawES | null) ?? DEMO_LAW; },
  });

  const holidays = useMemo(() => new Set([...(law?.national_holidays ?? []), ...(law?.regional_holidays ?? [])]), [law]);

  const payroll = useMemo(() => {
    return employees.map((emp) => {
      const empF = fichajes.filter((f) => f.employee_id === emp.id && f.status === "closed");
      const totalMin = empF.reduce((s, f) => s + (f.worked_minutes ?? 0), 0);
      const rate = emp.hourly_cost ?? 0;
      const contractWeeklyMin = (emp.contract_hours_week ?? 40) * 60;
      const weeksInMonth = 4.33;
      const contractMonthlyMin = contractWeeklyMin * weeksInMonth;
      const overtimeMin = Math.max(0, totalMin - contractMonthlyMin);

      // Nocturnidad
      let nightMin = 0;
      for (const f of empF) {
        nightMin += nightMinutes(f.clock_in_at, f.clock_out_at, law?.night_start ?? "22:00", law?.night_end ?? "06:00");
      }

      // Festivos
      const holidayMin = empF.filter((f) => holidays.has(f.work_date)).reduce((s, f) => s + (f.worked_minutes ?? 0), 0);

      // Domingos
      const sundayMin = empF.filter((f) => new Date(f.work_date + "T00:00:00").getDay() === 0).reduce((s, f) => s + (f.worked_minutes ?? 0), 0);

      // Costes
      const baseCost = (totalMin / 60) * rate;
      const overtimeCost = (overtimeMin / 60) * rate * (1 + (law?.overtime_first_pct ?? 25) / 100);
      const nightCost = (nightMin / 60) * rate * ((law?.night_surcharge_pct ?? 25) / 100);
      const holidayCost = (holidayMin / 60) * rate * ((law?.holiday_surcharge_pct ?? 75) / 100);
      const sundayCost = (sundayMin / 60) * rate * ((law?.sunday_surcharge_pct ?? 0) / 100);
      const totalCost = baseCost + nightCost + holidayCost + sundayCost;

      return {
        emp, totalMin, overtimeMin, nightMin, holidayMin, sundayMin,
        baseCost, overtimeCost, nightCost, holidayCost, sundayCost, totalCost,
        sessions: empF.length,
      };
    }).sort((a, b) => b.totalCost - a.totalCost);
  }, [employees, fichajes, law, holidays]);

  const totals = useMemo(() => ({
    hours: payroll.reduce((s, p) => s + p.totalMin, 0) / 60,
    overtime: payroll.reduce((s, p) => s + p.overtimeMin, 0) / 60,
    night: payroll.reduce((s, p) => s + p.nightMin, 0) / 60,
    holiday: payroll.reduce((s, p) => s + p.holidayMin, 0) / 60,
    cost: payroll.reduce((s, p) => s + p.totalCost, 0),
    nightCost: payroll.reduce((s, p) => s + p.nightCost, 0),
    holidayCost: payroll.reduce((s, p) => s + p.holidayCost, 0),
  }), [payroll]);

  function exportCSV() {
    const h = ["Empleado","Puesto","Horas totales","H. Extra","H. Nocturnas","H. Festivos","H. Domingos","Coste base","Plus nocturno","Plus festivo","Coste total"];
    const rows = payroll.map((p) => [
      `${p.emp.first_name} ${p.emp.last_name ?? ""}`, p.emp.position ?? "",
      (p.totalMin/60).toFixed(1), (p.overtimeMin/60).toFixed(1), (p.nightMin/60).toFixed(1),
      (p.holidayMin/60).toFixed(1), (p.sundayMin/60).toFixed(1),
      p.baseCost.toFixed(2), p.nightCost.toFixed(2), p.holidayCost.toFixed(2), p.totalCost.toFixed(2),
    ]);
    const csv = [h.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `nomina-${month}.csv`; a.click();
  }

  return (
    <div>
      <PageHeader title="Preparaci\u00f3n de n\u00f3mina" description={`Variables calculadas seg\u00fan convenio ${law?.convenio ?? "hosteler\u00eda"} ES`} actions={
        <Button variant="secondary" onClick={exportCSV}><Download className="h-4 w-4" /> Exportar CSV</Button>
      } />

      <div className="flex gap-2 mb-6">
        <input type="month" className="h-9 px-3 rounded-lg border border-slate-200 text-sm" value={month} onChange={(e) => setMonth(e.target.value)} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="kpi"><div className="kpi-label"><Sun className="h-3 w-3 inline mr-1" />Horas totales</div><div className="kpi-value">{totals.hours.toFixed(1)}h</div></div>
        <div className="kpi"><div className="kpi-label"><Moon className="h-3 w-3 inline mr-1" />H. nocturnas</div><div className="kpi-value">{totals.night.toFixed(1)}h</div><div className="text-[10px] text-slate-500 mt-1">Plus: {formatMoney(totals.nightCost)}</div></div>
        <div className="kpi"><div className="kpi-label"><Calendar className="h-3 w-3 inline mr-1" />H. festivos</div><div className="kpi-value">{totals.holiday.toFixed(1)}h</div><div className="text-[10px] text-slate-500 mt-1">Plus: {formatMoney(totals.holidayCost)}</div></div>
        <div className="kpi"><div className="kpi-label"><Euro className="h-3 w-3 inline mr-1" />Coste total</div><div className="kpi-value">{formatMoney(totals.cost)}</div></div>
      </div>

      {totals.overtime > 0 && (
        <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span><strong>{totals.overtime.toFixed(1)}h extra</strong> este mes. L\u00edmite anual seg\u00fan convenio: {law?.max_overtime_hours_year ?? 80}h.</span>
        </div>
      )}

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Euro className="h-4 w-4 text-brand-500" /> Desglose por empleado</CardTitle></CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3 font-semibold">Empleado</th>
                <th className="px-3 py-3 font-semibold text-center">Horas</th>
                <th className="px-3 py-3 font-semibold text-center">Extra</th>
                <th className="px-3 py-3 font-semibold text-center">Nocturnas</th>
                <th className="px-3 py-3 font-semibold text-center">Festivos</th>
                <th className="px-3 py-3 font-semibold text-right">Base</th>
                <th className="px-3 py-3 font-semibold text-right">Plus noct.</th>
                <th className="px-3 py-3 font-semibold text-right">Plus fest.</th>
                <th className="px-3 py-3 font-semibold text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {payroll.map((p) => (
                <tr key={p.emp.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <div className="font-semibold">{p.emp.first_name} {p.emp.last_name ?? ""}</div>
                    <div className="text-[10px] text-slate-500">{p.emp.position ?? ""} · {formatMoney(p.emp.hourly_cost)}/h</div>
                  </td>
                  <td className="px-3 py-3 text-center tabular-nums">{(p.totalMin/60).toFixed(1)}</td>
                  <td className="px-3 py-3 text-center tabular-nums">{p.overtimeMin > 0 ? <Badge variant="amber">{(p.overtimeMin/60).toFixed(1)}</Badge> : "0"}</td>
                  <td className="px-3 py-3 text-center tabular-nums">{p.nightMin > 0 ? <Badge variant="blue">{(p.nightMin/60).toFixed(1)}</Badge> : "0"}</td>
                  <td className="px-3 py-3 text-center tabular-nums">{p.holidayMin > 0 ? <Badge variant="red">{(p.holidayMin/60).toFixed(1)}</Badge> : "0"}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{formatMoney(p.baseCost)}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-blue-600">{p.nightCost > 0 ? formatMoney(p.nightCost) : "—"}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-red-600">{p.holidayCost > 0 ? formatMoney(p.holidayCost) : "—"}</td>
                  <td className="px-3 py-3 text-right tabular-nums font-bold">{formatMoney(p.totalCost)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 border-t-2 border-slate-200 font-bold">
                <td className="px-5 py-3">Total</td>
                <td className="px-3 py-3 text-center tabular-nums">{totals.hours.toFixed(1)}</td>
                <td className="px-3 py-3 text-center tabular-nums">{totals.overtime.toFixed(1)}</td>
                <td className="px-3 py-3 text-center tabular-nums">{totals.night.toFixed(1)}</td>
                <td className="px-3 py-3 text-center tabular-nums">{totals.holiday.toFixed(1)}</td>
                <td colSpan={3} />
                <td className="px-3 py-3 text-right tabular-nums">{formatMoney(totals.cost)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  );
}
