import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Check, X, Calendar, Clock } from "lucide-react";
import { format, differenceInBusinessDays, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/shared/lib/supabase";
import { isDemoMode, DEMO_EMPLOYEES, getDemoAbsenceTypes, getDemoAbsenceRequests, getDemoAbsenceBalances } from "@/demo";
import { PageHeader } from "@/shared/components/PageHeader";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/shared/components/ui/card";
import type { AbsenceRequest, AbsenceType, AbsenceBalance, Employee, Profile } from "@/types";

const statusMeta: Record<string, { label: string; variant: "amber" | "green" | "red" | "slate" }> = {
  pending: { label: "Pendiente", variant: "amber" },
  approved: { label: "Aprobada", variant: "green" },
  rejected: { label: "Rechazada", variant: "red" },
  cancelled: { label: "Cancelada", variant: "slate" },
};

export default function AusenciasPage({ profile }: { profile: Profile }) {
  const orgId = profile.organization_id!;
  const demo = isDemoMode();
  const qc = useQueryClient();
  const isManager = profile.role === "admin" || profile.role === "manager";
  const [newOpen, setNewOpen] = useState(false);
  const [form, setForm] = useState({ employee_id: "", absence_type_id: "", start_date: "", end_date: "", reason: "" });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees", orgId],
    queryFn: async () => { if (demo) return DEMO_EMPLOYEES; const { data } = await supabase.from("employees").select("*").eq("organization_id", orgId).eq("active", true).order("first_name"); return (data as Employee[]) ?? []; },
  });

  const { data: types = [] } = useQuery({
    queryKey: ["absence-types", orgId],
    queryFn: async () => { if (demo) return getDemoAbsenceTypes(); const { data } = await supabase.from("absence_types").select("*").eq("organization_id", orgId).eq("active", true).order("sort_order"); return (data as AbsenceType[]) ?? []; },
  });

  const { data: requests = [] } = useQuery({
    queryKey: ["absence-requests", orgId],
    queryFn: async () => { if (demo) return getDemoAbsenceRequests(); const { data } = await supabase.from("absence_requests").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }); return (data as AbsenceRequest[]) ?? []; },
  });

  const { data: balances = [] } = useQuery({
    queryKey: ["absence-balances", orgId],
    queryFn: async () => { if (demo) return getDemoAbsenceBalances(); const { data } = await supabase.from("absence_balances").select("*, employees!inner(organization_id)").eq("employees.organization_id", orgId); return (data as AbsenceBalance[]) ?? []; },
  });

  const createMut = useMutation({
    mutationFn: async () => {
      if (demo) { toast.info("Modo demo"); return; }
      const days = Math.max(1, differenceInBusinessDays(new Date(form.end_date), new Date(form.start_date)) + 1);
      const { error } = await supabase.from("absence_requests").insert({
        organization_id: orgId, employee_id: form.employee_id, absence_type_id: form.absence_type_id,
        start_date: form.start_date, end_date: form.end_date, days_count: days, reason: form.reason || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["absence-requests"] }); setNewOpen(false); toast.success("Solicitud creada"); },
    onError: (e: any) => toast.error(e?.message ?? "Error"),
  });

  const decideMut = useMutation({
    mutationFn: async ({ id, decision }: { id: string; decision: "approved" | "rejected" }) => {
      if (demo) { toast.info("Modo demo"); return; }
      const { error } = await supabase.from("absence_requests").update({
        status: decision, decided_by: profile.id, decided_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["absence-requests"] }); toast.success("Solicitud procesada"); },
  });

  const year = new Date().getFullYear();

  return (
    <div>
      <PageHeader title="Ausencias y vacaciones" description="Solicitudes, aprobaciones y contadores" actions={
        <Button onClick={() => setNewOpen(true)}><Plus className="h-4 w-4" /> Nueva solicitud</Button>
      } />

      {/* Contadores */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {types.slice(0, 4).map((t) => {
          const totalEntitled = balances.filter((b) => b.absence_type_id === t.id && b.year === year).reduce((s, b) => s + b.entitled_days, 0);
          const totalUsed = balances.filter((b) => b.absence_type_id === t.id && b.year === year).reduce((s, b) => s + b.used_days, 0);
          return (
            <div key={t.id} className="kpi">
              <div className="kpi-label flex items-center gap-1.5"><div className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color }} />{t.name}</div>
              <div className="kpi-value">{totalUsed} <span className="text-sm text-slate-400">/ {totalEntitled}</span></div>
              <div className="text-[10px] text-slate-500 mt-1">{totalEntitled - totalUsed} disponibles</div>
            </div>
          );
        })}
      </div>

      {/* Lista de solicitudes */}
      <Card>
        <CardHeader><CardTitle>Solicitudes</CardTitle></CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3 font-semibold">Empleado</th>
                <th className="px-3 py-3 font-semibold">Tipo</th>
                <th className="px-3 py-3 font-semibold">Fechas</th>
                <th className="px-3 py-3 font-semibold text-center">Días</th>
                <th className="px-3 py-3 font-semibold">Motivo</th>
                <th className="px-3 py-3 font-semibold text-center">Estado</th>
                {isManager && <th className="px-3 py-3 font-semibold text-center">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 && <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-500">Sin solicitudes</td></tr>}
              {requests.map((r) => {
                const emp = employees.find((e) => e.id === r.employee_id);
                const type = types.find((t) => t.id === r.absence_type_id);
                const meta = statusMeta[r.status] ?? statusMeta.pending;
                return (
                  <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-5 py-3 font-semibold">{emp ? `${emp.first_name} ${emp.last_name ?? ""}` : "—"}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: type?.color ?? "#64748B" }} />
                        {type?.name ?? "—"}
                      </div>
                    </td>
                    <td className="px-3 py-3 tabular-nums text-slate-600">{r.start_date} → {r.end_date}</td>
                    <td className="px-3 py-3 text-center font-semibold tabular-nums">{r.days_count}</td>
                    <td className="px-3 py-3 text-slate-500 max-w-[200px] truncate">{r.reason ?? "—"}</td>
                    <td className="px-3 py-3 text-center"><Badge variant={meta.variant}>{meta.label}</Badge></td>
                    {isManager && (
                      <td className="px-3 py-3 text-center">
                        {r.status === "pending" && (
                          <div className="flex justify-center gap-1">
                            <button onClick={() => decideMut.mutate({ id: r.id, decision: "approved" })} className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50"><Check className="h-4 w-4" /></button>
                            <button onClick={() => decideMut.mutate({ id: r.id, decision: "rejected" })} className="p-1.5 rounded-lg text-red-600 hover:bg-red-50"><X className="h-4 w-4" /></button>
                          </div>
                        )}
                      </td>
                    )}
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
          <div className="bg-white rounded-2xl shadow-elevated max-w-md w-full">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-lg">Nueva solicitud de ausencia</h3>
              <button onClick={() => setNewOpen(false)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <Label>Empleado</Label>
                <select className="mt-1.5 w-full h-10 px-3 bg-white rounded-lg border border-slate-200 text-sm" value={form.employee_id} onChange={(e) => setForm((f) => ({ ...f, employee_id: e.target.value }))}>
                  <option value="">Seleccionar...</option>
                  {employees.map((e) => <option key={e.id} value={e.id}>{e.first_name} {e.last_name ?? ""}</option>)}
                </select>
              </div>
              <div>
                <Label>Tipo de ausencia</Label>
                <select className="mt-1.5 w-full h-10 px-3 bg-white rounded-lg border border-slate-200 text-sm" value={form.absence_type_id} onChange={(e) => setForm((f) => ({ ...f, absence_type_id: e.target.value }))}>
                  <option value="">Seleccionar...</option>
                  {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Desde</Label><Input type="date" className="mt-1.5" value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} /></div>
                <div><Label>Hasta</Label><Input type="date" className="mt-1.5" value={form.end_date} onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))} /></div>
              </div>
              <div><Label>Motivo (opcional)</Label><Input className="mt-1.5" value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} /></div>
            </div>
            <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setNewOpen(false)}>Cancelar</Button>
              <Button onClick={() => createMut.mutate()} disabled={createMut.isPending || !form.employee_id || !form.absence_type_id || !form.start_date || !form.end_date}>
                {createMut.isPending ? "Enviando..." : "Enviar solicitud"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
