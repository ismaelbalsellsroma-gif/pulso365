import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Sparkles, ArrowLeft, Send, RefreshCw, Check, AlertTriangle, Lightbulb, BarChart3, Clock, Users, Euro,
} from "lucide-react";
import { format, startOfWeek, addDays, addWeeks } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/shared/lib/supabase";
import {
  isDemoMode, DEMO_EMPLOYEES, DEMO_LOCATIONS, DEMO_RULES, DEMO_SHIFT_TEMPLATES,
  getDemoDemand, getDemoStaffingRules, getDemoAvailability,
} from "@/demo";
import { solveSchedule, type SolverInput } from "@/modules/schedule/solver";
import { PageHeader } from "@/shared/components/PageHeader";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { formatMoney } from "@/shared/lib/utils";
import type {
  DemandForecast, Employee, EmployeeAvailability, LaborRules,
  Profile, ShiftTemplate, SolverResult, StaffingRule,
} from "@/types";

type Step = "demand" | "generating" | "review";

function getWeekDates(ref: Date) {
  const monday = startOfWeek(ref, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export default function CuadranteIAPage({ profile }: { profile: Profile }) {
  const orgId = profile.organization_id!;
  const demo = isDemoMode();
  const qc = useQueryClient();

  const [weekRef] = useState(() => startOfWeek(addWeeks(new Date(), 1), { weekStartsOn: 1 }));
  const weekStart = format(weekRef, "yyyy-MM-dd");
  const weekDates = useMemo(() => getWeekDates(weekRef), [weekRef]);

  const [step, setStep] = useState<Step>("demand");
  const [result, setResult] = useState<SolverResult | null>(null);

  // ─── queries ──────────────────────────────────────────────────────────

  const { data: employees = [] } = useQuery({
    queryKey: ["employees", orgId],
    queryFn: async () => {
      if (demo) return DEMO_EMPLOYEES;
      const { data } = await supabase.from("employees").select("*").eq("organization_id", orgId).eq("active", true).order("first_name");
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

  const { data: demand = [] } = useQuery({
    queryKey: ["demand", orgId, weekStart],
    queryFn: async () => {
      if (demo) return getDemoDemand(weekStart);
      const { data } = await supabase.from("demand_forecast").select("*").eq("organization_id", orgId)
        .gte("forecast_date", weekStart)
        .lte("forecast_date", format(weekDates[6], "yyyy-MM-dd"));
      return (data as DemandForecast[]) ?? [];
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

  const { data: availability = [] } = useQuery({
    queryKey: ["availability", orgId],
    queryFn: async () => {
      if (demo) return getDemoAvailability();
      const { data } = await supabase.from("employee_availability").select("*");
      return (data as EmployeeAvailability[]) ?? [];
    },
  });

  const { data: laborRules } = useQuery({
    queryKey: ["labor-rules", orgId],
    queryFn: async () => {
      if (demo) return DEMO_RULES;
      const { data } = await supabase.from("labor_rules").select("*").eq("organization_id", orgId).maybeSingle();
      return (data as LaborRules | null) ?? DEMO_RULES;
    },
  });

  // ─── Generar cuadrante ─────────────────────────────────────────────────

  function generate() {
    setStep("generating");
    // Simulamos 1s de "pensando" para que el usuario vea el feedback
    setTimeout(() => {
      const input: SolverInput = {
        weekStart,
        employees,
        templates,
        demand,
        staffingRules,
        availability,
        laborRules: laborRules ?? DEMO_RULES,
      };
      const res = solveSchedule(input);
      setResult(res);
      setStep("review");
      toast.success(`Cuadrante generado: ${res.items.length} turnos, ${res.coverageScore}% cobertura`);
    }, 800);
  }

  // ─── Publicar ──────────────────────────────────────────────────────────

  const publishMut = useMutation({
    mutationFn: async () => {
      if (!result) return;
      if (demo) { toast.success("Cuadrante publicado (demo)"); return; }

      // 1. Crear/actualizar shift_plan
      const { data: plan, error: planErr } = await supabase.from("shift_plans").upsert({
        organization_id: orgId,
        location_id: null,
        week_start: weekStart,
        status: "published",
        generated_by: "ai",
        ai_explanation: result.explanation,
        ai_suggestions: result.suggestions as any,
        total_hours: result.totalHours,
        total_cost: result.totalCost,
        coverage_score: result.coverageScore,
        published_at: new Date().toISOString(),
        published_by: profile.id,
      }, { onConflict: "organization_id,location_id,week_start", ignoreDuplicates: false }).select().single();
      if (planErr) throw planErr;

      // 2. Borrar items previos y crear nuevos
      await supabase.from("shift_plan_items").delete().eq("plan_id", plan.id);
      const itemsToInsert = result.items.map((it, i) => ({
        ...it, plan_id: plan.id, sort_order: i,
      }));
      if (itemsToInsert.length > 0) {
        const { error: itemsErr } = await supabase.from("shift_plan_items").insert(itemsToInsert);
        if (itemsErr) throw itemsErr;
      }

      // 3. Crear open shifts
      for (const os of result.openShifts) {
        await supabase.from("open_shifts").insert({
          organization_id: orgId,
          work_date: os.date,
          start_time: os.start,
          end_time: os.end,
          role: os.role,
          status: "open",
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shift-plan"] });
      qc.invalidateQueries({ queryKey: ["shift-items"] });
      toast.success("Cuadrante publicado y guardado");
    },
    onError: (e: any) => toast.error(e?.message ?? "Error publicando"),
  });

  // ─── Demanda chart simplificado ────────────────────────────────────────

  const peakByDay = useMemo(() => {
    return weekDates.map((d) => {
      const dateStr = format(d, "yyyy-MM-dd");
      const dayDemand = demand.filter((f) => f.forecast_date === dateStr);
      return {
        date: dateStr,
        label: format(d, "EEE d", { locale: es }),
        peak: dayDemand.reduce((max, f) => Math.max(max, f.expected_covers), 0),
        total: dayDemand.reduce((s, f) => s + f.expected_covers, 0),
      };
    });
  }, [weekDates, demand]);
  const maxPeak = Math.max(1, ...peakByDay.map((d) => d.peak));

  // ─── render ───────────────────────────────────────────────────────────

  return (
    <div>
      <PageHeader
        title="Generador de cuadrantes con IA"
        description={`Semana del ${format(weekRef, "d 'de' MMMM", { locale: es })}`}
        actions={
          <Link to="/app/cuadrante">
            <Button variant="secondary"><ArrowLeft className="h-4 w-4" /> Volver al cuadrante</Button>
          </Link>
        }
      />

      {/* ─── PASO 1: VER DEMANDA ──────────────────────────────────────── */}
      {step === "demand" && (
        <div className="space-y-6 animate-slide-up">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-brand-500" /> Demanda prevista</CardTitle></CardHeader>
            <CardBody>
              <div className="grid grid-cols-7 gap-2">
                {peakByDay.map((d) => (
                  <div key={d.date} className="text-center">
                    <div className="text-xs font-semibold text-slate-700 mb-2">{d.label}</div>
                    <div className="h-32 bg-slate-100 rounded-lg relative overflow-hidden flex items-end justify-center">
                      <div
                        className="w-8 bg-gradient-to-t from-brand-600 to-brand-400 rounded-t-md transition-all"
                        style={{ height: `${Math.max(8, (d.peak / maxPeak) * 100)}%` }}
                      />
                    </div>
                    <div className="text-xs font-bold mt-1.5 tabular-nums">{d.peak}</div>
                    <div className="text-[10px] text-slate-500">pico clientes</div>
                  </div>
                ))}
              </div>
              {demand.length === 0 && (
                <div className="text-center py-6 text-slate-500 text-sm">
                  No hay previsión de demanda. La IA usará datos por defecto.
                </div>
              )}
            </CardBody>
          </Card>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="kpi"><div className="kpi-label">Empleados disponibles</div><div className="kpi-value">{employees.length}</div></div>
            <div className="kpi"><div className="kpi-label">Plantillas de turno</div><div className="kpi-value">{templates.length}</div></div>
            <div className="kpi"><div className="kpi-label">Reglas de personal</div><div className="kpi-value">{staffingRules.length}</div></div>
            <div className="kpi"><div className="kpi-label">Máx horas/semana</div><div className="kpi-value">{laborRules?.max_hours_week ?? 40}h</div></div>
          </div>

          <div className="text-center pt-4">
            <Button size="xl" onClick={generate} className="min-w-[280px] gap-2">
              <Sparkles className="h-5 w-5" />
              Generar cuadrante en 1 clic
            </Button>
            <p className="text-xs text-slate-500 mt-2">
              La IA analizará demanda, disponibilidad, habilidades y costes
            </p>
          </div>
        </div>
      )}

      {/* ─── PASO 2: GENERANDO ─────────────────────────────────────────── */}
      {step === "generating" && (
        <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
          <div className="h-16 w-16 rounded-2xl bg-brand-100 flex items-center justify-center mb-4">
            <Sparkles className="h-8 w-8 text-brand-600 animate-pulse" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Generando cuadrante...</h2>
          <p className="text-slate-500 mt-2">Analizando demanda, disponibilidad y reglas laborales</p>
          <div className="mt-6 flex gap-3">
            {["Demanda", "Personal", "Reglas", "Optimizando"].map((s, i) => (
              <div key={s} className="flex items-center gap-1.5 text-xs text-brand-600 font-semibold animate-fade-in" style={{ animationDelay: `${i * 200}ms` }}>
                <div className="h-1.5 w-1.5 rounded-full bg-brand-500 animate-pulse" />
                {s}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── PASO 3: REVISAR Y PUBLICAR ──────────────────────────────── */}
      {step === "review" && result && (
        <div className="space-y-6 animate-slide-up">
          {/* KPIs del resultado */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div className="kpi"><div className="kpi-label"><Clock className="h-3 w-3 inline mr-1" />Horas</div><div className="kpi-value">{result.totalHours}h</div></div>
            <div className="kpi"><div className="kpi-label"><Euro className="h-3 w-3 inline mr-1" />Coste</div><div className="kpi-value">{formatMoney(result.totalCost)}</div></div>
            <div className="kpi"><div className="kpi-label"><Users className="h-3 w-3 inline mr-1" />Turnos</div><div className="kpi-value">{result.items.length}</div></div>
            <div className="kpi"><div className="kpi-label">Cobertura</div><div className="kpi-value">
              <span className={result.coverageScore >= 100 ? "text-emerald-600" : result.coverageScore >= 80 ? "text-amber-600" : "text-red-600"}>
                {result.coverageScore}%
              </span>
            </div></div>
            <div className="kpi"><div className="kpi-label">Huecos abiertos</div><div className="kpi-value">{result.openShifts.length}</div></div>
          </div>

          {/* Warnings */}
          {result.warnings.length > 0 && (
            <Card className="border-amber-200 bg-amber-50/50">
              <CardBody className="space-y-2">
                <div className="flex items-center gap-2 text-amber-700 font-semibold text-sm">
                  <AlertTriangle className="h-4 w-4" /> {result.warnings.length} aviso(s)
                </div>
                {result.warnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-amber-800">
                    <Badge variant={w.severity === "error" ? "red" : "amber"} className="mt-0.5 shrink-0">{w.severity}</Badge>
                    <span>{w.message}</span>
                  </div>
                ))}
              </CardBody>
            </Card>
          )}

          {/* Explicación IA */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-brand-500" /> La IA explica</CardTitle></CardHeader>
            <CardBody>
              <div className="text-sm text-slate-700 whitespace-pre-line leading-relaxed prose prose-sm max-w-none">
                {result.explanation.split("**").map((part, i) =>
                  i % 2 === 0 ? <span key={i}>{part}</span> : <strong key={i}>{part}</strong>
                )}
              </div>
            </CardBody>
          </Card>

          {/* Sugerencias */}
          {result.suggestions.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Lightbulb className="h-4 w-4 text-amber-500" /> Sugerencias</CardTitle></CardHeader>
              <CardBody className="space-y-2">
                {result.suggestions.map((s, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-lg bg-slate-50 border border-slate-200 p-3">
                    <Badge variant={s.impact === "high" ? "red" : s.impact === "medium" ? "amber" : "blue"} className="mt-0.5 shrink-0">{s.impact}</Badge>
                    <p className="text-sm text-slate-700">{s.description}</p>
                  </div>
                ))}
              </CardBody>
            </Card>
          )}

          {/* Grid preview */}
          <Card>
            <CardHeader><CardTitle>Vista previa del cuadrante</CardTitle></CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 w-36">Empleado</th>
                    {weekDates.map((d, i) => (
                      <th key={i} className="px-2 py-2 text-center text-xs font-semibold text-slate-500 min-w-[110px]">
                        {format(d, "EEE d", { locale: es })}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => {
                    const empItems = result.items.filter((it) => it.employee_id === emp.id);
                    if (empItems.length === 0) return null;
                    return (
                      <tr key={emp.id} className="border-t border-slate-100">
                        <td className="px-3 py-2 text-xs font-semibold">{emp.first_name} {emp.last_name?.[0] ?? ""}</td>
                        {weekDates.map((d, i) => {
                          const dateStr = format(d, "yyyy-MM-dd");
                          const dayItems = empItems.filter((it) => it.work_date === dateStr);
                          return (
                            <td key={i} className="px-1 py-1 text-center">
                              {dayItems.map((it, j) => (
                                <div key={j} className="rounded-md px-1.5 py-1 text-[10px] font-semibold text-white mb-0.5" style={{ backgroundColor: it.color }}>
                                  {it.start_time}–{it.end_time}
                                </div>
                              ))}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Button variant="secondary" size="lg" onClick={() => { setStep("demand"); setResult(null); }}>
              <RefreshCw className="h-4 w-4" /> Regenerar
            </Button>
            <Link to="/app/cuadrante">
              <Button variant="secondary" size="lg">
                <ArrowLeft className="h-4 w-4" /> Editar manualmente
              </Button>
            </Link>
            <Button variant="success" size="lg" onClick={() => publishMut.mutate()} disabled={publishMut.isPending} className="min-w-[200px]">
              <Send className="h-4 w-4" />
              {publishMut.isPending ? "Publicando..." : "Aprobar y publicar"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
