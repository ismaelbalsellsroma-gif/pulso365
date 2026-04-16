import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, MapPin, X } from "lucide-react";
import { supabase } from "@/shared/lib/supabase";
import { isDemoMode, DEMO_LOCATIONS } from "@/demo";
import { PageHeader } from "@/shared/components/PageHeader";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Card } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { getCurrentPosition } from "@/shared/lib/geo";
import type { Location, Profile } from "@/types";

const empty: Partial<Location> = {
  name: "",
  address: "",
  latitude: null,
  longitude: null,
  geofence_radius_m: 100,
  active: true,
  kiosk_enabled: true,
};

export default function LocationsPage({ profile }: { profile: Profile }) {
  const orgId = profile.organization_id!;
  const demo = isDemoMode();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Location> | null>(null);

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
    mutationFn: async (loc: Partial<Location>) => {
      const payload = { ...loc, organization_id: orgId };
      if (loc.id) {
        const { error } = await supabase
          .from("locations")
          .update(payload)
          .eq("id", loc.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("locations").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["locations"] });
      setOpen(false);
      setEditing(null);
      toast.success("Local guardado");
    },
    onError: (e: any) => toast.error(e?.message ?? "Error"),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("locations")
        .update({ active: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["locations"] });
      toast.success("Local desactivado");
    },
  });

  async function grabLocation() {
    if (!editing) return;
    toast.info("Obteniendo ubicación...");
    const coords = await getCurrentPosition();
    if (!coords) {
      toast.error("No se pudo obtener ubicación");
      return;
    }
    setEditing({
      ...editing,
      latitude: coords.latitude,
      longitude: coords.longitude,
    });
    toast.success(`Ubicación capturada (±${Math.round(coords.accuracy ?? 0)}m)`);
  }

  return (
    <div>
      <PageHeader
        title="Locales"
        description="Configura los centros de trabajo y el geofence de cada uno."
        actions={
          <Button
            onClick={() => {
              setEditing({ ...empty });
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Nuevo local
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {locations.length === 0 && (
          <Card>
            <div className="p-8 text-center text-slate-500 text-sm">
              No hay locales todavía.
            </div>
          </Card>
        )}
        {locations.map((loc) => (
          <Card key={loc.id} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                  <MapPin className="h-5 w-5 text-amber-600" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-slate-900 truncate">{loc.name}</div>
                  <div className="text-xs text-slate-500 truncate">
                    {loc.address ?? "Sin dirección"}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    <Badge variant={loc.active ? "green" : "slate"}>
                      {loc.active ? "Activo" : "Inactivo"}
                    </Badge>
                    {loc.latitude && loc.longitude ? (
                      <Badge variant="blue">
                        Geofence {loc.geofence_radius_m}m
                      </Badge>
                    ) : (
                      <Badge variant="amber">Sin coordenadas</Badge>
                    )}
                    {loc.kiosk_enabled && <Badge variant="slate">Kiosco ON</Badge>}
                  </div>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => {
                    setEditing(loc);
                    setOpen(true);
                  }}
                  className="p-2 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-brand-50"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                {loc.active && (
                  <button
                    onClick={() => delMut.mutate(loc.id)}
                    className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {open && editing && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-elevated max-w-md w-full">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-lg">
                {editing.id ? "Editar local" : "Nuevo local"}
              </h3>
              <button
                onClick={() => {
                  setOpen(false);
                  setEditing(null);
                }}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <Label>Nombre *</Label>
                <Input
                  className="mt-1.5"
                  value={editing.name ?? ""}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Dirección</Label>
                <Input
                  className="mt-1.5"
                  value={editing.address ?? ""}
                  onChange={(e) =>
                    setEditing({ ...editing, address: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Latitud</Label>
                  <Input
                    type="number"
                    step="0.0000001"
                    className="mt-1.5 tabular-nums"
                    value={editing.latitude ?? ""}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        latitude: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Longitud</Label>
                  <Input
                    type="number"
                    step="0.0000001"
                    className="mt-1.5 tabular-nums"
                    value={editing.longitude ?? ""}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        longitude: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                  />
                </div>
              </div>
              <Button
                variant="secondary"
                className="w-full"
                type="button"
                onClick={grabLocation}
              >
                <MapPin className="h-4 w-4" /> Usar mi ubicación actual
              </Button>
              <div>
                <Label>Radio del geofence (metros)</Label>
                <Input
                  type="number"
                  className="mt-1.5"
                  value={editing.geofence_radius_m ?? 100}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      geofence_radius_m: Number(e.target.value || 100),
                    })
                  }
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editing.kiosk_enabled ?? true}
                  onChange={(e) =>
                    setEditing({ ...editing, kiosk_enabled: e.target.checked })
                  }
                />
                Habilitar modo kiosco en este local
              </label>
            </div>
            <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setOpen(false);
                  setEditing(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => saveMut.mutate(editing)}
                disabled={saveMut.isPending || !editing.name}
              >
                {saveMut.isPending ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
