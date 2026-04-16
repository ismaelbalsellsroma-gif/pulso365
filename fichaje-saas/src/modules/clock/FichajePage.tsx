import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/shared/lib/supabase";
import { isDemoMode, DEMO_EMPLOYEES, getDemoFichajes } from "@/demo";
import { PageHeader } from "@/shared/components/PageHeader";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/shared/components/ui/card";
import {
  computeWorkedMinutes,
  formatLongDate,
  formatTime,
  minutesToHours,
  todayDate,
} from "@/shared/lib/time";
import { formatMoney } from "@/shared/lib/utils";
import type { Employee, Fichaje, Profile } from "@/types";

interface Props {
  profile: Profile;
}

type EmployeeState = "working" | "on_break" | "closed" | "not_clocked" | "inactive";

const stateMeta: Record<
  EmployeeState,
  { label: string; variant: "green" | "amber" | "slate" | "red" | "blue" }
> = {
  working: { label: "Trabajando", variant: "green" },
  on_break: { label: "En pausa", variant: "amber" },
  closed: { label: "Ha salido", variant: "slate" },
  not_clocked: { label: "No ha fichado", variant: "red" },
  inactive: { label: "Inactivo", variant: "slate" },
};

export default function FichajePage({ profile }: Props) {
  const orgId = profile.organization_id!;
  const demo = isDemoMode();
  const [tick, setTick] = useState(Date.now());

  useEffect(() => {
    const i = setInterval(() => setTick(Date.now()), 30_000);
    return () => clearInterval(i);
  }, []);

  const { data: employees = [] } = useQuery({
    queryKey: ["employees", orgId],
    queryFn: async () => {
      if (demo) return DEMO_EMPLOYEES;
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("organization_id", orgId)
        .eq("active", true)
        .order("first_name");
      if (error) throw error;
      return (data as Employee[]) ?? [];
    },
  });

  const { data: todayFichajes = [] } = useQuery({
    queryKey: ["fichajes", orgId, todayDate()],
    refetchInterval: demo ? false : 15_000,
    queryFn: async () => {
      if (demo) return getDemoFichajes();
      const { data, error } = await supabase
        .from("clock_sessions")
        .select("*")
        .eq("organization_id", orgId)
        .eq("work_date", todayDate());
      if (error) throw error;
      return (data as Fichaje[]) ?? [];
    },
  });

  const byEmployee = useMemo(() => {
    const map = new Map<string, Fichaje[]>();
    for (const f of todayFichajes) {
      const arr = map.get(f.employee_id) ?? [];
      arr.push(f);
      map.set(f.employee_id, arr);
    }
    return map;
  }, [todayFichajes]);

  function getState(emp: Employee): { state: EmployeeState; current?: Fichaje; total: number } {
    const list = byEmployee.get(emp.id) ?? [];
    const current =
      list.find((f) => f.status === "open" || f.status === "on_break") ?? null;
    const total = list.reduce((sum, f) => {
      const end = f.clock_out_at ?? new Date(tick).toISOString();
      return sum + computeWorkedMinutes(f.clock_in_at, end, f.break_minutes);
    }, 0);
    if (current?.status === "open") return { state: "working", current, total };
    if (current?.status === "on_break") return { state: "on_break", current, total };
    if (list.some((f) => f.status === "closed")) return { state: "closed", total };
    return { state: "not_clocked", total };
  }

  // KPIs globales
  const totalWorkedMin = useMemo(
    () =>
      todayFichajes.reduce((sum, f) => {
        const end = f.clock_out_at ?? new Date(tick).toISOString();
        return sum + computeWorkedMinutes(f.clock_in_at, end, f.break_minutes);
      }, 0),
    [todayFichajes, tick]
  );

  const laborCost = useMemo(() => {
    return todayFichajes.reduce((sum, f) => {
      const emp = employees.find((e) => e.id === f.employee_id);
      const rate = Number(emp?.hourly_cost ?? 0);
      const end = f.clock_out_at ?? new Date(tick).toISOString();
      const minutes = computeWorkedMinutes(f.clock_in_at, end, f.break_minutes);
      return sum + (minutes / 60) * rate;
    }, 0);
  }, [todayFichajes, employees, tick]);

  const working = employees.filter((e) => getState(e).state === "working").length;
  const pausing = employees.filter((e) => getState(e).state === "on_break").length;
  const outside = employees.filter((e) => {
    const f = byEmployee.get(e.id)?.find((x) => x.status === "open");
    return f?.within_geofence === false;
  }).length;

  return (
    <div>
      <PageHeader
        title="Fichajes en vivo"
        description={formatLongDate()}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="kpi">
          <div className="kpi-label">Trabajando ahora</div>
          <div className="kpi-value">{working}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">En pausa</div>
          <div className="kpi-value">{pausing}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Horas hoy</div>
          <div className="kpi-value">{minutesToHours(totalWorkedMin)}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Coste laboral hoy</div>
          <div className="kpi-value">{formatMoney(laborCost)}</div>
        </div>
      </div>

      {outside > 0 && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
          ⚠ {outside} fichaje(s) abiertos <strong>fuera del geofence</strong> del local.
        </div>
      )}

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Empleados</CardTitle>
          <div className="text-xs text-slate-500">
            Actualización automática cada 15s
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3 font-semibold">Empleado</th>
                <th className="px-3 py-3 font-semibold text-center">Entrada</th>
                <th className="px-3 py-3 font-semibold text-center">Salida</th>
                <th className="px-3 py-3 font-semibold text-center">Horas hoy</th>
                <th className="px-3 py-3 font-semibold text-center">Geofence</th>
                <th className="px-3 py-3 font-semibold text-center">Estado</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => {
                const { state, current, total } = getState(emp);
                const meta = stateMeta[state];
                const fence = current?.within_geofence;
                return (
                  <tr
                    key={emp.id}
                    className="border-t border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                          style={{ backgroundColor: emp.color ?? "#0ea5e9" }}
                        >
                          {emp.first_name.charAt(0)}
                          {emp.last_name?.charAt(0) ?? ""}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">
                            {emp.first_name} {emp.last_name ?? ""}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {emp.position ?? "—"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center tabular-nums">
                      {current ? formatTime(current.clock_in_at) : "—"}
                    </td>
                    <td className="px-3 py-3 text-center tabular-nums text-slate-500">
                      {current?.clock_out_at ? formatTime(current.clock_out_at) : "—"}
                    </td>
                    <td className="px-3 py-3 text-center font-semibold tabular-nums">
                      {total > 0 ? minutesToHours(total) : "—"}
                      {state === "working" && (
                        <span className="text-[10px] text-slate-500 ml-1">
                          (en curso)
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {fence == null ? (
                        <span className="text-xs text-slate-400">—</span>
                      ) : fence ? (
                        <Badge variant="green">✓ dentro</Badge>
                      ) : (
                        <Badge variant="red">✗ fuera</Badge>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <Badge variant={meta.variant}>
                        {state === "working" && <span className="pulse-dot" />}
                        {meta.label}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
              {employees.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-500 text-sm">
                    Aún no tienes empleados. Crea el primero en la sección Empleados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
