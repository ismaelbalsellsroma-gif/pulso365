import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Clock, MapPin, Users, Tablet, Timer } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { isDemoMode, DEMO_EMPLOYEES, DEMO_LOCATIONS, getDemoFichajes } from "@/lib/demo";
import { PageHeader } from "@/components/PageHeader";
import { formatLongDate, minutesToHours, todayDate } from "@/lib/time";
import type { Fichaje, Profile } from "@/types";

export default function DashboardPage({ profile }: { profile: Profile }) {
  const orgId = profile.organization_id!;
  const demo = isDemoMode();

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats", orgId],
    refetchInterval: demo ? false : 30_000,
    queryFn: async () => {
      if (demo) {
        const fichajes = getDemoFichajes();
        const totalMin = fichajes.reduce((s, f) => s + (f.worked_minutes ?? 0), 0);
        return {
          employees: DEMO_EMPLOYEES.length,
          locations: DEMO_LOCATIONS.length,
          todayFichajes: fichajes.length,
          totalMin,
          working: fichajes.filter(f => f.status === "open").length,
          onBreak: fichajes.filter(f => f.status === "on_break").length,
        };
      }
      const [empRes, locRes, fRes] = await Promise.all([
        supabase
          .from("employees")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", orgId)
          .eq("active", true),
        supabase
          .from("locations")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", orgId)
          .eq("active", true),
        supabase
          .from("clock_sessions")
          .select("*")
          .eq("organization_id", orgId)
          .eq("work_date", todayDate()),
      ]);

      const fichajes = (fRes.data as Fichaje[]) ?? [];
      const totalMin = fichajes.reduce((s, f) => s + (f.worked_minutes ?? 0), 0);
      const working = fichajes.filter((f) => f.status === "open").length;
      const onBreak = fichajes.filter((f) => f.status === "on_break").length;

      return {
        employees: empRes.count ?? 0,
        locations: locRes.count ?? 0,
        todayFichajes: fichajes.length,
        totalMin,
        working,
        onBreak,
      };
    },
  });

  const tiles = [
    {
      to: "/app/my-clock",
      label: "Mi fichaje",
      description: "Registra tu entrada y salida",
      icon: Timer,
      color: "bg-emerald-500",
    },
    {
      to: "/app/fichaje",
      label: "Fichajes en vivo",
      description: "Ver estado del equipo ahora",
      icon: Clock,
      color: "bg-brand-500",
      roles: ["admin", "manager"],
    },
    {
      to: "/app/empleados",
      label: "Empleados",
      description: "Gestiona tu equipo y PINs",
      icon: Users,
      color: "bg-purple-500",
      roles: ["admin", "manager"],
    },
    {
      to: "/app/locales",
      label: "Locales",
      description: "Geofence y horarios",
      icon: MapPin,
      color: "bg-amber-500",
      roles: ["admin", "manager"],
    },
  ].filter((t) => !t.roles || t.roles.includes(profile.role));

  return (
    <div>
      <PageHeader
        title={`Hola, ${profile.full_name ?? profile.email}`}
        description={formatLongDate()}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="kpi">
          <div className="kpi-label">Trabajando ahora</div>
          <div className="kpi-value">{stats?.working ?? "—"}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">En pausa</div>
          <div className="kpi-value">{stats?.onBreak ?? "—"}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Fichajes hoy</div>
          <div className="kpi-value">{stats?.todayFichajes ?? "—"}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Horas acumuladas</div>
          <div className="kpi-value">{minutesToHours(stats?.totalMin ?? 0)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tiles.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            className="panel hover:shadow-elevated hover:-translate-y-0.5 transition-all p-5 flex items-center gap-4 group"
          >
            <div className={`h-12 w-12 rounded-xl ${t.color} flex items-center justify-center shrink-0`}>
              <t.icon className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-slate-900">{t.label}</div>
              <div className="text-xs text-slate-500 truncate">{t.description}</div>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-brand-500 transition-colors" />
          </Link>
        ))}

        <a
          href="/kiosco"
          target="_blank"
          rel="noreferrer"
          className="panel hover:shadow-elevated hover:-translate-y-0.5 transition-all p-5 flex items-center gap-4 group border-dashed"
        >
          <div className="h-12 w-12 rounded-xl bg-slate-900 flex items-center justify-center shrink-0">
            <Tablet className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-slate-900">Abrir modo kiosco</div>
            <div className="text-xs text-slate-500">Tablet fija en el local</div>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-brand-500 transition-colors" />
        </a>
      </div>
    </div>
  );
}
