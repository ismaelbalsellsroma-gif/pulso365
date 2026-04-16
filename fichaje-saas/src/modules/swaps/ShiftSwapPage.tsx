import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeftRight, Check, X, Plus } from "lucide-react";
import { supabase } from "@/shared/lib/supabase";
import { isDemoMode, DEMO_EMPLOYEES, getDemoSwapRequests } from "@/demo";
import { PageHeader } from "@/shared/components/PageHeader";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/shared/components/ui/card";
import type { Employee, Profile, ShiftSwapRequest } from "@/types";

const statusMeta: Record<string, { label: string; variant: "amber" | "green" | "red" | "slate" }> = {
  pending: { label: "Pendiente", variant: "amber" },
  accepted: { label: "Aceptado", variant: "green" },
  rejected: { label: "Rechazado", variant: "red" },
  cancelled: { label: "Cancelado", variant: "slate" },
};

export default function ShiftSwapPage({ profile }: { profile: Profile }) {
  const orgId = profile.organization_id!;
  const demo = isDemoMode();
  const qc = useQueryClient();
  const isManager = profile.role === "admin" || profile.role === "manager";

  const { data: employees = [] } = useQuery({
    queryKey: ["employees", orgId],
    queryFn: async () => {
      if (demo) return DEMO_EMPLOYEES;
      const { data } = await supabase.from("employees").select("*").eq("organization_id", orgId).eq("active", true).order("first_name");
      return (data as Employee[]) ?? [];
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
    mutationFn: async ({ id, decision }: { id: string; decision: "accepted" | "rejected" }) => {
      if (demo) { toast.info("Modo demo"); return; }
      const { error } = await supabase.from("shift_swap_requests").update({
        status: decision, decided_by: profile.id, decided_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["shift-swaps"] }); toast.success("Solicitud procesada"); },
  });

  const empName = (id: string | null) => {
    if (!id) return "—";
    const e = employees.find((emp) => emp.id === id);
    return e ? `${e.first_name} ${e.last_name ?? ""}` : "—";
  };

  return (
    <div>
      <PageHeader
        title="Intercambio de turnos"
        description="Solicitudes de cambio entre empleados"
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <div className="kpi"><div className="kpi-label">Pendientes</div><div className="kpi-value text-amber-600">{swaps.filter((s) => s.status === "pending").length}</div></div>
        <div className="kpi"><div className="kpi-label">Aceptados</div><div className="kpi-value text-emerald-600">{swaps.filter((s) => s.status === "accepted").length}</div></div>
        <div className="kpi"><div className="kpi-label">Total</div><div className="kpi-value">{swaps.length}</div></div>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><ArrowLeftRight className="h-4 w-4 text-brand-500" /> Solicitudes</CardTitle></CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3 font-semibold">Solicitante</th>
                <th className="px-3 py-3 font-semibold">Intercambia con</th>
                <th className="px-3 py-3 font-semibold">Motivo</th>
                <th className="px-3 py-3 font-semibold text-center">Estado</th>
                <th className="px-3 py-3 font-semibold">Fecha solicitud</th>
                {isManager && <th className="px-3 py-3 font-semibold text-center">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {swaps.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-500">
                  No hay solicitudes de intercambio.
                </td></tr>
              )}
              {swaps.map((s) => {
                const meta = statusMeta[s.status] ?? statusMeta.pending;
                return (
                  <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-5 py-3 font-semibold">{empName(s.requester_id)}</td>
                    <td className="px-3 py-3">{empName(s.target_id)}</td>
                    <td className="px-3 py-3 text-slate-500 max-w-[200px] truncate">{s.reason ?? "—"}</td>
                    <td className="px-3 py-3 text-center"><Badge variant={meta.variant}>{meta.label}</Badge></td>
                    <td className="px-3 py-3 text-slate-500 tabular-nums">{new Date(s.created_at).toLocaleDateString("es-ES")}</td>
                    {isManager && (
                      <td className="px-3 py-3 text-center">
                        {s.status === "pending" && (
                          <div className="flex justify-center gap-1">
                            <button onClick={() => decideMut.mutate({ id: s.id, decision: "accepted" })} className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50"><Check className="h-4 w-4" /></button>
                            <button onClick={() => decideMut.mutate({ id: s.id, decision: "rejected" })} className="p-1.5 rounded-lg text-red-600 hover:bg-red-50"><X className="h-4 w-4" /></button>
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
    </div>
  );
}
