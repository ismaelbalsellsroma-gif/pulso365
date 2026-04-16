import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  BarChart3,
  CalendarDays,
  CalendarOff,
  Clock,
  LayoutDashboard,
  Users,
  MapPin,
  Settings,
  LogOut,
  Sparkles,
  Tablet,
  Timer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Profile } from "@/types";
import { supabase } from "@/lib/supabase";
import { disableDemoMode, isDemoMode } from "@/lib/demo";
import { toast } from "sonner";

interface NavItem {
  to: string;
  icon: typeof Clock;
  label: string;
  roles?: Array<"admin" | "manager" | "employee">;
}

const NAV: NavItem[] = [
  { to: "/app", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/app/my-clock", icon: Timer, label: "Mi fichaje" },
  { to: "/app/fichaje", icon: Clock, label: "Fichajes en vivo", roles: ["admin", "manager"] },
  { to: "/app/cuadrante", icon: CalendarDays, label: "Cuadrante", roles: ["admin", "manager"] },
  { to: "/app/cuadrante-ia", icon: Sparkles, label: "Generar con IA", roles: ["admin", "manager"] },
  { to: "/app/ausencias", icon: CalendarOff, label: "Ausencias", roles: ["admin", "manager"] },
  { to: "/app/reportes", icon: BarChart3, label: "Reportes", roles: ["admin", "manager"] },
  { to: "/app/empleados", icon: Users, label: "Empleados", roles: ["admin", "manager"] },
  { to: "/app/locales", icon: MapPin, label: "Locales", roles: ["admin", "manager"] },
  { to: "/app/ajustes", icon: Settings, label: "Ajustes", roles: ["admin"] },
];

export default function Layout({ profile }: { profile: Profile }) {
  const navigate = useNavigate();
  const role = profile.role;
  const visible = NAV.filter((n) => !n.roles || n.roles.includes(role));

  async function logout() {
    if (isDemoMode()) {
      disableDemoMode();
      toast.success("Demo desactivado");
      window.location.href = "/";
      return;
    }
    await supabase.auth.signOut();
    toast.success("Sesión cerrada");
    navigate("/auth", { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="hidden md:flex w-60 shrink-0 border-r border-slate-200 bg-white flex-col">
        <div className="px-5 py-5 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-brand-600 flex items-center justify-center">
              <Clock className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-slate-900 leading-none">Fichaje</div>
              <div className="text-[10px] text-slate-500 leading-tight mt-0.5">
                Control horario SaaS
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {visible.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/app"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-700 hover:bg-slate-100"
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
          <NavLink
            to="/kiosco"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 mt-4 border border-dashed border-slate-200"
            target="_blank"
          >
            <Tablet className="h-4 w-4" />
            Abrir modo kiosco
          </NavLink>
        </nav>

        <div className="p-3 border-t border-slate-200">
          <div className="px-2 py-2">
            <div className="text-sm font-semibold text-slate-900 truncate">
              {profile.full_name ?? profile.email}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500">
              {role}
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex-1 flex flex-col">
        <header className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-brand-600 flex items-center justify-center">
              <Clock className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-slate-900">Fichaje</span>
          </div>
          <button
            onClick={logout}
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </header>

        <main className="flex-1 p-4 md:p-8 max-w-6xl mx-auto w-full">
          <Outlet />
        </main>

        {/* Mobile bottom tab */}
        <nav className="md:hidden sticky bottom-0 bg-white border-t border-slate-200 grid grid-cols-4 text-xs">
          {visible.slice(0, 4).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/app"}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center py-2 gap-1",
                  isActive ? "text-brand-700" : "text-slate-500"
                )
              }
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px]">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
