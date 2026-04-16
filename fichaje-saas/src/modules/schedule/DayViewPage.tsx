import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, addDays, subDays } from "date-fns";
import { es } from "date-fns/locale";
import { isDemoMode, DEMO_EMPLOYEES, getDemoShiftPlan, getDemoShiftItems } from "@/demo";
import { supabase } from "@/shared/lib/supabase";
import { Button } from "@/shared/components/ui/button";
import type { Employee, ShiftPlanItem, Profile } from "@/types";

const HOURS = Array.from({ length: 16 }, (_, i) => i + 8); // 8h–23h

function timeToMin(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

const ROLE_COLORS: Record<string, string> = {
  camarero: "#FBBF24", cocinero: "#F87171", "responsable sala": "#818CF8",
  encargado: "#818CF8", limpieza: "#86EFAC", barra: "#67E8F9",
};

function roleColor(role: string | null) {
  if (!role) return "#CBD5E1";
  for (const [k, v] of Object.entries(ROLE_COLORS)) {
    if ((role ?? "").toLowerCase().includes(k)) return v;
  }
  return "#93C5FD";
}

export default function DayViewPage({ profile }: { profile: Profile }) {
  const orgId = profile.organization_id!;
  const demo = isDemoMode();
  const [dayRef, setDayRef] = useState(new Date());
  const dateStr = format(dayRef, "yyyy-MM-dd");

  const { data: employees = [] } = useQuery({
    queryKey: ["employees", orgId],
    queryFn: async () => {
      if (demo) return DEMO_EMPLOYEES;
      const { data } = await supabase.from("employees").select("*").eq("organization_id", orgId).eq("active", true).order("first_name");
      return (data as Employee[]) ?? [];
    },
  });

  const { data: items = [] } = useQuery({
    queryKey: ["day-view-items", orgId, dateStr],
    queryFn: async () => {
      if (demo) return getDemoShiftItems().filter((i) => i.work_date === dateStr);
      const { data } = await supabase.from("shift_plan_items").select("*, shift_plans!inner(organization_id)").eq("shift_plans.organization_id", orgId).eq("work_date", dateStr);
      return (data as ShiftPlanItem[]) ?? [];
    },
  });

  // Staffing needs chart: count employees per hour
  const staffingByHour = useMemo(() => {
    return HOURS.map((hour) => {
      const hourMin = hour * 60;
      let count = 0;
      for (const item of items) {
        const start = timeToMin(item.start_time);
        let end = timeToMin(item.end_time);
        if (end <= start) end += 24 * 60;
        if (start <= hourMin && hourMin < end) count++;
      }
      return count;
    });
  }, [items]);
  const maxStaffing = Math.max(1, ...staffingByHour);

  // Current time indicator
  const now = new Date();
  const nowHour = now.getHours();
  const nowMin = now.getMinutes();
  const isToday = dateStr === format(now, "yyyy-MM-dd");

  // Grid: 1 column = 1 hour, 1 row = 1 employee
  const hourWidth = 80; // px per hour
  const totalWidth = HOURS.length * hourWidth;
  const timelineStart = HOURS[0] * 60;

  function itemLeft(item: ShiftPlanItem) {
    const start = Math.max(timeToMin(item.start_time), timelineStart);
    return ((start - timelineStart) / 60) * hourWidth;
  }
  function itemWidth(item: ShiftPlanItem) {
    const start = Math.max(timeToMin(item.start_time), timelineStart);
    let end = timeToMin(item.end_time);
    if (end <= timeToMin(item.start_time)) end += 24 * 60;
    end = Math.min(end, (HOURS[HOURS.length - 1] + 1) * 60);
    return Math.max(0, ((end - start) / 60) * hourWidth);
  }

  // Per-employee total hours for the day
  function empDayHours(empId: string) {
    return items.filter((i) => i.employee_id === empId).reduce((s, i) => {
      let d = timeToMin(i.end_time) - timeToMin(i.start_time);
      if (d <= 0) d += 24 * 60;
      return s + Math.max(0, (d - i.break_minutes) / 60);
    }, 0);
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setDayRef((d) => subDays(d, 1))}><ChevronLeft className="h-4 w-4" /></Button>
          <div className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-semibold">
            {format(dayRef, "EEEE, d 'de' MMMM yyyy", { locale: es })}
          </div>
          <Button variant="ghost" size="sm" onClick={() => setDayRef((d) => addDays(d, 1))}><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <div className="text-xs text-slate-500">
          {items.length} turno(s) · {employees.filter((e) => items.some((i) => i.employee_id === e.id)).length} empleado(s)
        </div>
      </div>

      {/* Staffing chart (barras por hora como Skello) */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-500 uppercase">Necesidades de personal</span>
          <div className="flex items-center gap-3 text-[10px] text-slate-400">
            <div className="flex items-center gap-1"><div className="h-2 w-6 rounded bg-brand-200" /> Personal previsto</div>
          </div>
        </div>
        <div className="flex items-end gap-[2px] h-20">
          {staffingByHour.map((count, i) => (
            <div key={i} className="flex-1 flex flex-col items-center justify-end">
              <div className="w-full bg-brand-200 rounded-t-sm transition-all" style={{ height: `${(count / maxStaffing) * 100}%`, minHeight: count > 0 ? 4 : 0 }} />
            </div>
          ))}
        </div>
        <div className="flex gap-[2px] mt-1">
          {HOURS.map((h) => (
            <div key={h} className="flex-1 text-center text-[9px] text-slate-400">{h}h</div>
          ))}
        </div>
      </div>

      {/* Timeline grid */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <div style={{ minWidth: totalWidth + 160 }}>
            {/* Hour headers */}
            <div className="flex border-b border-slate-200">
              <div className="w-40 shrink-0 px-3 py-2 text-xs font-semibold text-slate-500 border-r border-slate-100 bg-slate-50">Empleados</div>
              <div className="flex relative" style={{ width: totalWidth }}>
                {HOURS.map((h) => (
                  <div key={h} className="border-r border-slate-100 text-center text-[10px] text-slate-400 py-2" style={{ width: hourWidth }}>
                    {h}h
                  </div>
                ))}
                {/* Now line */}
                {isToday && nowHour >= HOURS[0] && nowHour <= HOURS[HOURS.length - 1] && (
                  <div className="absolute top-0 bottom-0 w-px bg-brand-500 z-10" style={{ left: ((nowHour - HOURS[0]) * 60 + nowMin) / 60 * hourWidth }}>
                    <div className="absolute -top-0.5 -left-1 h-2 w-2 rounded-full bg-brand-500" />
                  </div>
                )}
              </div>
              <div className="w-16 shrink-0 px-2 py-2 text-center text-xs font-semibold text-slate-500 bg-slate-50 border-l border-slate-200">Total</div>
            </div>

            {/* N/A row */}
            <div className="flex border-b border-slate-100 bg-slate-50/50">
              <div className="w-40 shrink-0 px-3 py-3 border-r border-slate-100 flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-slate-300 flex items-center justify-center text-[9px] font-bold text-white">N/A</div>
                <span className="text-xs text-slate-400">Sin asignar</span>
              </div>
              <div className="relative" style={{ width: totalWidth, height: 44 }}>
                {items.filter((i) => i.is_open_shift).map((item) => (
                  <div key={item.id} className="absolute top-1 h-9 rounded-md border-l-[3px] px-2 py-1 text-[10px] font-semibold"
                    style={{ left: itemLeft(item), width: itemWidth(item), borderColor: roleColor(item.role), backgroundColor: roleColor(item.role) + "22", color: roleColor(item.role) }}>
                    {item.start_time} - {item.end_time}
                    <div className="text-[9px] opacity-70">{item.role}</div>
                  </div>
                ))}
              </div>
              <div className="w-16 shrink-0 px-2 py-3 text-center text-xs text-slate-400 font-mono border-l border-slate-200">00h00</div>
            </div>

            {/* Employee rows */}
            {employees.map((emp) => {
              const empItems = items.filter((i) => i.employee_id === emp.id && !i.is_open_shift);
              const hours = empDayHours(emp.id);
              return (
                <div key={emp.id} className="flex border-b border-slate-100 hover:bg-slate-50/50">
                  <div className="w-40 shrink-0 px-3 py-3 border-r border-slate-100 flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0" style={{ backgroundColor: emp.color ?? "#0ea5e9" }}>
                      {emp.first_name.charAt(0)}{emp.last_name?.charAt(0) ?? ""}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-900 truncate">{emp.first_name} {emp.last_name ?? ""}</div>
                      <div className="text-[10px] text-slate-400">{emp.contract_hours_week ?? 40}h</div>
                    </div>
                  </div>
                  <div className="relative" style={{ width: totalWidth, height: 44 }}>
                    {/* Hour grid lines */}
                    {HOURS.map((h) => (
                      <div key={h} className="absolute top-0 bottom-0 border-r border-slate-50" style={{ left: (h - HOURS[0]) * hourWidth }} />
                    ))}
                    {/* Shift bars */}
                    {empItems.map((item) => (
                      <div key={item.id} className="absolute top-1 h-9 rounded-md border-l-[3px] px-2 py-0.5 cursor-pointer hover:opacity-80 transition-opacity overflow-hidden"
                        style={{ left: itemLeft(item), width: itemWidth(item), borderColor: roleColor(item.role), backgroundColor: roleColor(item.role) + "30" }}>
                        <div className="text-[10px] font-bold text-slate-800">{item.start_time} - {item.end_time}</div>
                        <div className="text-[9px] font-medium" style={{ color: roleColor(item.role) }}>{item.role}</div>
                      </div>
                    ))}
                    {/* Now line */}
                    {isToday && nowHour >= HOURS[0] && nowHour <= HOURS[HOURS.length - 1] && (
                      <div className="absolute top-0 bottom-0 w-px bg-brand-500/30 z-10" style={{ left: ((nowHour - HOURS[0]) * 60 + nowMin) / 60 * hourWidth }} />
                    )}
                  </div>
                  <div className="w-16 shrink-0 px-2 py-3 text-center text-xs font-mono font-bold text-slate-700 border-l border-slate-200">
                    {hours > 0 ? `${String(Math.floor(hours)).padStart(2, "0")}h${String(Math.round((hours % 1) * 60)).padStart(2, "0")}` : ""}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
