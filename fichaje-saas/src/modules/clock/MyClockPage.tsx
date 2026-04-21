import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Clock, LogIn, LogOut, Coffee, Play, MapPin, ShieldCheck,
  Camera, Loader2, CalendarDays, CalendarOff, UserCircle,
} from "lucide-react";
import { format, startOfWeek, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/shared/lib/supabase";
import {
  isDemoMode, DEMO_EMPLOYEES, DEMO_LOCATIONS, DEMO_RULES,
  getDemoFichajes, getDemoBreaks, getDemoShiftItems, getDemoAbsenceRequests,
  getDemoAbsenceTypes, getDemoAvailability,
} from "@/demo";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { useGeolocation } from "@/shared/hooks/useGeolocation";
import { checkGeofence } from "@/shared/lib/geo";
import {
  computeWorkedMinutes, formatLongDate, formatTime, minutesToHours, todayDate,
} from "@/shared/lib/time";
import type {
  Employee, Fichaje, FichajeBreak, LaborRules, Location, Profile,
  ShiftPlanItem, AbsenceRequest, AbsenceType, EmployeeAvailability,
} from "@/types";

const DAYS_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export default function MyClockPage({ profile }: { profile: Profile }) {
  const orgId = profile.organization_id!;
  const demo = isDemoMode();
  const qc = useQueryClient();
  const [tick, setTick] = useState(Date.now());
  const geo = useGeolocation(true);

  useEffect(() => {
    const i = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  // Detectar si es sesión de empleado por email+PIN
  const empSession = (() => { try { const r = localStorage.getItem("fichaje_employee_session"); return r ? JSON.parse(r) : null; } catch { return null; } })();
  const demoEmployee = demo ? DEMO_EMPLOYEES[0] : null;

  const { data: employee } = useQuery({
    queryKey: ["me-employee", profile.id],
    queryFn: async () => {
      if (demo) return demoEmployee;
      // Si es sesión de empleado por email+PIN, buscar por ID
      if (empSession?.employee?.id) {
        const { data } = await supabase.from("employees").select("*")
          .eq("id", empSession.employee.id).eq("active", true).maybeSingle();
        return (data as Employee | null) ?? null;
      }
      // Si es sesión normal Supabase, buscar por profile_id
      const { data } = await supabase.from("employees").select("*")
        .eq("profile_id", profile.id).eq("active", true).maybeSingle();
      return (data as Employee | null) ?? null;
    },
  });

  const { data: location } = useQuery({
    queryKey: ["location", employee?.primary_location_id],
    enabled: !!employee?.primary_location_id,
    queryFn: async () => {
      if (demo) return DEMO_LOCATIONS[0];
      const { data } = await supabase.from("locations").select("*")
        .eq("id", employee!.primary_location_id!).maybeSingle();
      return (data as Location | null) ?? null;
    },
  });

  const { data: rules } = useQuery({
    queryKey: ["labor-rules", orgId],
    queryFn: async () => {
      if (demo) return DEMO_RULES;
      const { data } = await supabase.from("labor_rules").select("*")
        .eq("organization_id", orgId).maybeSingle();
      return (data as LaborRules | null) ?? null;
    },
  });

  // Fichaje abierto
  const { data: openFichaje } = useQuery({
    queryKey: ["my-open-fichaje", employee?.id, todayDate()],
    enabled: !!employee,
    refetchInterval: 15_000,
    queryFn: async () => {
      if (demo) {
        const f = getDemoFichajes().find((f) => f.employee_id === employee!.id && (f.status === "open" || f.status === "on_break"));
        return f ?? null;
      }
      const { data } = await supabase.from("clock_sessions").select("*")
        .eq("employee_id", employee!.id).in("status", ["open", "on_break"])
        .order("clock_in_at", { ascending: false }).limit(1).maybeSingle();
      return (data as Fichaje | null) ?? null;
    },
  });

  // Fichajes de hoy
  const { data: todayFichajes = [] } = useQuery({
    queryKey: ["my-today-fichajes", employee?.id, todayDate()],
    enabled: !!employee,
    queryFn: async () => {
      if (demo) return getDemoFichajes().filter((f) => f.employee_id === employee!.id);
      const { data } = await supabase.from("clock_sessions").select("*")
        .eq("employee_id", employee!.id).eq("work_date", todayDate()).order("clock_in_at");
      return (data as Fichaje[]) ?? [];
    },
  });

  // Mis turnos de esta semana
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const weekDates = useMemo(() => {
    const mon = startOfWeek(new Date(), { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => format(addDays(mon, i), "yyyy-MM-dd"));
  }, []);

  const { data: myShifts = [] } = useQuery({
    queryKey: ["my-shifts", employee?.id, weekStart],
    enabled: !!employee,
    queryFn: async () => {
      if (demo) return getDemoShiftItems().filter((i) => i.employee_id === employee!.id);
      const { data } = await supabase.from("shift_plan_items").select("*")
        .eq("employee_id", employee!.id).gte("work_date", weekDates[0]).lte("work_date", weekDates[6]);
      return (data as ShiftPlanItem[]) ?? [];
    },
  });

  // Mis ausencias
  const { data: myAbsences = [] } = useQuery({
    queryKey: ["my-absences", employee?.id],
    enabled: !!employee,
    queryFn: async () => {
      if (demo) return getDemoAbsenceRequests().filter((a) => a.employee_id === employee!.id);
      const { data } = await supabase.from("absence_requests").select("*")
        .eq("employee_id", employee!.id).order("start_date", { ascending: false }).limit(10);
      return (data as AbsenceRequest[]) ?? [];
    },
  });

  const { data: absenceTypes = [] } = useQuery({
    queryKey: ["absence-types", orgId],
    queryFn: async () => {
      if (demo) return getDemoAbsenceTypes();
      const { data } = await supabase.from("absence_types").select("*").eq("organization_id", orgId);
      return (data as AbsenceType[]) ?? [];
    },
  });

  // Mi disponibilidad
  const { data: myAvailability = [] } = useQuery({
    queryKey: ["my-availability", employee?.id],
    enabled: !!employee,
    queryFn: async () => {
      if (demo) return getDemoAvailability().filter((a) => a.employee_id === employee!.id);
      const { data } = await supabase.from("employee_availability").select("*")
        .eq("employee_id", employee!.id);
      return (data as EmployeeAvailability[]) ?? [];
    },
  });

  // View state
  const clockHHMM = new Date(tick).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

  const workingMinutes = useMemo(() => {
    if (!openFichaje) return 0;
    const end = openFichaje.clock_out_at ?? new Date(tick).toISOString();
    return computeWorkedMinutes(openFichaje.clock_in_at, end, openFichaje.break_minutes);
  }, [openFichaje, tick]);

  const todayTotalMinutes = useMemo(() => {
    return todayFichajes.reduce((sum, f) => {
      const end = f.clock_out_at ?? new Date(tick).toISOString();
      return sum + computeWorkedMinutes(f.clock_in_at, end, f.break_minutes);
    }, 0);
  }, [todayFichajes, tick]);

  const isWorking = openFichaje?.status === "open";
  const isOnBreak = openFichaje?.status === "on_break";

  // Geofence: si la regla est\u00e1 activa y est\u00e1 fuera de zona, bloquear botones
  const fenceCheck = useMemo(() => {
    if (geo.state.status !== "ok" || !location?.latitude || !location?.longitude) return null;
    return checkGeofence(geo.state.coords, location);
  }, [geo.state, location]);

  const geoBlocked = !!(rules?.require_geofence && fenceCheck && !fenceCheck.withinFence);
  const geoWaiting = !!(rules?.require_geofence && (geo.state.status === "loading" || geo.state.status === "idle"));

  // ── Mutations de fichaje (reales con Supabase) ──
  const clockInMut = useMutation({
    mutationFn: async () => {
      if (!employee) throw new Error("Sin empleado");
      const coords = geo.state.status === "ok" ? geo.state.coords : null;
      const check = coords && location ? checkGeofence(coords, location) : null;
      const { error } = await supabase.from("clock_sessions").insert({
        organization_id: orgId, employee_id: employee.id,
        location_id: employee.primary_location_id, work_date: todayDate(),
        clock_in_at: new Date().toISOString(), status: "open",
        source: empSession ? "mobile" : "web",
        clock_in_lat: coords?.latitude ?? null, clock_in_lng: coords?.longitude ?? null,
        clock_in_accuracy_m: coords?.accuracy ?? null,
        within_geofence: check?.withinFence ?? null,
        distance_from_location_m: check?.distance ?? null,
        user_agent: navigator.userAgent,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["my-open-fichaje"] }); qc.invalidateQueries({ queryKey: ["my-today-fichajes"] }); toast.success("Entrada registrada"); },
    onError: (e: any) => toast.error(e?.message ?? "Error al fichar"),
  });

  const clockOutMut = useMutation({
    mutationFn: async () => {
      if (!openFichaje) throw new Error("Sin fichaje abierto");
      const coords = geo.state.status === "ok" ? geo.state.coords : null;
      const now = new Date().toISOString();
      const worked = computeWorkedMinutes(openFichaje.clock_in_at, now, openFichaje.break_minutes);
      const { error } = await supabase.from("clock_sessions").update({
        clock_out_at: now, worked_minutes: worked, status: "closed",
        clock_out_lat: coords?.latitude ?? null, clock_out_lng: coords?.longitude ?? null,
        clock_out_accuracy_m: coords?.accuracy ?? null,
      }).eq("id", openFichaje.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["my-open-fichaje"] }); qc.invalidateQueries({ queryKey: ["my-today-fichajes"] }); toast.success("Salida registrada"); },
    onError: (e: any) => toast.error(e?.message ?? "Error al fichar salida"),
  });

  const startBreakMut = useMutation({
    mutationFn: async () => {
      if (!openFichaje) throw new Error("Sin fichaje abierto");
      await supabase.from("fichaje_breaks").insert({ fichaje_id: openFichaje.id, break_start_at: new Date().toISOString(), break_type: "pause" });
      await supabase.from("clock_sessions").update({ status: "on_break" }).eq("id", openFichaje.id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["my-open-fichaje"] }); toast.success("Pausa iniciada"); },
    onError: (e: any) => toast.error(e?.message ?? "Error"),
  });

  const endBreakMut = useMutation({
    mutationFn: async () => {
      if (!openFichaje) throw new Error("Sin fichaje abierto");
      const { data: breaks } = await supabase.from("fichaje_breaks").select("*").eq("fichaje_id", openFichaje.id).is("break_end_at", null).limit(1);
      const ab = breaks?.[0];
      if (ab) {
        const now = new Date().toISOString();
        const dur = Math.round((new Date(now).getTime() - new Date(ab.break_start_at).getTime()) / 60000);
        await supabase.from("fichaje_breaks").update({ break_end_at: now, duration_minutes: dur }).eq("id", ab.id);
        await supabase.from("clock_sessions").update({ status: "open", break_minutes: (openFichaje.break_minutes ?? 0) + dur }).eq("id", openFichaje.id);
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["my-open-fichaje"] }); toast.success("Pausa finalizada"); },
    onError: (e: any) => toast.error(e?.message ?? "Error"),
  });

  function handleClockIn() {
    if (geoBlocked) { toast.error("Fuera de zona. Ac\u00e9rcate al local."); return; }
    if (demo) { toast.success("Entrada registrada (demo)"); return; }
    clockInMut.mutate();
  }
  function handleClockOut() {
    if (geoBlocked) { toast.error("Fuera de zona. Ac\u00e9rcate al local."); return; }
    if (demo) { toast.success("Salida registrada (demo)"); return; }
    clockOutMut.mutate();
  }
  function handleStartBreak() { if (demo) { toast.success("Pausa iniciada (demo)"); return; } startBreakMut.mutate(); }
  function handleEndBreak() { if (demo) { toast.success("Pausa finalizada (demo)"); return; } endBreakMut.mutate(); }

  const statusAbsence: Record<string, { label: string; variant: "amber" | "green" | "red" | "slate" }> = {
    pending: { label: "Pendiente", variant: "amber" },
    approved: { label: "Aprobada", variant: "green" },
    rejected: { label: "Rechazada", variant: "red" },
    cancelled: { label: "Cancelada", variant: "slate" },
  };

  return (
    <div>
      {/* Header con saludo */}
      <div className="flex items-center gap-4 mb-6">
        <div className="h-14 w-14 rounded-full flex items-center justify-center text-lg font-bold text-white" style={{ backgroundColor: employee?.color ?? "#0ea5e9" }}>
          {employee?.first_name?.charAt(0) ?? "?"}{employee?.last_name?.charAt(0) ?? ""}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Hola, {employee?.first_name ?? profile.full_name ?? ""}!</h1>
          <p className="text-sm text-slate-500">{formatLongDate()} · {employee?.position ?? "Empleado"} · {location?.name ?? ""}</p>
        </div>
      </div>

      {/* ═══ FICHAJE ═══ */}
      <Card className="mb-6 animate-slide-up">
        <CardBody className="text-center py-8">
          <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-semibold">
            {isWorking ? "Trabajando" : isOnBreak ? "En pausa" : "Listo para fichar"}
          </div>
          <div className={"text-6xl sm:text-7xl font-bold tabular-nums mt-2 " + (isWorking ? "text-emerald-600" : isOnBreak ? "text-amber-500" : "text-slate-900")}>
            {clockHHMM}
          </div>
          {openFichaje && (
            <div className="mt-3 text-sm text-slate-600">
              Entrada a las <span className="font-semibold tabular-nums">{formatTime(openFichaje.clock_in_at)}</span> · {minutesToHours(workingMinutes)} trabajadas
              {openFichaje.break_minutes > 0 && <> · {openFichaje.break_minutes}min en pausa</>}
            </div>
          )}

          {/* Geofence chips */}
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {geoBlocked && fenceCheck && (
              <Badge variant="red">
                <MapPin className="h-3 w-3" /> Fuera de zona ({Math.round(fenceCheck.distance)}m)
              </Badge>
            )}
            {!geoBlocked && geo.state.status === "ok" && location && (
              <Badge variant="green"><MapPin className="h-3 w-3" /> {location.name}</Badge>
            )}
            {geo.state.status === "denied" && <Badge variant="red"><MapPin className="h-3 w-3" /> Sin GPS</Badge>}
            {geoWaiting && <Badge variant="amber"><MapPin className="h-3 w-3" /> Comprobando ubicaci\u00f3n...</Badge>}
          </div>

          {/* Aviso de bloqueo */}
          {geoBlocked && (
            <div className="mt-3 mx-auto max-w-md rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-xs text-red-800">
              No puedes fichar fuera del local. Acerc\u00e1te para activar el bot\u00f3n.
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap justify-center gap-2 mt-6">
            {!openFichaje && (
              <Button size="xl" variant="success" onClick={handleClockIn} disabled={geoBlocked || geoWaiting} className="min-w-[180px]">
                <LogIn className="h-5 w-5" /> Fichar entrada
              </Button>
            )}
            {isWorking && (
              <>
                <Button size="xl" variant="warning" onClick={handleStartBreak}><Coffee className="h-5 w-5" /> Pausa</Button>
                <Button size="xl" variant="danger" onClick={handleClockOut} disabled={geoBlocked} className="min-w-[180px]"><LogOut className="h-5 w-5" /> Fichar salida</Button>
              </>
            )}
            {isOnBreak && (
              <Button size="xl" onClick={handleEndBreak} className="min-w-[180px]"><Play className="h-5 w-5" /> Volver de pausa</Button>
            )}
          </div>
        </CardBody>
      </Card>

      {/* KPIs del día */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="kpi"><div className="kpi-label">Horas hoy</div><div className="kpi-value">{minutesToHours(todayTotalMinutes)}</div></div>
        <div className="kpi"><div className="kpi-label">Turnos hoy</div><div className="kpi-value">{todayFichajes.length}</div></div>
        <div className="kpi"><div className="kpi-label">Contrato</div><div className="kpi-value">{employee?.contract_hours_week ?? "—"}h/sem</div></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ═══ MIS TURNOS DE LA SEMANA ═══ */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-brand-500" /> Mis turnos esta semana</CardTitle></CardHeader>
          <CardBody className="space-y-1">
            {weekDates.map((dateStr, i) => {
              const shift = myShifts.find((s) => s.work_date === dateStr);
              const isToday = dateStr === todayDate();
              return (
                <div key={dateStr} className={`flex items-center justify-between py-2 px-3 rounded-lg ${isToday ? "bg-brand-50 border border-brand-100" : "hover:bg-slate-50"}`}>
                  <div className="flex items-center gap-3">
                    <div className={`text-xs font-bold w-8 ${isToday ? "text-brand-600" : "text-slate-500"}`}>{DAYS_SHORT[i]}</div>
                    <div className="text-xs text-slate-400">{format(new Date(dateStr + "T00:00:00"), "d MMM", { locale: es })}</div>
                  </div>
                  {shift ? (
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: shift.color }} />
                      <span className="text-xs font-semibold tabular-nums">{shift.start_time} – {shift.end_time}</span>
                      {shift.role && <span className="text-[10px] text-slate-400">{shift.role}</span>}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-300">Libre</span>
                  )}
                </div>
              );
            })}
          </CardBody>
        </Card>

        {/* ═══ REGISTROS DE HOY ═══ */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-4 w-4 text-brand-500" /> Registros de hoy</CardTitle></CardHeader>
          <div className="divide-y divide-slate-100">
            {todayFichajes.length === 0 && <div className="p-6 text-center text-sm text-slate-500">Aún no has fichado hoy.</div>}
            {todayFichajes.map((f) => (
              <div key={f.id} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-brand-50 flex items-center justify-center">
                    <Clock className="h-4 w-4 text-brand-600" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{formatTime(f.clock_in_at)} → {f.clock_out_at ? formatTime(f.clock_out_at) : "—"}</div>
                    <div className="text-[10px] text-slate-500">{f.source} · {minutesToHours(f.worked_minutes ?? 0)}{f.break_minutes ? ` · ${f.break_minutes}min pausa` : ""}</div>
                  </div>
                </div>
                <Badge variant={f.status === "open" ? "green" : f.status === "on_break" ? "amber" : "slate"}>
                  {f.status === "open" ? "En curso" : f.status === "on_break" ? "Pausa" : "Cerrado"}
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* ═══ MIS AUSENCIAS ═══ */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><CalendarOff className="h-4 w-4 text-brand-500" /> Mis ausencias</CardTitle></CardHeader>
          <div className="divide-y divide-slate-100">
            {myAbsences.length === 0 && <div className="p-6 text-center text-sm text-slate-500">No tienes solicitudes de ausencia.</div>}
            {myAbsences.map((a) => {
              const type = absenceTypes.find((t) => t.id === a.absence_type_id);
              const meta = statusAbsence[a.status] ?? statusAbsence.pending;
              return (
                <div key={a.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: type?.color ?? "#64748B" }} />
                      <span className="text-sm font-semibold">{type?.name ?? "—"}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{a.start_date} → {a.end_date} · {a.days_count} día(s){a.reason ? ` · ${a.reason}` : ""}</div>
                  </div>
                  <Badge variant={meta.variant}>{meta.label}</Badge>
                </div>
              );
            })}
          </div>
        </Card>

        {/* ═══ MI DISPONIBILIDAD ═══ */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><UserCircle className="h-4 w-4 text-brand-500" /> Mi disponibilidad</CardTitle></CardHeader>
          <CardBody>
            <div className="space-y-1">
              {DAYS_SHORT.map((day, i) => {
                const avail = myAvailability.find((a) => a.day_of_week === i);
                const available = avail ? avail.available : true;
                return (
                  <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50">
                    <span className="text-xs font-bold text-slate-600 w-12">{day}</span>
                    {available ? (
                      <div className="flex items-center gap-2">
                        <Badge variant="green">Disponible</Badge>
                        {avail?.preferred_start && (
                          <span className="text-[10px] text-slate-400 tabular-nums">{avail.preferred_start} – {avail.preferred_end}</span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Badge variant="red">No disponible</Badge>
                        {avail?.notes && <span className="text-[10px] text-slate-400">{avail.notes}</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
