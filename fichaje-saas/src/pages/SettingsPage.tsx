import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { isDemoMode, DEMO_ORG, DEMO_RULES } from "@/lib/demo";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import type { LaborRules, Organization, Profile } from "@/types";

const DEFAULT_RULES: Partial<LaborRules> = {
  max_hours_day: 9,
  max_hours_week: 40,
  min_rest_between_shifts_h: 12,
  min_rest_week_h: 36,
  require_geofence: false,
  require_photo: false,
  kiosk_enabled: true,
  allow_mobile_clock: true,
  early_tolerance_minutes: 10,
  late_tolerance_minutes: 10,
  auto_close_after_hours: 14,
};

export default function SettingsPage({ profile }: { profile: Profile }) {
  const orgId = profile.organization_id!;
  const demo = isDemoMode();
  const qc = useQueryClient();
  const [rules, setRules] = useState<Partial<LaborRules>>({});
  const [orgName, setOrgName] = useState("");

  const { data: org } = useQuery({
    queryKey: ["organization", orgId],
    queryFn: async () => {
      if (demo) return DEMO_ORG;
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", orgId)
        .single();
      if (error) throw error;
      return data as Organization;
    },
  });

  const { data: existingRules } = useQuery({
    queryKey: ["labor-rules", orgId],
    queryFn: async () => {
      if (demo) return DEMO_RULES;
      const { data, error } = await supabase
        .from("labor_rules")
        .select("*")
        .eq("organization_id", orgId)
        .maybeSingle();
      if (error) throw error;
      return (data as LaborRules | null) ?? null;
    },
  });

  useEffect(() => {
    if (existingRules) setRules(existingRules);
    else setRules(DEFAULT_RULES);
  }, [existingRules]);

  useEffect(() => {
    if (org) setOrgName(org.name);
  }, [org]);

  const saveMut = useMutation({
    mutationFn: async () => {
      // Org
      await supabase
        .from("organizations")
        .update({ name: orgName })
        .eq("id", orgId);
      // Rules (upsert)
      const payload = { ...rules, organization_id: orgId };
      if (existingRules) {
        const { error } = await supabase
          .from("labor_rules")
          .update(payload)
          .eq("organization_id", orgId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("labor_rules").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["labor-rules"] });
      qc.invalidateQueries({ queryKey: ["organization"] });
      toast.success("Ajustes guardados");
    },
    onError: (e: any) => toast.error(e?.message ?? "Error al guardar"),
  });

  return (
    <div>
      <PageHeader
        title="Ajustes"
        description="Configuración de tu organización y reglas de fichaje."
        actions={
          <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
            <Save className="h-4 w-4" /> Guardar
          </Button>
        }
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Organización</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Nombre</Label>
              <Input
                className="mt-1.5"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
              />
            </div>
            <div>
              <Label>Slug (para el kiosco)</Label>
              <Input
                className="mt-1.5 font-mono"
                value={org?.slug ?? ""}
                disabled
              />
            </div>
          </div>
        </CardBody>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Reglas de fichaje</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Máx. horas / día</Label>
              <Input
                type="number"
                step="0.5"
                className="mt-1.5 tabular-nums"
                value={rules.max_hours_day ?? 9}
                onChange={(e) =>
                  setRules({ ...rules, max_hours_day: Number(e.target.value) })
                }
              />
            </div>
            <div>
              <Label>Máx. horas / semana</Label>
              <Input
                type="number"
                step="0.5"
                className="mt-1.5 tabular-nums"
                value={rules.max_hours_week ?? 40}
                onChange={(e) =>
                  setRules({ ...rules, max_hours_week: Number(e.target.value) })
                }
              />
            </div>
            <div>
              <Label>Auto-cerrar tras (horas)</Label>
              <Input
                type="number"
                className="mt-1.5 tabular-nums"
                value={rules.auto_close_after_hours ?? 14}
                onChange={(e) =>
                  setRules({
                    ...rules,
                    auto_close_after_hours: Number(e.target.value),
                  })
                }
              />
            </div>
            <div>
              <Label>Descanso mín. entre turnos (h)</Label>
              <Input
                type="number"
                step="0.5"
                className="mt-1.5 tabular-nums"
                value={rules.min_rest_between_shifts_h ?? 12}
                onChange={(e) =>
                  setRules({
                    ...rules,
                    min_rest_between_shifts_h: Number(e.target.value),
                  })
                }
              />
            </div>
            <div>
              <Label>Descanso semanal (h)</Label>
              <Input
                type="number"
                step="0.5"
                className="mt-1.5 tabular-nums"
                value={rules.min_rest_week_h ?? 36}
                onChange={(e) =>
                  setRules({ ...rules, min_rest_week_h: Number(e.target.value) })
                }
              />
            </div>
            <div>
              <Label>Tolerancia retraso (min)</Label>
              <Input
                type="number"
                className="mt-1.5 tabular-nums"
                value={rules.late_tolerance_minutes ?? 10}
                onChange={(e) =>
                  setRules({
                    ...rules,
                    late_tolerance_minutes: Number(e.target.value),
                  })
                }
              />
            </div>
          </div>

          <div className="mt-6 space-y-3 pt-4 border-t border-slate-200">
            <Toggle
              label="Requerir geofence para fichar"
              description="Bloquea fichajes fuera del radio del local"
              value={!!rules.require_geofence}
              onChange={(v) => setRules({ ...rules, require_geofence: v })}
            />
            <Toggle
              label="Requerir foto (anti-fraude)"
              description="Pide una foto al fichar entrada y salida"
              value={!!rules.require_photo}
              onChange={(v) => setRules({ ...rules, require_photo: v })}
            />
            <Toggle
              label="Permitir fichaje desde móvil"
              description="Los empleados pueden fichar con su teléfono"
              value={!!rules.allow_mobile_clock}
              onChange={(v) => setRules({ ...rules, allow_mobile_clock: v })}
            />
            <Toggle
              label="Modo kiosco habilitado"
              description="Permite el uso de tablets fijas en los locales"
              value={!!rules.kiosk_enabled}
              onChange={(v) => setRules({ ...rules, kiosk_enabled: v })}
            />
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function Toggle({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between gap-4 cursor-pointer">
      <div>
        <div className="font-semibold text-sm">{label}</div>
        <div className="text-xs text-slate-500">{description}</div>
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={
          "relative h-6 w-11 rounded-full transition-colors shrink-0 " +
          (value ? "bg-brand-600" : "bg-slate-300")
        }
      >
        <span
          className={
            "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform " +
            (value ? "translate-x-5" : "")
          }
        />
      </button>
    </label>
  );
}
