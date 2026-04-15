import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Clock,
  LogIn,
  LogOut,
  Coffee,
  Play,
  MapPin,
  ShieldCheck,
  AlertTriangle,
  Camera,
  Loader2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import CameraCapture from "@/components/CameraCapture";
import { useGeolocation } from "@/hooks/useGeolocation";
import { checkGeofence } from "@/lib/geo";
import {
  computeWorkedMinutes,
  formatLongDate,
  formatTime,
  minutesToHours,
  todayDate,
} from "@/lib/time";
import type {
  Employee,
  Fichaje,
  FichajeBreak,
  LaborRules,
  Location,
  Profile,
} from "@/types";

interface Props {
  profile: Profile;
}

async function uploadPhoto(orgId: string, dataUrl: string, tag: string) {
  try {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const path = `${orgId}/${tag}-${Date.now()}.jpg`;
    const { error } = await supabase.storage
      .from("fichaje-photos")
      .upload(path, blob, { contentType: "image/jpeg", upsert: false });
    if (error) throw error;
    const { data } = supabase.storage.from("fichaje-photos").getPublicUrl(path);
    return data.publicUrl;
  } catch (e) {
    // Si el bucket no existe aún, no bloqueamos el fichaje
    // eslint-disable-next-line no-console
    console.warn("photo upload failed", e);
    return null;
  }
}

export default function MyClockPage({ profile }: Props) {
  const qc = useQueryClient();
  const orgId = profile.organization_id!;
  const [tick, setTick] = useState(Date.now());
  const [cameraOpen, setCameraOpen] = useState<false | "in" | "out">(false);
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);
  const geo = useGeolocation(true);

  // Reloj en vivo
  useEffect(() => {
    const i = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  // Empleado ligado al profile
  const { data: employee } = useQuery({
    queryKey: ["me-employee", profile.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("profile_id", profile.id)
        .eq("active", true)
        .maybeSingle();
      if (error) throw error;
      return (data as Employee | null) ?? null;
    },
  });

  const { data: location } = useQuery({
    queryKey: ["location", employee?.primary_location_id],
    enabled: !!employee?.primary_location_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locations")
        .select("*")
        .eq("id", employee!.primary_location_id!)
        .maybeSingle();
      if (error) throw error;
      return (data as Location | null) ?? null;
    },
  });

  const { data: rules } = useQuery({
    queryKey: ["labor-rules", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("labor_rules")
        .select("*")
        .eq("organization_id", orgId)
        .maybeSingle();
      if (error) throw error;
      return (data as LaborRules | null) ?? null;
    },
  });

  // Fichaje abierto hoy
  const { data: openFichaje } = useQuery({
    queryKey: ["my-open-fichaje", employee?.id, todayDate()],
    enabled: !!employee,
    refetchInterval: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fichajes")
        .select("*")
        .eq("employee_id", employee!.id)
        .in("status", ["open", "on_break"])
        .order("clock_in_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as Fichaje | null) ?? null;
    },
  });

  const { data: openBreak } = useQuery({
    queryKey: ["my-open-break", openFichaje?.id],
    enabled: !!openFichaje && openFichaje.status === "on_break",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fichaje_breaks")
        .select("*")
        .eq("fichaje_id", openFichaje!.id)
        .is("break_end_at", null)
        .order("break_start_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as FichajeBreak | null) ?? null;
    },
  });

  const { data: todayFichajes = [] } = useQuery({
    queryKey: ["my-today-fichajes", employee?.id, todayDate()],
    enabled: !!employee,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fichajes")
        .select("*")
        .eq("employee_id", employee!.id)
        .eq("work_date", todayDate())
        .order("clock_in_at", { ascending: true });
      if (error) throw error;
      return (data as Fichaje[]) ?? [];
    },
  });

  // --- MUTATIONS ---
  const clockInMut = useMutation({
    mutationFn: async (photoUrl: string | null) => {
      if (!employee) throw new Error("Sin empleado");
      const coords = geo.state.status === "ok" ? geo.state.coords : null;
      const check = coords && location
        ? checkGeofence(coords, location)
        : null;
      if (rules?.require_geofence && check && !check.withinFence) {
        throw new Error(
          `Estás a ${Math.round(check.distance)}m del local — fuera de la zona permitida`
        );
      }
      const { error } = await supabase.from("fichajes").insert({
        organization_id: orgId,
        employee_id: employee.id,
        location_id: employee.primary_location_id,
        work_date: todayDate(),
        clock_in_at: new Date().toISOString(),
        status: "open",
        source: "web",
        clock_in_lat: coords?.latitude ?? null,
        clock_in_lng: coords?.longitude ?? null,
        clock_in_accuracy_m: coords?.accuracy ?? null,
        within_geofence: check?.withinFence ?? null,
        distance_from_location_m: check?.distance ?? null,
        clock_in_photo_url: photoUrl,
        user_agent: navigator.userAgent,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Entrada registrada");
      setPendingPhoto(null);
      qc.invalidateQueries({ queryKey: ["my-open-fichaje"] });
      qc.invalidateQueries({ queryKey: ["my-today-fichajes"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Error al fichar"),
  });

  const clockOutMut = useMutation({
    mutationFn: async (photoUrl: string | null) => {
      if (!openFichaje) throw new Error("Sin fichaje abierto");
      const coords = geo.state.status === "ok" ? geo.state.coords : null;
      const now = new Date().toISOString();
      const worked = computeWorkedMinutes(
        openFichaje.clock_in_at,
        now,
        openFichaje.break_minutes
      );
      const { error } = await supabase
        .from("fichajes")
        .update({
          clock_out_at: now,
          worked_minutes: worked,
          status: "closed",
          clock_out_lat: coords?.latitude ?? null,
          clock_out_lng: coords?.longitude ?? null,
          clock_out_accuracy_m: coords?.accuracy ?? null,
          clock_out_photo_url: photoUrl,
        })
        .eq("id", openFichaje.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Salida registrada");
      setPendingPhoto(null);
      qc.invalidateQueries({ queryKey: ["my-open-fichaje"] });
      qc.invalidateQueries({ queryKey: ["my-today-fichajes"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Error al fichar salida"),
  });

  const startBreakMut = useMutation({
    mutationFn: async () => {
      if (!openFichaje) throw new Error("Sin fichaje abierto");
      const { error: e1 } = await supabase.from("fichaje_breaks").insert({
        fichaje_id: openFichaje.id,
        break_start_at: new Date().toISOString(),
        break_type: "pause",
      });
      if (e1) throw e1;
      const { error: e2 } = await supabase
        .from("fichajes")
        .update({ status: "on_break" })
        .eq("id", openFichaje.id);
      if (e2) throw e2;
    },
    onSuccess: () => {
      toast.success("Pausa iniciada");
      qc.invalidateQueries({ queryKey: ["my-open-fichaje"] });
      qc.invalidateQueries({ queryKey: ["my-open-break"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Error iniciando pausa"),
  });

  const endBreakMut = useMutation({
    mutationFn: async () => {
      if (!openFichaje || !openBreak) throw new Error("Sin pausa activa");
      const now = new Date().toISOString();
      const durationMin = Math.max(
        0,
        Math.round(
          (new Date(now).getTime() - new Date(openBreak.break_start_at).getTime()) /
            60000
        )
      );
      const { error: e1 } = await supabase
        .from("fichaje_breaks")
        .update({ break_end_at: now, duration_minutes: durationMin })
        .eq("id", openBreak.id);
      if (e1) throw e1;
      const { error: e2 } = await supabase
        .from("fichajes")
        .update({
          status: "open",
          break_minutes: (openFichaje.break_minutes ?? 0) + durationMin,
        })
        .eq("id", openFichaje.id);
      if (e2) throw e2;
    },
    onSuccess: () => {
      toast.success("Pausa finalizada");
      qc.invalidateQueries({ queryKey: ["my-open-fichaje"] });
      qc.invalidateQueries({ queryKey: ["my-open-break"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Error finalizando pausa"),
  });

  // --- HANDLERS para foto opcional ---
  async function handleClockIn() {
    if (rules?.require_photo) {
      setCameraOpen("in");
      return;
    }
    clockInMut.mutate(null);
  }

  async function handleClockOut() {
    if (rules?.require_photo) {
      setCameraOpen("out");
      return;
    }
    clockOutMut.mutate(null);
  }

  async function onPhotoCaptured(dataUrl: string) {
    const direction = cameraOpen;
    setCameraOpen(false);
    setPendingPhoto(dataUrl);
    const uploaded = await uploadPhoto(
      orgId,
      dataUrl,
      direction === "in" ? "in" : "out"
    );
    if (direction === "in") clockInMut.mutate(uploaded);
    else if (direction === "out") clockOutMut.mutate(uploaded);
  }

  // --- VIEW STATE ---
  const clockHHMM = new Date(tick).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const workingMinutes = useMemo(() => {
    if (!openFichaje) return 0;
    const end = openFichaje.clock_out_at ?? new Date(tick).toISOString();
    return computeWorkedMinutes(
      openFichaje.clock_in_at,
      end,
      openFichaje.break_minutes
    );
  }, [openFichaje, tick]);

  const todayTotalMinutes = useMemo(() => {
    return todayFichajes.reduce((sum, f) => {
      const end = f.clock_out_at ?? new Date(tick).toISOString();
      return sum + computeWorkedMinutes(f.clock_in_at, end, f.break_minutes);
    }, 0);
  }, [todayFichajes, tick]);

  // Geofence status
  const fenceCheck = useMemo(() => {
    if (geo.state.status !== "ok" || !location?.latitude || !location?.longitude)
      return null;
    return checkGeofence(geo.state.coords, location);
  }, [geo.state, location]);

  if (!employee) {
    return (
      <div>
        <PageHeader title="Mi fichaje" description={formatLongDate()} />
        <Card>
          <CardBody className="text-center py-10">
            <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
            <p className="text-slate-700 font-semibold">
              Tu cuenta no está vinculada a ningún empleado
            </p>
            <p className="text-sm text-slate-500 mt-1">
              Pide a tu manager que te cree como empleado activo.
            </p>
          </CardBody>
        </Card>
      </div>
    );
  }

  const isWorking = openFichaje?.status === "open";
  const isOnBreak = openFichaje?.status === "on_break";

  return (
    <div>
      <PageHeader
        title={`Hola, ${employee.first_name}`}
        description={formatLongDate()}
      />

      {/* Clock card */}
      <Card className="mb-6 animate-slide-up">
        <CardBody className="text-center py-8">
          <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-semibold">
            {isWorking
              ? "Trabajando"
              : isOnBreak
              ? "En pausa"
              : "Listo para fichar"}
          </div>
          <div
            className={
              "text-6xl sm:text-7xl font-bold tabular-nums mt-2 " +
              (isWorking
                ? "text-emerald-600"
                : isOnBreak
                ? "text-amber-500"
                : "text-slate-900")
            }
          >
            {clockHHMM}
          </div>
          {openFichaje && (
            <div className="mt-3 text-sm text-slate-600">
              Entrada a las{" "}
              <span className="font-semibold tabular-nums">
                {formatTime(openFichaje.clock_in_at)}
              </span>{" "}
              · {minutesToHours(workingMinutes)} trabajadas
              {openFichaje.break_minutes > 0 && (
                <> · {openFichaje.break_minutes}min en pausa</>
              )}
            </div>
          )}

          {/* Geofence & env chips */}
          <div className="flex flex-wrap justify-center gap-2 mt-5">
            {geo.state.status === "loading" && (
              <Badge variant="slate">
                <Loader2 className="h-3 w-3 animate-spin" />
                Obteniendo ubicación...
              </Badge>
            )}
            {geo.state.status === "denied" && (
              <Badge variant="red">
                <MapPin className="h-3 w-3" />
                Sin permiso GPS
              </Badge>
            )}
            {geo.state.status === "ok" && location && fenceCheck && (
              <Badge variant={fenceCheck.withinFence ? "green" : "red"}>
                <MapPin className="h-3 w-3" />
                {fenceCheck.withinFence
                  ? `Dentro (${Math.round(fenceCheck.distance)}m)`
                  : `Fuera (${Math.round(fenceCheck.distance)}m)`}
              </Badge>
            )}
            {rules?.require_photo && (
              <Badge variant="blue">
                <Camera className="h-3 w-3" />
                Foto obligatoria
              </Badge>
            )}
            {rules?.require_geofence && (
              <Badge variant="amber">
                <ShieldCheck className="h-3 w-3" />
                Geofence activo
              </Badge>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap justify-center gap-2 mt-6">
            {!openFichaje && (
              <Button
                size="xl"
                variant="success"
                onClick={handleClockIn}
                disabled={clockInMut.isPending}
                className="min-w-[180px]"
              >
                <LogIn className="h-5 w-5" />
                {clockInMut.isPending ? "Registrando..." : "Fichar entrada"}
              </Button>
            )}
            {isWorking && (
              <>
                <Button
                  size="xl"
                  variant="warning"
                  onClick={() => startBreakMut.mutate()}
                  disabled={startBreakMut.isPending}
                >
                  <Coffee className="h-5 w-5" />
                  Pausa
                </Button>
                <Button
                  size="xl"
                  variant="danger"
                  onClick={handleClockOut}
                  disabled={clockOutMut.isPending}
                  className="min-w-[180px]"
                >
                  <LogOut className="h-5 w-5" />
                  Fichar salida
                </Button>
              </>
            )}
            {isOnBreak && (
              <Button
                size="xl"
                onClick={() => endBreakMut.mutate()}
                disabled={endBreakMut.isPending}
                className="min-w-[180px]"
              >
                <Play className="h-5 w-5" />
                Volver de pausa
              </Button>
            )}
          </div>

          {pendingPhoto && (
            <div className="mt-4 inline-block border border-slate-200 rounded-lg p-1">
              <img src={pendingPhoto} alt="foto" className="h-16 rounded" />
            </div>
          )}
        </CardBody>
      </Card>

      {/* KPIs del día */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <div className="kpi">
          <div className="kpi-label">Hoy</div>
          <div className="kpi-value">{minutesToHours(todayTotalMinutes)}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Turnos hoy</div>
          <div className="kpi-value">{todayFichajes.length}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Contrato semana</div>
          <div className="kpi-value">
            {employee.contract_hours_week ?? "—"}h
          </div>
        </div>
      </div>

      {/* Historial de hoy */}
      <Card>
        <CardHeader>
          <CardTitle>Registros de hoy</CardTitle>
        </CardHeader>
        <div className="divide-y divide-slate-200">
          {todayFichajes.length === 0 && (
            <div className="p-6 text-center text-sm text-slate-500">
              Aún no has fichado hoy.
            </div>
          )}
          {todayFichajes.map((f) => (
            <div key={f.id} className="px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-brand-50 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-brand-600" />
                </div>
                <div>
                  <div className="text-sm font-semibold">
                    {formatTime(f.clock_in_at)} →{" "}
                    {f.clock_out_at ? formatTime(f.clock_out_at) : "—"}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {f.source} · {minutesToHours(f.worked_minutes ?? 0)}
                    {f.break_minutes ? ` · ${f.break_minutes}min pausa` : ""}
                  </div>
                </div>
              </div>
              <div>
                {f.status === "open" && <Badge variant="green">En curso</Badge>}
                {f.status === "on_break" && <Badge variant="amber">Pausa</Badge>}
                {f.status === "closed" && <Badge variant="slate">Cerrado</Badge>}
                {f.status === "edited" && <Badge variant="blue">Editado</Badge>}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {cameraOpen && (
        <CameraCapture
          onCapture={onPhotoCaptured}
          onCancel={() => setCameraOpen(false)}
        />
      )}
    </div>
  );
}
