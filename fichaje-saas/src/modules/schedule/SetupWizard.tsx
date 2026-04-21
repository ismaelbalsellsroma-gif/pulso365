import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Check, ChevronRight, MapPin, Layers, Users, CalendarDays, Sparkles, Clock,
} from "lucide-react";
import { supabase } from "@/shared/lib/supabase";
import {
  isDemoMode, DEMO_EMPLOYEES, DEMO_LOCATIONS, DEMO_SHIFT_TEMPLATES,
  getDemoStaffingRules,
} from "@/demo";
import { Button } from "@/shared/components/ui/button";
import { Card, CardBody } from "@/shared/components/ui/card";
import type { Employee, Location, Profile, ShiftTemplate, StaffingRule } from "@/types";

interface Step {
  key: string;
  title: string;
  description: string;
  icon: typeof MapPin;
  link: string;
  linkLabel: string;
  check: () => boolean;
  detail: () => string;
}

export default function SetupWizard({ profile }: { profile: Profile }) {
  const orgId = profile.organization_id!;
  const demo = isDemoMode();

  const { data: locations = [] } = useQuery({
    queryKey: ["locations", orgId],
    queryFn: async () => {
      if (demo) return DEMO_LOCATIONS;
      const { data } = await supabase.from("locations").select("*").eq("organization_id", orgId).eq("active", true);
      return (data as Location[]) ?? [];
    },
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees", orgId],
    queryFn: async () => {
      if (demo) return DEMO_EMPLOYEES;
      const { data } = await supabase.from("employees").select("*").eq("organization_id", orgId).eq("active", true);
      return (data as Employee[]) ?? [];
    },
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["shift-templates", orgId],
    queryFn: async () => {
      if (demo) return DEMO_SHIFT_TEMPLATES;
      const { data } = await supabase.from("shift_templates").select("*").eq("organization_id", orgId).eq("active", true);
      return (data as ShiftTemplate[]) ?? [];
    },
  });

  const { data: staffingRules = [] } = useQuery({
    queryKey: ["staffing-rules", orgId],
    queryFn: async () => {
      if (demo) return getDemoStaffingRules();
      const { data } = await supabase.from("staffing_rules").select("*").eq("organization_id", orgId);
      return (data as StaffingRule[]) ?? [];
    },
  });

  const hasOpeningHours = locations.some((l) => l.opening_hours != null);

  const steps: Step[] = [
    {
      key: "local",
      title: "Configura tu local",
      description: "Define el nombre, dirección y sobre todo el horario de apertura de tu restaurante. Sin esto, no sabemos cuándo necesitas personal.",
      icon: MapPin,
      link: "/app/locales",
      linkLabel: locations.length > 0 ? "Editar locales" : "Crear local",
      check: () => locations.length > 0 && hasOpeningHours,
      detail: () => locations.length > 0
        ? `${locations.length} local(es) · ${hasOpeningHours ? "Horario configurado" : "Falta horario de apertura"}`
        : "Sin locales",
    },
    {
      key: "templates",
      title: "Crea plantillas de turno",
      description: "Define los tipos de turno que usas: Mañana (8-16), Tarde (16-00), Partido (12-16 + 19-00)... Se reutilizan al crear el cuadrante.",
      icon: Layers,
      link: "/app/plantillas",
      linkLabel: templates.length > 0 ? "Editar plantillas" : "Crear plantillas",
      check: () => templates.length >= 2,
      detail: () => templates.length > 0
        ? `${templates.length} plantilla(s): ${templates.slice(0, 3).map((t) => t.name).join(", ")}${templates.length > 3 ? "..." : ""}`
        : "Sin plantillas",
    },
    {
      key: "staffing",
      title: "Define necesidades de personal",
      description: "¿Cuántos camareros por cliente? ¿Siempre un encargado? Esto le dice a la IA cuánta gente asignar en cada franja.",
      icon: Users,
      link: "/app/plantillas",
      linkLabel: staffingRules.length > 0 ? "Editar reglas" : "Crear reglas",
      check: () => staffingRules.length >= 1,
      detail: () => staffingRules.length > 0
        ? `${staffingRules.length} regla(s): ${staffingRules.map((r) => r.role).join(", ")}`
        : "Sin reglas de personal",
    },
    {
      key: "employees",
      title: "Añade tus empleados",
      description: "Nombre, puesto, PIN para el kiosco, email para que entren con su cuenta, coste/hora y horas de contrato.",
      icon: Users,
      link: "/app/empleados",
      linkLabel: employees.length > 0 ? "Gestionar equipo" : "Añadir empleados",
      check: () => employees.length >= 2,
      detail: () => employees.length > 0
        ? `${employees.length} empleado(s)`
        : "Sin empleados",
    },
    {
      key: "schedule",
      title: "Crea tu primer cuadrante",
      description: "Todo listo. Puedes crear turnos manualmente o pulsar \"Generar con IA\" para que el sistema lo haga por ti.",
      icon: CalendarDays,
      link: "/app/cuadrante",
      linkLabel: "Abrir cuadrante",
      check: () => false,
      detail: () => "Crear turnos manualmente o con IA",
    },
  ];

  const completedCount = steps.filter((s) => s.check()).length;
  const allReady = completedCount >= 4;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex h-14 w-14 rounded-2xl bg-brand-100 items-center justify-center mb-4">
          <Clock className="h-7 w-7 text-brand-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Configura tu cuadrante</h1>
        <p className="text-slate-500 mt-2">
          Completa estos pasos para crear tu primer horario.
          {completedCount > 0 && <span className="font-semibold text-brand-600"> {completedCount} de {steps.length - 1} completados.</span>}
        </p>
      </div>

      <div className="space-y-3">
        {steps.map((step, i) => {
          const done = step.check();
          const isLast = i === steps.length - 1;
          const locked = isLast && !allReady;

          return (
            <Card key={step.key} className={`transition-all ${done ? "border-emerald-200 bg-emerald-50/30" : locked ? "opacity-50" : "hover:shadow-soft hover:-translate-y-0.5"}`}>
              <CardBody className="p-4">
                <div className="flex items-start gap-4">
                  {/* Step number / check */}
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                    done ? "bg-emerald-500 text-white" : locked ? "bg-slate-200 text-slate-400" : "bg-brand-100 text-brand-600"
                  }`}>
                    {done ? <Check className="h-5 w-5" /> : <step.icon className="h-5 w-5" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className={`font-bold ${done ? "text-emerald-700" : "text-slate-900"}`}>
                        {i + 1}. {step.title}
                      </h3>
                      {!locked && (
                        <Link to={step.link}>
                          <Button size="sm" variant={done ? "ghost" : isLast ? "primary" : "secondary"} className="gap-1.5 shrink-0">
                            {step.linkLabel} <ChevronRight className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{step.description}</p>
                    <div className={`text-[11px] mt-2 font-semibold ${done ? "text-emerald-600" : "text-slate-400"}`}>
                      {done ? "✓ " : ""}{step.detail()}
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* Quick action when all ready */}
      {allReady && (
        <div className="mt-8 text-center animate-slide-up">
          <p className="text-sm text-emerald-700 font-semibold mb-3">¡Todo listo! Ya puedes crear tu cuadrante.</p>
          <div className="flex justify-center gap-3">
            <Link to="/app/cuadrante">
              <Button size="lg" variant="secondary">
                <CalendarDays className="h-5 w-5" /> Crear manualmente
              </Button>
            </Link>
            <Link to="/app/cuadrante-ia">
              <Button size="lg">
                <Sparkles className="h-5 w-5" /> Generar con IA en 1 clic
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
