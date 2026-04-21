import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  Clock,
  Delete,
  LogIn,
  LogOut,
  Coffee,
  Play,
  ArrowLeft,
  Tablet,
} from "lucide-react";
import { supabase } from "@/shared/lib/supabase";
import { isDemoMode, DEMO_EMPLOYEES, DEMO_LOCATIONS, DEMO_RULES, DEMO_ORG, getDemoFichajes, getDemoBreaks } from "@/demo";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import CameraCapture from "@/modules/clock/CameraCapture";
import { checkGeofence, getCurrentPosition } from "@/shared/lib/geo";
import {
  computeWorkedMinutes,
  formatLongDate,
  formatTime,
  minutesToHours,
  todayDate,
} from "@/shared/lib/time";
import type { Employee, Fichaje, FichajeBreak, LaborRules, Location } from "@/types";

/**
 * Modo kiosco: pensado para una tablet fija en el local.
 * - Auth por el slug de la organización en la URL (?org=slug) o guardado en localStorage.
 * - El empleado introduce su PIN de 4-6 dígitos para fichar.
 * - No requiere sesión Supabase individual. Usamos la anon key con RLS:
 *   la RLS actual exige `current_org_id()` (vía profile). Para el kiosco
 *   entregaremos más adelante una Edge Function `kiosk-clock` con service role.
 *   Por ahora, el kiosco funciona con un usuario "kiosk" autenticado que
 *   pertenece a la organización. Ver README.
 */

type View =
  | { step: "pin" }
  | { step: "employee"; employee: Employee; openFichaje: Fichaje | null; openBreak: FichajeBreak | null };

function PinPad({
  value,
  onChange,
  onSubmit,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
}) {
  const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

  function press(k: string) {
    if (disabled) return;
    if (k === "⌫") {
      onChange(value.slice(0, -1));
      return;
    }
    if (k === "") return;
    if (value.length >= 6) return;
    onChange(value + k);
  }

  return (
    <div className="max-w-sm w-full">
      <div className="flex justify-center gap-3 mb-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className={
              "h-14 w-10 sm:h-16 sm:w-12 rounded-xl border-2 flex items-center justify-center text-2xl font-bold " +
              (value[i]
                ? "border-brand-600 bg-brand-50 text-brand-700"
                : "border-slate-200 bg-white text-slate-300")
            }
          >
            {value[i] ? "●" : ""}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {digits.map((d, i) => (
          <button
            key={i}
            type="button"
            onClick={() => press(d)}
            disabled={disabled || d === ""}
            className={
              "h-16 rounded-xl text-2xl font-bold transition " +
              (d === ""
                ? "opacity-0 pointer-events-none"
                : d === "⌫"
                ? "bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95"
                : "bg-white border border-slate-200 shadow-soft text-slate-900 hover:bg-slate-50 active:scale-95")
            }
          >
            {d === "⌫" ? <Delete className="h-6 w-6 mx-auto" /> : d}
          </button>
        ))}
      </div>
      <Button
        className="w-full mt-6"
        size="xl"
        onClick={onSubmit}
        disabled={disabled || value.length < 4}
      >
        Validar PIN
      </Button>
    </div>
  );
}

export default function KioskPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const [orgSlug, setOrgSlug] = useState<string>(
    params.get("org") ?? localStorage.getItem("fichaje_kiosk_org") ?? ""
  );
  const [orgId, setOrgId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(
    params.get("loc") ?? localStorage.getItem("fichaje_kiosk_loc") ?? null
  );
  const [location, setLocation] = useState<Location | null>(null);
  const [rules, setRules] = useState<LaborRules | null>(null);

  const [pin, setPin] = useState("");
  const [view, setView] = useState<View>({ step: "pin" });
  const [pendingPhoto, setPendingPhoto] = useState<false | "in" | "out">(false);
  const [tick, setTick] = useState(Date.now());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const i = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  const demo = isDemoMode();

  // Resolver orgId / location / rules a partir del slug
  useEffect(() => {
    async function resolve() {
      if (!orgSlug) return;
      localStorage.setItem("fichaje_kiosk_org", orgSlug);

      if (demo) {
        setOrgId(DEMO_ORG.id);
        setLocation(DEMO_LOCATIONS[0]);
        setRules(DEMO_RULES);
        return;
      }

      const { data: org } = await supabase
        .from("organizations")
        .select("*")
        .eq("slug", orgSlug)
        .maybeSingle();
      if (!org) {
        toast.error("Organización no encontrada. Inicia sesión para configurar el kiosco.");
        return;
      }
      setOrgId(org.id);

      if (locationId) {
        localStorage.setItem("fichaje_kiosk_loc", locationId);
        const { data: loc } = await supabase
          .from("locations")
          .select("*")
          .eq("id", locationId)
          .maybeSingle();
        setLocation((loc as Location | null) ?? null);
      }

      const { data: lr } = await supabase
        .from("labor_rules")
        .select("*")
        .eq("organization_id", org.id)
        .maybeSingle();
      setRules((lr as LaborRules | null) ?? null);
    }
    resolve();
  }, [orgSlug, locationId, demo]);

  // Reloj grande
  const clockHHMM = new Date(tick).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // PIN → resolver empleado y su fichaje abierto
  async function submitPin() {
    if (!orgId) {
      toast.error("Kiosco no configurado. Inicia sesión primero.");
      return;
    }
    setLoading(true);
    try {
      let emp: Employee | null = null;
      let openFichaje: Fichaje | null = null;
      let openBreak: FichajeBreak | null = null;

      if (demo) {
        emp = DEMO_EMPLOYEES.find((e) => e.pin === pin && e.active) ?? null;
        if (!emp) { toast.error("PIN inválido"); setPin(""); setLoading(false); return; }
        const fichajes = getDemoFichajes();
        openFichaje = fichajes.find((f) => f.employee_id === emp!.id && (f.status === "open" || f.status === "on_break")) ?? null;
        if (openFichaje?.status === "on_break") {
          const breaks = getDemoBreaks();
          openBreak = breaks.find((b) => b.fichaje_id === openFichaje!.id && !b.break_end_at) ?? null;
        }
      } else {
        const { data, error } = await supabase
          .from("employees").select("*")
          .eq("organization_id", orgId).eq("pin", pin).eq("active", true).maybeSingle();
        if (error) throw error;
        if (!data) { toast.error("PIN inválido"); setPin(""); setLoading(false); return; }
        emp = data as Employee;

        const { data: open } = await supabase
          .from("clock_sessions").select("*")
          .eq("employee_id", emp.id).in("status", ["open", "on_break"])
          .order("clock_in_at", { ascending: false }).limit(1).maybeSingle();
        openFichaje = (open as Fichaje | null) ?? null;

        if (openFichaje?.status === "on_break") {
          const { data: br } = await supabase
            .from("fichaje_breaks").select("*")
            .eq("fichaje_id", openFichaje.id).is("break_end_at", null)
            .order("break_start_at", { ascending: false }).maybeSingle();
          openBreak = (br as FichajeBreak | null) ?? null;
        }
      }

      setView({ step: "employee", employee: emp!, openFichaje, openBreak });
      setPin("");
    } catch (e: any) {
      toast.error(e?.message ?? "Error al validar PIN");
    } finally {
      setLoading(false);
    }
  }

  function backToPin() {
    setView({ step: "pin" });
    setPin("");
  }

  // Acciones de fichaje desde kiosco
  async function doClockIn(photoUrl: string | null) {
    if (view.step !== "employee" || !orgId) return;
    if (demo) {
      toast.success(`¡Entrada registrada, ${view.employee.first_name}!`);
      setTimeout(backToPin, 1500);
      return;
    }
    const coords = await getCurrentPosition();
    const check = coords && location ? checkGeofence(coords, location) : null;
    if (rules?.require_geofence && check && !check.withinFence) {
      toast.error(`Fuera de zona (${Math.round(check.distance)}m)`);
      return;
    }
    const { error } = await supabase.from("clock_sessions").insert({
      organization_id: orgId,
      employee_id: view.employee.id,
      location_id: locationId,
      work_date: todayDate(),
      clock_in_at: new Date().toISOString(),
      status: "open",
      source: "kiosk",
      clock_in_lat: coords?.latitude ?? null,
      clock_in_lng: coords?.longitude ?? null,
      clock_in_accuracy_m: coords?.accuracy ?? null,
      within_geofence: check?.withinFence ?? null,
      distance_from_location_m: check?.distance ?? null,
      clock_in_photo_url: photoUrl,
      user_agent: navigator.userAgent,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`¡Buen turno, ${view.employee.first_name}!`);
    setTimeout(backToPin, 1500);
  }

  async function doClockOut(photoUrl: string | null) {
    if (view.step !== "employee" || !view.openFichaje) return;
    if (demo) {
      toast.success(`¡Hasta luego, ${view.employee.first_name}!`);
      setTimeout(backToPin, 1500);
      return;
    }
    const coords = await getCurrentPosition();
    const now = new Date().toISOString();
    const worked = computeWorkedMinutes(
      view.openFichaje.clock_in_at,
      now,
      view.openFichaje.break_minutes
    );
    const { error } = await supabase
      .from("clock_sessions")
      .update({
        clock_out_at: now,
        worked_minutes: worked,
        status: "closed",
        clock_out_lat: coords?.latitude ?? null,
        clock_out_lng: coords?.longitude ?? null,
        clock_out_accuracy_m: coords?.accuracy ?? null,
        clock_out_photo_url: photoUrl,
      })
      .eq("id", view.openFichaje.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Hasta luego, ${view.employee.first_name} · ${minutesToHours(worked)}`);
    setTimeout(backToPin, 1500);
  }

  async function doStartBreak() {
    if (view.step !== "employee" || !view.openFichaje) return;
    if (demo) { toast.success("Pausa iniciada"); setTimeout(backToPin, 1000); return; }
    const { error } = await supabase.from("fichaje_breaks").insert({
      fichaje_id: view.openFichaje.id,
      break_start_at: new Date().toISOString(),
      break_type: "pause",
    });
    if (error) return toast.error(error.message);
    await supabase
      .from("clock_sessions")
      .update({ status: "on_break" })
      .eq("id", view.openFichaje.id);
    toast.success("Pausa iniciada");
    setTimeout(backToPin, 1000);
  }

  async function doEndBreak() {
    if (view.step !== "employee" || !view.openFichaje || !view.openBreak) return;
    if (demo) { toast.success("Pausa finalizada"); setTimeout(backToPin, 1000); return; }
    const now = new Date().toISOString();
    const dur = Math.round(
      (new Date(now).getTime() - new Date(view.openBreak.break_start_at).getTime()) /
        60000
    );
    await supabase
      .from("fichaje_breaks")
      .update({ break_end_at: now, duration_minutes: dur })
      .eq("id", view.openBreak.id);
    await supabase
      .from("clock_sessions")
      .update({
        status: "open",
        break_minutes: (view.openFichaje.break_minutes ?? 0) + dur,
      })
      .eq("id", view.openFichaje.id);
    toast.success("Pausa finalizada");
    setTimeout(backToPin, 1000);
  }

  async function onPhotoCaptured(dataUrl: string) {
    const dir = pendingPhoto;
    setPendingPhoto(false);
    // Subida directa al bucket público "fichaje-photos"
    let url: string | null = null;
    try {
      if (orgId) {
        const blob = await (await fetch(dataUrl)).blob();
        const path = `${orgId}/kiosk-${dir}-${Date.now()}.jpg`;
        const { error } = await supabase.storage
          .from("fichaje-photos")
          .upload(path, blob, { contentType: "image/jpeg" });
        if (!error) {
          url = supabase.storage.from("fichaje-photos").getPublicUrl(path).data.publicUrl;
        }
      }
    } catch {
      // no-op
    }
    if (dir === "in") await doClockIn(url);
    if (dir === "out") await doClockOut(url);
  }

  // En demo, auto-configurar sin pedir slug
  useEffect(() => {
    if (!orgSlug && demo) setOrgSlug(DEMO_ORG.slug);
  }, [orgSlug, demo]);

  if (!orgSlug) {
    return <KioskSetup onSaved={(slug, loc) => {
      setOrgSlug(slug);
      if (loc) setLocationId(loc);
    }} />;
  }

  // Render
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col items-center justify-center p-6 relative">
      <button
        onClick={() => navigate("/")}
        className="absolute top-4 left-4 p-2 text-slate-400 hover:text-white"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>
      <div className="absolute top-4 right-4 flex items-center gap-2 text-xs text-slate-400">
        <Tablet className="h-3 w-3" />
        Modo kiosco · {location?.name ?? "sin local"}
      </div>

      <div className="text-center mb-8 animate-fade-in">
        <div className="text-sm uppercase tracking-[0.3em] text-slate-400">
          {formatLongDate()}
        </div>
        <div className="text-7xl sm:text-8xl font-bold tabular-nums mt-2">
          {clockHHMM}
        </div>
      </div>

      {view.step === "pin" ? (
        <div className="flex flex-col items-center bg-white rounded-2xl p-8 shadow-elevated text-slate-900 animate-slide-up max-w-md w-full">
          <h2 className="text-xl font-bold mb-1">Introduce tu PIN</h2>
          <p className="text-sm text-slate-500 mb-6">
            El que te ha dado tu manager
          </p>
          <PinPad
            value={pin}
            onChange={setPin}
            onSubmit={submitPin}
            disabled={loading}
          />
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-8 shadow-elevated text-slate-900 animate-slide-up max-w-lg w-full">
          <div className="text-center mb-6">
            <div className="text-xs uppercase tracking-wider text-slate-500">
              Hola
            </div>
            <div className="text-3xl font-bold">
              {view.employee.first_name} {view.employee.last_name ?? ""}
            </div>
            <div className="text-sm text-slate-500">
              {view.employee.position ?? ""}
            </div>
            {view.openFichaje && (
              <div className="mt-3">
                {view.openFichaje.status === "open" && (
                  <Badge variant="green">
                    En turno desde {formatTime(view.openFichaje.clock_in_at)}
                  </Badge>
                )}
                {view.openFichaje.status === "on_break" && (
                  <Badge variant="amber">En pausa</Badge>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {!view.openFichaje && (
              <Button
                size="xl"
                variant="success"
                className="col-span-full"
                onClick={() =>
                  rules?.require_photo ? setPendingPhoto("in") : doClockIn(null)
                }
              >
                <LogIn className="h-6 w-6" /> Fichar entrada
              </Button>
            )}
            {view.openFichaje?.status === "open" && (
              <>
                <Button size="xl" variant="warning" onClick={doStartBreak}>
                  <Coffee className="h-6 w-6" /> Pausa
                </Button>
                <Button
                  size="xl"
                  variant="danger"
                  onClick={() =>
                    rules?.require_photo ? setPendingPhoto("out") : doClockOut(null)
                  }
                >
                  <LogOut className="h-6 w-6" /> Salida
                </Button>
              </>
            )}
            {view.openFichaje?.status === "on_break" && (
              <Button size="xl" className="col-span-full" onClick={doEndBreak}>
                <Play className="h-6 w-6" /> Volver de pausa
              </Button>
            )}
          </div>

          <button
            onClick={backToPin}
            className="w-full mt-6 text-sm text-slate-500 hover:text-slate-900"
          >
            Cancelar
          </button>
        </div>
      )}

      {pendingPhoto && (
        <CameraCapture
          onCapture={onPhotoCaptured}
          onCancel={() => setPendingPhoto(false)}
        />
      )}
    </div>
  );
}

function KioskSetup({
  onSaved,
}: {
  onSaved: (slug: string, locationId?: string) => void;
}) {
  const [slug, setSlug] = useState("");
  const [loc, setLoc] = useState("");
  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6">
      <div className="bg-white text-slate-900 rounded-2xl p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="inline-flex h-12 w-12 rounded-xl bg-brand-600 items-center justify-center mb-3">
            <Clock className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-xl font-bold">Configurar modo kiosco</h1>
          <p className="text-sm text-slate-500 mt-1">
            Asocia esta tablet a una organización y local.
          </p>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold">Slug organización</label>
            <input
              className="mt-1 w-full h-10 px-3 border border-slate-200 rounded-lg"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="bar-la-plaza-xyz"
            />
          </div>
          <div>
            <label className="text-xs font-semibold">ID del local (opcional)</label>
            <input
              className="mt-1 w-full h-10 px-3 border border-slate-200 rounded-lg"
              value={loc}
              onChange={(e) => setLoc(e.target.value)}
              placeholder="uuid del local"
            />
          </div>
          <Button
            className="w-full"
            size="lg"
            disabled={!slug}
            onClick={() => onSaved(slug, loc || undefined)}
          >
            Activar kiosco
          </Button>
        </div>
      </div>
    </div>
  );
}
