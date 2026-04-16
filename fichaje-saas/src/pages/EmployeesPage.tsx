import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { isDemoMode, DEMO_EMPLOYEES, DEMO_LOCATIONS } from "@/lib/demo";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/utils";
import type { Employee, Location, Profile } from "@/types";

interface Props {
  profile: Profile;
}

const empty: Partial<Employee> = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  position: "",
  hourly_cost: null,
  contract_hours_week: null,
  pin: "",
  color: "#0ea5e9",
  primary_location_id: null,
  active: true,
};

function randomPin() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export default function EmployeesPage({ profile }: Props) {
  const orgId = profile.organization_id!;
  const demo = isDemoMode();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Employee> | null>(null);

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["employees", orgId],
    queryFn: async () => {
      if (demo) return DEMO_EMPLOYEES;
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("organization_id", orgId)
        .order("first_name");
      if (error) throw error;
      return (data as Employee[]) ?? [];
    },
  });

  const { data: locations = [] } = useQuery({
    queryKey: ["locations", orgId],
    queryFn: async () => {
      if (demo) return DEMO_LOCATIONS;
      const { data, error } = await supabase
        .from("locations")
        .select("*")
        .eq("organization_id", orgId)
        .order("name");
      if (error) throw error;
      return (data as Location[]) ?? [];
    },
  });

  const saveMut = useMutation({
    mutationFn: async (emp: Partial<Employee>) => {
      const payload: Partial<Employee> = {
        ...emp,
        organization_id: orgId,
        hourly_cost: emp.hourly_cost ? Number(emp.hourly_cost) : null,
        contract_hours_week: emp.contract_hours_week
          ? Number(emp.contract_hours_week)
          : null,
      };
      if (emp.id) {
        const { error } = await supabase
          .from("employees")
          .update(payload)
          .eq("id", emp.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("employees").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      setOpen(false);
      setEditing(null);
      toast.success("Empleado guardado");
    },
    onError: (e: any) => toast.error(e?.message ?? "Error al guardar"),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("employees").update({ active: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Empleado desactivado");
    },
  });

  function openNew() {
    setEditing({ ...empty, pin: randomPin() });
    setOpen(true);
  }

  function openEdit(e: Employee) {
    setEditing({ ...e });
    setOpen(true);
  }

  return (
    <div>
      <PageHeader
        title="Empleados"
        description="Gestiona tu equipo, asigna PINs y configura los locales principales."
        actions={
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" /> Nuevo empleado
          </Button>
        }
      />

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3 font-semibold">Nombre</th>
                <th className="px-3 py-3 font-semibold">Puesto</th>
                <th className="px-3 py-3 font-semibold">Local</th>
                <th className="px-3 py-3 font-semibold text-center">PIN</th>
                <th className="px-3 py-3 font-semibold text-right">Coste/h</th>
                <th className="px-3 py-3 font-semibold text-center">Contrato</th>
                <th className="px-3 py-3 font-semibold text-center">Estado</th>
                <th className="px-3 py-3 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-slate-500">
                    Cargando...
                  </td>
                </tr>
              )}
              {!isLoading && employees.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-slate-500">
                    No tienes empleados. Crea el primero para empezar a fichar.
                  </td>
                </tr>
              )}
              {employees.map((emp) => (
                <tr key={emp.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                        style={{ backgroundColor: emp.color ?? "#0ea5e9" }}
                      >
                        {emp.first_name.charAt(0)}
                        {emp.last_name?.charAt(0) ?? ""}
                      </div>
                      <div>
                        <div className="font-semibold">
                          {emp.first_name} {emp.last_name ?? ""}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {emp.email ?? ""}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">{emp.position ?? "—"}</td>
                  <td className="px-3 py-3 text-slate-500">
                    {locations.find((l) => l.id === emp.primary_location_id)?.name ?? "—"}
                  </td>
                  <td className="px-3 py-3 text-center font-mono tabular-nums">
                    {emp.pin}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {formatMoney(emp.hourly_cost)}
                  </td>
                  <td className="px-3 py-3 text-center tabular-nums">
                    {emp.contract_hours_week ? `${emp.contract_hours_week}h/sem` : "—"}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <Badge variant={emp.active ? "green" : "slate"}>
                      {emp.active ? "Activo" : "Inactivo"}
                    </Badge>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => openEdit(emp)}
                        className="p-2 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-brand-50"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      {emp.active && (
                        <button
                          onClick={() => delMut.mutate(emp.id)}
                          className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {open && editing && (
        <EmployeeDialog
          employee={editing}
          locations={locations}
          onChange={setEditing}
          onClose={() => {
            setOpen(false);
            setEditing(null);
          }}
          onSave={() => saveMut.mutate(editing)}
          isPending={saveMut.isPending}
        />
      )}
    </div>
  );
}

function EmployeeDialog({
  employee,
  locations,
  onChange,
  onClose,
  onSave,
  isPending,
}: {
  employee: Partial<Employee>;
  locations: Location[];
  onChange: (e: Partial<Employee>) => void;
  onClose: () => void;
  onSave: () => void;
  isPending: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-elevated max-w-lg w-full">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-lg">
            {employee.id ? "Editar empleado" : "Nuevo empleado"}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 grid grid-cols-2 gap-4">
          <div>
            <Label>Nombre *</Label>
            <Input
              className="mt-1.5"
              value={employee.first_name ?? ""}
              onChange={(e) => onChange({ ...employee, first_name: e.target.value })}
            />
          </div>
          <div>
            <Label>Apellidos</Label>
            <Input
              className="mt-1.5"
              value={employee.last_name ?? ""}
              onChange={(e) => onChange({ ...employee, last_name: e.target.value })}
            />
          </div>
          <div className="col-span-2">
            <Label>Email</Label>
            <Input
              type="email"
              className="mt-1.5"
              value={employee.email ?? ""}
              onChange={(e) => onChange({ ...employee, email: e.target.value })}
            />
          </div>
          <div>
            <Label>Teléfono</Label>
            <Input
              className="mt-1.5"
              value={employee.phone ?? ""}
              onChange={(e) => onChange({ ...employee, phone: e.target.value })}
            />
          </div>
          <div>
            <Label>Puesto</Label>
            <Input
              className="mt-1.5"
              value={employee.position ?? ""}
              onChange={(e) => onChange({ ...employee, position: e.target.value })}
              placeholder="Camarero, cocinero..."
            />
          </div>
          <div>
            <Label>Coste €/h</Label>
            <Input
              type="number"
              step="0.01"
              className="mt-1.5"
              value={employee.hourly_cost ?? ""}
              onChange={(e) =>
                onChange({
                  ...employee,
                  hourly_cost: e.target.value ? Number(e.target.value) : null,
                })
              }
            />
          </div>
          <div>
            <Label>Horas/semana</Label>
            <Input
              type="number"
              step="0.5"
              className="mt-1.5"
              value={employee.contract_hours_week ?? ""}
              onChange={(e) =>
                onChange({
                  ...employee,
                  contract_hours_week: e.target.value ? Number(e.target.value) : null,
                })
              }
            />
          </div>
          <div>
            <Label>PIN (4-6 dígitos) *</Label>
            <Input
              className="mt-1.5 font-mono"
              maxLength={6}
              value={employee.pin ?? ""}
              onChange={(e) =>
                onChange({ ...employee, pin: e.target.value.replace(/\D/g, "") })
              }
            />
          </div>
          <div>
            <Label>Color</Label>
            <Input
              type="color"
              className="mt-1.5 h-10"
              value={employee.color ?? "#0ea5e9"}
              onChange={(e) => onChange({ ...employee, color: e.target.value })}
            />
          </div>
          <div className="col-span-2">
            <Label>Local principal</Label>
            <select
              className="mt-1.5 w-full h-10 px-3 bg-white rounded-lg border border-slate-200 text-sm"
              value={employee.primary_location_id ?? ""}
              onChange={(e) =>
                onChange({
                  ...employee,
                  primary_location_id: e.target.value || null,
                })
              }
            >
              <option value="">— sin local —</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={onSave}
            disabled={isPending || !employee.first_name || !employee.pin || (employee.pin?.length ?? 0) < 4}
          >
            {isPending ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
