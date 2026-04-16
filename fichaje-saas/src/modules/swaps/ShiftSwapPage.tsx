import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeftRight, Check, X, Plus, Clock, Calendar } from "lucide-react";
import { format, startOfWeek, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/shared/lib/supabase";
import {
  isDemoMode, DEMO_EMPLOYEES, getDemoSwapRequests, getDemoShiftItems,
} from "@/demo";
import { PageHeader } from "@/shared/components/PageHeader";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Label } from "@/shared/components/ui/label";
import type { Employee, Profile, ShiftPlanItem, ShiftSwapRequest } from "@/types";

const statusMeta: Record<string, { label: string; variant: "amber" | "green" | "red" | "slate" | "blue" }> = {
  pending: { label: "Esperando aceptaci\u00f3n", variant: "amber" },
  accepted: { label: "Pendiente manager", variant: "blue" },
  approved: { label: "Aprobado", variant: "green" },
  rejected: { label: "Rechazado", variant: "red" },
  cancelled: { label: "Cancelado", variant: "slate" },
};

export default function ShiftSwapPage({ profile }: { profile: Profile }) {
  const orgId = profile.organization_id!;
  const demo = isDemoMode();
  const qc = useQueryClient();
  const isManager = profile.role === "admin" || profile.role === "manager";
  const [newOpen, setNewOpen] = useState(false);
  const [form, setForm] = useState<{
    requester_id: string;
    requester_item_id: string;
    target_id: string;
    target_item_id: string;
    reason: string;
  }>({ requester_id: "", requester_item_id: "", target_id: "", target_item_id: "", reason: "" });

  // Detectar empleado actual (sesi\u00f3n empleado o admin viendo)
  const empSession = (() => { try { const r = localStorage.getItem("fichaje_employee_session"); return r ? JSON.parse(r) : null; } catch { return null; } })();

  const { data: employees = [] } = useQuery({
    queryKey: ["employees", orgId],
    queryFn: async () => {
      if (demo) return DEMO_EMPLOYEES;
      const { data } = await supabase.from("employees").select("*").eq("organization_id", orgId).eq("active", true).order("first_name");
      return (data as Employee[]) ?? [];
    },
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ["shift-items-all", orgId],
    queryFn: async () => {
      if (demo) return getDemoShiftItems();
      const { data } = await supabase.from("shift_plan_items").select("*, shift_plans!inner(organization_id)")
        .eq("shift_plans.organization_id", orgId);
      return (data as ShiftPlanItem[]) ?? [];
    },
  });

  const { data: swaps = [] } = useQuery({
    queryKey: ["shift-swaps", orgId],
    queryFn: async () => {
      if (demo) return getDemoSwapRequests();
      const { data } = await supabase.from("shift_swap_requests").select("*").eq("organization_id", orgId).order("created_at", { ascending: false });
      return (data as ShiftSwapRequest[]) ?? [];
    },
  });

  const decideMut = useMutation({
    mutationFn: async ({ id, decision }: { id: string; decision: "accepted" | "rejected" | "approved" }) => {
      if (demo) { toast.info("Modo demo \u2014 no se guarda"); return; }
      const update: Record<string, unknown> = { status: decision };
      if (decision !== "accepted") {
        update.decided_by = profile.id;
        update.decided_at = new Date().toISOString();
      }
      const { error } = await supabase.from("shift_swap_requests").update(update).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["shift-swaps"] });
      toast.success(
        vars.decision === "approved" ? "Intercambio aprobado y aplicado al cuadrante" :
        vars.decision === "accepted" ? "Has aceptado el intercambio. Ahora el manager debe aprobarlo" :
        "Solicitud rechazada"
      );
    },
  });

  const createMut = useMutation({
    mutationFn: async () => {
      if (demo) { toast.info("Modo demo \u2014 no se guarda"); return; }
      const { error } = await supabase.from("shift_swap_requests").insert({
        organization_id: orgId,
        requester_id: form.requester_id,
        requester_item_id: form.requester_item_id,
        target_id: form.target_id || null,
        target_item_id: form.target_item_id || null,
        status: "pending",
        reason: form.reason || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["shift-swaps"] }); setNewOpen(false); toast.success("Solicitud enviada"); },
    onError: (e: any) => toast.error(e?.message ?? "Error"),
  });

  const empName = (id: string | null) => {
    if (!id) return "\u2014";
    const e = employees.find((emp) => emp.id === id);
    return e ? `${e.first_name} ${e.last_name ?? ""}` : "\u2014";
  };

  const shiftLabel = (id: string | null) => {
    if (!id) return "\u2014";
    const s = shifts.find((x) => x.id === id);
    if (!s) return "\u2014";
    return `${s.work_date} \u00b7 ${s.start_time}-${s.end_time}`;
  };

  // Pre-rellenar requester si es empleado
  function openNew() {
    const myId = empSession?.employee?.id ?? "";
    setForm({ requester_id: myId, requester_item_id: "", target_id: "", target_item_id: "", reason: "" });
    setNewOpen(true);
  }

  // Mis turnos futuros (solo del empleado seleccionado)
  const myShifts = useMemo(() => {
    if (!form.requester_id) return [];
    const today = format(new Date(), "yyyy-MM-dd");
    return shifts.filter((s) => s.employee_id === form.requester_id && s.work_date >= today);
  }, [shifts, form.requester_id]);

  const targetShifts = useMemo(() => {
    if (!form.target_id) return [];
    const today = format(new Date(), "yyyy-MM-dd");
    return shifts.filter((s) => s.employee_id === form.target_id && s.work_date >= today);
  }, [shifts, form.target_id]);

  return (
    <div>
      <PageHeader
        title="Intercambio de turnos"
        description="Solicita un cambio de turno con otro compa\u00f1ero"
        actions={
          <Button onClick={openNew}><Plus className="h-4 w-4" /> Nueva solicitud</Button>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="kpi"><div className="kpi-label">Esperando compa\u00f1ero</div><div className="kpi-value text-amber-600">{swaps.filter((s) => s.status === "pending").length}</div></div>
        <div className="kpi"><div className="kpi-label">Pendiente manager</div><div className="kpi-value text-blue-600">{swaps.filter((s) => (s.status as any) === "accepted").length}</div></div>
        <div className="kpi"><div className="kpi-label">Aprobados</div><div className="kpi-value text-emerald-600">{swaps.filter((s) => (s.status as any) === "approved").length}</div></div>
        <div className="kpi"><div className="kpi-label">Total</div><div className="kpi-value">{swaps.length}</div></div>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><ArrowLeftRight className="h-4 w-4 text-brand-500" /> Solicitudes</CardTitle></CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3 font-semibold">Solicitante</th>
                <th className="px-3 py-3 font-semibold">Su turno</th>
                <th className="px-3 py-3 font-semibold">Cambia con</th>
                <th className="px-3 py-3 font-semibold">Por turno</th>
                <th className="px-3 py-3 font-semibold">Motivo</th>
                <th className="px-3 py-3 font-semibold text-center">Estado</th>
                <th className="px-3 py-3 font-semibold text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {swaps.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-500">
                  No hay solicitudes de intercambio.
                </td></tr>
              )}
              {swaps.map((s) => {
                const meta = statusMeta[s.status] ?? statusMeta.pending;
                const iAmTarget = empSession?.employee?.id === s.target_id;
                return (
                  <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-5 py-3 font-semibold">{empName(s.requester_id)}</td>
                    <td className="px-3 py-3 text-xs text-slate-500 tabular-nums">{shiftLabel(s.requester_item_id)}</td>
                    <td className="px-3 py-3">{empName(s.target_id)}</td>
                    <td className="px-3 py-3 text-xs text-slate-500 tabular-nums">{shiftLabel(s.target_item_id)}</td>
                    <td className="px-3 py-3 text-slate-500 max-w-[180px] truncate">{s.reason ?? "\u2014"}</td>
                    <td className="px-3 py-3 text-center"><Badge variant={meta.variant}>{meta.label}</Badge></td>
                    <td className="px-3 py-3 text-center">
                      <div className="flex justify-center gap-1">
                        {/* Empleado destino acepta o rechaza */}
                        {s.status === "pending" && iAmTarget && (
                          <>
                            <button onClick={() => decideMut.mutate({ id: s.id, decision: "accepted" })} className="px-2 py-1 rounded-lg text-xs font-semibold text-emerald-600 hover:bg-emerald-50">Aceptar</button>
                            <button onClick={() => decideMut.mutate({ id: s.id, decision: "rejected" })} className="px-2 py-1 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50">Rechazar</button>
                          </>
                        )}
                        {/* Manager aprueba el intercambio aceptado */}
                        {(s.status as any) === "accepted" && isManager && (
                          <>
                            <button onClick={() => decideMut.mutate({ id: s.id, decision: "approved" })} className="px-2 py-1 rounded-lg text-xs font-semibold text-emerald-600 hover:bg-emerald-50">Aprobar</button>
                            <button onClick={() => decideMut.mutate({ id: s.id, decision: "rejected" })} className="px-2 py-1 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50">Rechazar</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Dialog nueva solicitud */}
      {newOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-elevated max-w-lg w-full">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-lg">Nueva solicitud de intercambio</h3>
              <button onClick={() => setNewOpen(false)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <Label>Tu turno (el que quieres cambiar)</Label>
                {!empSession && (
                  <select className="mt-1.5 w-full h-10 px-3 bg-white rounded-lg border border-slate-200 text-sm" value={form.requester_id} onChange={(e) => setForm((f) => ({ ...f, requester_id: e.target.value, requester_item_id: "" }))}>
                    <option value="">Selecciona empleado...</option>
                    {employees.map((e) => <option key={e.id} value={e.id}>{e.first_name} {e.last_name ?? ""}</option>)}
                  </select>
                )}
                <select className="mt-1.5 w-full h-10 px-3 bg-white rounded-lg border border-slate-200 text-sm" value={form.requester_item_id} onChange={(e) => setForm((f) => ({ ...f, requester_item_id: e.target.value }))} disabled={!form.requester_id}>
                  <option value="">Selecciona tu turno...</option>
                  {myShifts.map((s) => <option key={s.id} value={s.id}>{format(new Date(s.work_date + "T00:00:00"), "EEE d MMM", { locale: es })} \u00b7 {s.start_time}-{s.end_time} \u00b7 {s.role}</option>)}
                </select>
              </div>
              <div className="text-center text-2xl text-slate-400"><ArrowLeftRight className="h-5 w-5 mx-auto" /></div>
              <div>
                <Label>Compa\u00f1ero con quien intercambias</Label>
                <select className="mt-1.5 w-full h-10 px-3 bg-white rounded-lg border border-slate-200 text-sm" value={form.target_id} onChange={(e) => setForm((f) => ({ ...f, target_id: e.target.value, target_item_id: "" }))}>
                  <option value="">Selecciona compa\u00f1ero...</option>
                  {employees.filter((e) => e.id !== form.requester_id).map((e) => <option key={e.id} value={e.id}>{e.first_name} {e.last_name ?? ""}</option>)}
                </select>
                <select className="mt-1.5 w-full h-10 px-3 bg-white rounded-lg border border-slate-200 text-sm" value={form.target_item_id} onChange={(e) => setForm((f) => ({ ...f, target_item_id: e.target.value }))} disabled={!form.target_id}>
                  <option value="">Su turno (opcional)...</option>
                  {targetShifts.map((s) => <option key={s.id} value={s.id}>{format(new Date(s.work_date + "T00:00:00"), "EEE d MMM", { locale: es })} \u00b7 {s.start_time}-{s.end_time}</option>)}
                </select>
              </div>
              <div>
                <Label>Motivo</Label>
                <textarea className="mt-1.5 w-full h-16 px-3 py-2 rounded-lg border border-slate-200 text-sm resize-none" placeholder="Tengo cita m\u00e9dica, mudanza, etc." value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} />
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-600">
                <Clock className="h-3 w-3 inline mr-1" />
                <strong>Cómo funciona:</strong> tu compa\u00f1ero recibe la solicitud \u2192 si acepta \u2192 tu manager aprueba \u2192 los turnos se intercambian.
              </div>
            </div>
            <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setNewOpen(false)}>Cancelar</Button>
              <Button onClick={() => createMut.mutate()} disabled={createMut.isPending || !form.requester_id || !form.requester_item_id || !form.target_id}>
                {createMut.isPending ? "Enviando..." : "Enviar solicitud"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
