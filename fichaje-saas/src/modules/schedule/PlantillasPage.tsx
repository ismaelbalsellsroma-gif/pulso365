import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Clock, Tag, X, Layers, Users } from "lucide-react";
import { supabase } from "@/shared/lib/supabase";
import {
  isDemoMode, DEMO_SHIFT_TEMPLATES, getDemoStaffingRules,
} from "@/demo";
import { PageHeader } from "@/shared/components/PageHeader";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Card, CardBody, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import type { Profile, ShiftTemplate, StaffingRule } from "@/types";

const COLORS = ["#FBBF24", "#F87171", "#818CF8", "#86EFAC", "#67E8F9", "#C084FC", "#F472B6", "#94A3B8"];

const emptyTemplate: Partial<ShiftTemplate> = {
  name: "",
  start_time: "09:00",
  end_time: "17:00",
  break_minutes: 30,
  color: "#FBBF24",
  roles: [],
  active: true,
};

const emptyRule: Partial<StaffingRule> = {
  role: "",
  covers_per_staff: 25,
  min_staff: 1,
  required_always: false,
};

function shiftHours(s: string, e: string, brk: number) {
  const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + (m || 0); };
  let d = toMin(e) - toMin(s);
  if (d <= 0) d += 24 * 60;
  return Math.max(0, (d - brk) / 60);
}

export default function PlantillasPage({ profile }: { profile: Profile }) {
  const orgId = profile.organization_id!;
  const demo = isDemoMode();
  const qc = useQueryClient();
  const [section, setSection] = useState<"shifts" | "staffing">("shifts");
  const [editing, setEditing] = useState<Partial<ShiftTemplate> | null>(null);
  const [editingRule, setEditingRule] = useState<Partial<StaffingRule> | null>(null);
  const [rolesInput, setRolesInput] = useState("");

  // ─── Plantillas de turno ────────────────────────────────────────────
  const { data: templates = [] } = useQuery({
    queryKey: ["shift-templates-all", orgId],
    queryFn: async () => {
      if (demo) return DEMO_SHIFT_TEMPLATES;
      const { data } = await supabase.from("shift_templates").select("*").eq("organization_id", orgId).order("name");
      return (data as ShiftTemplate[]) ?? [];
    },
  });

  const saveTemplateMut = useMutation({
    mutationFn: async (tpl: Partial<ShiftTemplate>) => {
      if (demo) { toast.info("Modo demo — no se guarda"); return; }
      const payload = { ...tpl, organization_id: orgId };
      if (tpl.id) {
        const { error } = await supabase.from("shift_templates").update(payload).eq("id", tpl.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("shift_templates").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shift-templates-all"] });
      qc.invalidateQueries({ queryKey: ["shift-templates"] });
      setEditing(null);
      toast.success("Plantilla guardada");
    },
    onError: (e: any) => toast.error(e?.message ?? "Error"),
  });

  const deleteTemplateMut = useMutation({
    mutationFn: async (id: string) => {
      if (demo) return;
      await supabase.from("shift_templates").delete().eq("id", id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shift-templates-all"] });
      qc.invalidateQueries({ queryKey: ["shift-templates"] });
      toast.success("Plantilla eliminada");
    },
  });

  // ─── Reglas de personal ─────────────────────────────────────────────
  const { data: staffingRules = [] } = useQuery({
    queryKey: ["staffing-rules-all", orgId],
    queryFn: async () => {
      if (demo) return getDemoStaffingRules();
      const { data } = await supabase.from("staffing_rules").select("*").eq("organization_id", orgId).order("role");
      return (data as StaffingRule[]) ?? [];
    },
  });

  const saveRuleMut = useMutation({
    mutationFn: async (rule: Partial<StaffingRule>) => {
      if (demo) { toast.info("Modo demo — no se guarda"); return; }
      const payload = { ...rule, organization_id: orgId };
      if (rule.id) {
        const { error } = await supabase.from("staffing_rules").update(payload).eq("id", rule.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("staffing_rules").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staffing-rules-all"] });
      setEditingRule(null);
      toast.success("Regla guardada");
    },
    onError: (e: any) => toast.error(e?.message ?? "Error"),
  });

  const deleteRuleMut = useMutation({
    mutationFn: async (id: string) => {
      if (demo) return;
      await supabase.from("staffing_rules").delete().eq("id", id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staffing-rules-all"] });
      toast.success("Regla eliminada");
    },
  });

  function openNewTemplate() {
    setEditing({ ...emptyTemplate, roles: [] });
    setRolesInput("");
  }
  function openEditTemplate(t: ShiftTemplate) {
    setEditing({ ...t });
    setRolesInput((t.roles ?? []).join(", "));
  }
  function saveTemplate() {
    if (!editing) return;
    const roles = rolesInput.split(",").map((r) => r.trim()).filter(Boolean);
    saveTemplateMut.mutate({ ...editing, roles });
  }

  return (
    <div>
      <PageHeader
        title="Plantillas del cuadrante"
        description="Define aqu\u00ed la l\u00f3gica de los turnos y las necesidades de personal. Se usar\u00e1n al crear cuadrantes y al generar con IA."
      />

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-200">
        <button
          onClick={() => setSection("shifts")}
          className={`px-4 py-2 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            section === "shifts" ? "border-brand-600 text-brand-600" : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Layers className="h-4 w-4" /> Plantillas de turno
        </button>
        <button
          onClick={() => setSection("staffing")}
          className={`px-4 py-2 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            section === "staffing" ? "border-brand-600 text-brand-600" : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Users className="h-4 w-4" /> Necesidades de personal
        </button>
      </div>

      {/* ═══ PLANTILLAS DE TURNO ═══ */}
      {section === "shifts" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-700">Turnos predefinidos</h3>
              <p className="text-xs text-slate-500 mt-0.5">Ejemplo: Ma\u00f1ana 8-16, Tarde 16-00, Partido 12-16+19-00</p>
            </div>
            <Button onClick={openNewTemplate}><Plus className="h-4 w-4" /> Nueva plantilla</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {templates.length === 0 && (
              <Card className="md:col-span-2 lg:col-span-3">
                <CardBody className="text-center py-10">
                  <Tag className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-600 font-semibold">No hay plantillas todav\u00eda</p>
                  <p className="text-xs text-slate-400 mt-1">Crea plantillas de turno para reutilizarlas al crear el cuadrante.</p>
                </CardBody>
              </Card>
            )}
            {templates.map((t) => (
              <Card key={t.id} className="p-0 overflow-hidden">
                <div className="h-1.5" style={{ backgroundColor: t.color }} />
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-slate-900">{t.name}</h4>
                      <div className="text-xs text-slate-500 tabular-nums mt-0.5">
                        {t.start_time} — {t.end_time} · <Clock className="h-3 w-3 inline" /> {shiftHours(t.start_time, t.end_time, t.break_minutes).toFixed(1)}h
                      </div>
                      {t.break_minutes > 0 && (
                        <div className="text-[10px] text-slate-400 mt-0.5">Descanso: {t.break_minutes} min</div>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => openEditTemplate(t)} className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-brand-50">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => deleteTemplateMut.mutate(t.id)} className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  {t.roles && t.roles.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {t.roles.map((r, i) => (
                        <Badge key={i} variant="slate">{r}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ═══ NECESIDADES DE PERSONAL ═══ */}
      {section === "staffing" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-700">Reglas de personal por rol</h3>
              <p className="text-xs text-slate-500 mt-0.5">La IA usa estas reglas para calcular cu\u00e1nta gente necesitas en cada franja horaria.</p>
            </div>
            <Button onClick={() => setEditingRule({ ...emptyRule })}><Plus className="h-4 w-4" /> Nueva regla</Button>
          </div>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-3 font-semibold">Rol / Puesto</th>
                    <th className="px-3 py-3 font-semibold text-center">Clientes por empleado</th>
                    <th className="px-3 py-3 font-semibold text-center">M\u00ednimo empleados</th>
                    <th className="px-3 py-3 font-semibold text-center">Requerido siempre</th>
                    <th className="px-3 py-3 font-semibold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {staffingRules.length === 0 && (
                    <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-500">
                      Sin reglas. Crea la primera para que la IA sepa cu\u00e1ntas personas asignar.
                    </td></tr>
                  )}
                  {staffingRules.map((r) => (
                    <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-5 py-3 font-semibold capitalize">{r.role}</td>
                      <td className="px-3 py-3 text-center tabular-nums">1 cada {r.covers_per_staff}</td>
                      <td className="px-3 py-3 text-center tabular-nums">{r.min_staff}</td>
                      <td className="px-3 py-3 text-center">
                        {r.required_always ? <Badge variant="green">S\u00ed</Badge> : <span className="text-slate-300 text-xs">—</span>}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => setEditingRule(r)} className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-brand-50">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => deleteRuleMut.mutate(r.id)} className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="mt-4 rounded-xl bg-blue-50 border border-blue-100 p-4 text-xs text-blue-900">
            <strong>C\u00f3mo funciona:</strong> si pones <code className="bg-white px-1 rounded">1 cada 25</code> para camarero, la IA asignar\u00e1 1 camarero cada 25 clientes previstos en esa franja.
            Con <code className="bg-white px-1 rounded">M\u00ednimo 1</code>, siempre habr\u00e1 al menos 1 aunque no haya previsi\u00f3n.
            Si marcas <code className="bg-white px-1 rounded">Requerido siempre</code>, ese rol nunca puede faltar durante el horario de apertura (ej: encargado).
          </div>
        </div>
      )}

      {/* ═══ MODAL: Editar plantilla de turno ═══ */}
      {editing && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-start justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl shadow-elevated max-w-md w-full my-4">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-lg">{editing.id ? "Editar plantilla" : "Nueva plantilla de turno"}</h3>
              <button onClick={() => setEditing(null)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <Label>Nombre *</Label>
                <Input className="mt-1.5" value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Ma\u00f1ana, Tarde, Partido..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Inicio</Label>
                  <Input type="time" className="mt-1.5" value={editing.start_time ?? "09:00"} onChange={(e) => setEditing({ ...editing, start_time: e.target.value })} />
                </div>
                <div>
                  <Label>Fin</Label>
                  <Input type="time" className="mt-1.5" value={editing.end_time ?? "17:00"} onChange={(e) => setEditing({ ...editing, end_time: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Descanso (minutos)</Label>
                <Input type="number" min={0} className="mt-1.5" value={editing.break_minutes ?? 0} onChange={(e) => setEditing({ ...editing, break_minutes: parseInt(e.target.value) || 0 })} />
                <p className="text-[10px] text-slate-500 mt-1">Para turnos &gt;6h, m\u00ednimo legal: 15 min</p>
              </div>
              <div>
                <Label>Color</Label>
                <div className="flex gap-1.5 mt-1.5">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditing({ ...editing, color: c })}
                      className={`h-8 w-8 rounded-full border-2 transition-all ${editing.color === c ? "border-slate-900 scale-110" : "border-white"}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <div>
                <Label>Roles aplicables (separados por coma)</Label>
                <Input
                  className="mt-1.5"
                  value={rolesInput}
                  onChange={(e) => setRolesInput(e.target.value)}
                  placeholder="camarero, cocinero"
                />
                <p className="text-[10px] text-slate-500 mt-1">La IA solo asigna esta plantilla a empleados de estos roles. Vac\u00edo = cualquiera.</p>
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs">
                <strong>Resumen:</strong> Turno de {shiftHours(editing.start_time ?? "09:00", editing.end_time ?? "17:00", editing.break_minutes ?? 0).toFixed(1)}h (con descanso de {editing.break_minutes ?? 0} min).
              </div>
            </div>
            <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setEditing(null)}>Cancelar</Button>
              <Button onClick={saveTemplate} disabled={saveTemplateMut.isPending || !editing.name}>
                {saveTemplateMut.isPending ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL: Editar regla de personal ═══ */}
      {editingRule && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-start justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl shadow-elevated max-w-md w-full my-4">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-lg">{editingRule.id ? "Editar regla" : "Nueva regla de personal"}</h3>
              <button onClick={() => setEditingRule(null)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <Label>Rol / Puesto *</Label>
                <Input className="mt-1.5" value={editingRule.role ?? ""} onChange={(e) => setEditingRule({ ...editingRule, role: e.target.value })} placeholder="camarero" />
              </div>
              <div>
                <Label>¿Cu\u00e1ntos clientes atiende 1 empleado?</Label>
                <Input type="number" min={1} className="mt-1.5" value={editingRule.covers_per_staff ?? 25} onChange={(e) => setEditingRule({ ...editingRule, covers_per_staff: parseInt(e.target.value) || 25 })} />
                <p className="text-[10px] text-slate-500 mt-1">Ej: 1 camarero por 25 clientes. La IA calcula cu\u00e1ntos necesitas seg\u00fan la previsi\u00f3n.</p>
              </div>
              <div>
                <Label>M\u00ednimo de empleados</Label>
                <Input type="number" min={0} className="mt-1.5" value={editingRule.min_staff ?? 1} onChange={(e) => setEditingRule({ ...editingRule, min_staff: parseInt(e.target.value) || 1 })} />
                <p className="text-[10px] text-slate-500 mt-1">Aunque no haya previsi\u00f3n, al menos este n\u00famero siempre.</p>
              </div>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={editingRule.required_always ?? false}
                  onChange={(e) => setEditingRule({ ...editingRule, required_always: e.target.checked })}
                />
                <div>
                  <div className="text-sm font-semibold">Requerido siempre</div>
                  <div className="text-[10px] text-slate-500">Durante todo el horario de apertura debe haber alguien de este rol (ej: encargado).</div>
                </div>
              </label>
            </div>
            <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setEditingRule(null)}>Cancelar</Button>
              <Button onClick={() => saveRuleMut.mutate(editingRule)} disabled={saveRuleMut.isPending || !editingRule.role}>
                {saveRuleMut.isPending ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
