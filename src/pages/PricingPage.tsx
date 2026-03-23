import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { fmt } from '@/lib/queries';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Clock, X, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';

export default function PricingPage() {
  const qc = useQueryClient();
  const [filtroEstado, setFiltroEstado] = useState('pendiente');

  const { data: sugerencias = [], isLoading } = useQuery({
    queryKey: ['sugerencias-precio'],
    queryFn: async () => {
      const { data, error } = await supabase.from('sugerencias_precio').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: historial = [] } = useQuery({
    queryKey: ['historial-pvp'],
    queryFn: async () => {
      const { data, error } = await supabase.from('historial_pvp_carta').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const aplicarMut = useMutation({
    mutationFn: async (sug: any) => {
      // Update plato PVP
      await supabase.from('platos').update({ pvp: sug.pvp_sugerido, coste: sug.coste_nuevo }).eq('id', sug.plato_id);
      // Record history
      await supabase.from('historial_pvp_carta').insert({
        plato_id: sug.plato_id,
        pvp_anterior: sug.pvp_actual,
        pvp_nuevo: sug.pvp_sugerido,
        motivo: 'sugerencia_sistema',
        sugerencia_id: sug.id,
      });
      // Mark as applied
      await supabase.from('sugerencias_precio').update({ estado: 'aplicada', fecha_aplicada: new Date().toISOString() }).eq('id', sug.id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sugerencias-precio'] }); qc.invalidateQueries({ queryKey: ['historial-pvp'] }); toast.success('PVP actualizado'); },
  });

  const descartarMut = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('sugerencias_precio').update({ estado: 'descartada' }).eq('id', id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sugerencias-precio'] }); toast.success('Descartada'); },
  });

  const posponerMut = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('sugerencias_precio').update({ estado: 'pospuesta' }).eq('id', id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sugerencias-precio'] }); toast.success('Pospuesta'); },
  });

  // Generate suggestions from current price alerts
  const generarMut = useMutation({
    mutationFn: async () => {
      // Get all platos with ingredients
      const { data: platos } = await supabase.from('platos').select('*, plato_ingredientes(*)');
      // Get recent price alerts (unread)
      const { data: alertas } = await supabase.from('alertas_precio').select('*').eq('leida', false);
      if (!platos || !alertas || alertas.length === 0) throw new Error('No hay cambios de precio recientes');

      const nuevas: any[] = [];
      for (const alerta of alertas) {
        const platosAfectados = platos.filter(p =>
          p.plato_ingredientes?.some((i: any) => i.producto_id === alerta.producto_id)
        );
        for (const plato of platosAfectados) {
          const pvp = Number(plato.pvp || 0);
          const costeAnterior = Number(plato.coste || 0);
          const ingrediente = plato.plato_ingredientes?.find((i: any) => i.producto_id === alerta.producto_id);
          if (!ingrediente || !pvp) continue;

          const cantidadIng = Number(ingrediente.cantidad || 0);
          const precioAnterior = Number(alerta.precio_anterior || 0);
          const precioNuevo = Number(alerta.precio_nuevo || 0);
          const diffPrecio = precioNuevo - precioAnterior;
          const diffCoste = diffPrecio * cantidadIng * (1 + Number(ingrediente.merma_porcentaje || 0) / 100);
          const costeNuevo = costeAnterior + diffCoste;
          if (Math.abs(diffCoste / costeAnterior) < 0.03 && costeAnterior > 0) continue;

          const fcAnterior = pvp > 0 ? (costeAnterior / pvp) * 100 : 0;
          const fcNuevo = pvp > 0 ? (costeNuevo / pvp) * 100 : 0;
          let tipo = 'aceptar_impacto';
          let descripcion = '';
          let pvpSugerido = pvp;

          if (diffCoste < 0) {
            tipo = 'oportunidad';
            descripcion = `${alerta.producto_id ? ingrediente.producto_nombre : 'Producto'} ha bajado. Tu margen ha mejorado ${fmt(Math.abs(diffCoste))} por plato.`;
          } else if (fcNuevo > 40) {
            tipo = 'subir_precio';
            pvpSugerido = Math.round((costeNuevo / 0.33) * 100) / 100;
            descripcion = `⚠️ URGENTE: Food cost supera 40%. Subir PVP a ${fmt(pvpSugerido)} para mantener margen.`;
          } else if (fcNuevo > 35) {
            tipo = 'subir_precio';
            pvpSugerido = Math.round((costeNuevo / 0.33) * 100) / 100;
            descripcion = `Subir PVP de ${fmt(pvp)} a ${fmt(pvpSugerido)} para mantener margen del 33%.`;
          } else if (fcNuevo > 30) {
            tipo = 'aceptar_impacto';
            descripcion = 'Food cost ha subido pero sigue aceptable. Vigila la tendencia.';
          } else {
            tipo = 'aceptar_impacto';
            descripcion = 'Food cost en zona óptima. No es necesario ajustar.';
          }

          const { data: famData } = await supabase.from('familias').select('nombre').eq('id', plato.familia_id || '').single();

          nuevas.push({
            plato_id: plato.id,
            plato_nombre: plato.nombre,
            familia: famData?.nombre || '',
            pvp_actual: pvp,
            coste_anterior: costeAnterior,
            food_cost_anterior_pct: fcAnterior,
            margen_anterior: pvp - costeAnterior,
            coste_nuevo: costeNuevo,
            food_cost_nuevo_pct: fcNuevo,
            margen_nuevo: pvp - costeNuevo,
            producto_id: alerta.producto_id,
            producto_nombre: ingrediente.producto_nombre,
            precio_producto_anterior: alerta.precio_anterior,
            precio_producto_nuevo: alerta.precio_nuevo,
            variacion_producto_pct: alerta.variacion_pct,
            tipo_sugerencia: tipo,
            pvp_sugerido: pvpSugerido,
            pvp_sugerido_con_iva: Math.round(pvpSugerido * 1.10 * 100) / 100,
            descripcion,
          });
        }
        await supabase.from('alertas_precio').update({ leida: true }).eq('id', alerta.id);
      }
      if (nuevas.length > 0) {
        await supabase.from('sugerencias_precio').insert(nuevas);
      }
      return nuevas.length;
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ['sugerencias-precio'] });
      toast.success(`${count} sugerencias generadas`);
    },
    onError: (e: any) => toast.error(e.message || 'Error generando'),
  });

  const pendientes = sugerencias.filter(s => s.estado === 'pendiente');
  const peligro = sugerencias.filter(s => Number(s.food_cost_nuevo_pct) > 35);
  const oportunidades = sugerencias.filter(s => s.tipo_sugerencia === 'oportunidad' && s.estado === 'pendiente');
  const filtered = filtroEstado === 'todas' ? sugerencias : sugerencias.filter(s => s.estado === filtroEstado);

  const getBorderColor = (sug: any) => {
    if (sug.tipo_sugerencia === 'oportunidad') return 'border-l-4 border-l-[hsl(var(--success))]';
    if (Number(sug.food_cost_nuevo_pct) > 40) return 'border-l-4 border-l-destructive';
    if (Number(sug.food_cost_nuevo_pct) > 35) return 'border-l-4 border-l-yellow-500';
    return 'border-l-4 border-l-[hsl(var(--muted))]';
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Pricing Dinámico" description="Sugerencias automáticas de ajuste de precio basadas en cambios de coste">
        <Button onClick={() => generarMut.mutate()} disabled={generarMut.isPending} className="gap-2 active:scale-95">
          {generarMut.isPending ? 'Generando...' : '🔄 Generar sugerencias'}
        </Button>
      </PageHeader>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-fade-in-up">
        <div className="panel-card">
          <div className="panel-card-header"><Clock className="h-4 w-4" /><span>Pendientes</span></div>
          <div className="panel-card-value text-xl">{pendientes.length}</div>
        </div>
        <div className="panel-card">
          <div className="panel-card-header"><AlertTriangle className="h-4 w-4" /><span>Food cost &gt;35%</span></div>
          <div className="panel-card-value text-xl text-destructive">{peligro.length}</div>
        </div>
        <div className="panel-card">
          <div className="panel-card-header"><TrendingDown className="h-4 w-4" /><span>Oportunidades</span></div>
          <div className="panel-card-value text-xl text-[hsl(var(--success))]">{oportunidades.length}</div>
        </div>
        <div className="panel-card">
          <div className="panel-card-header"><CheckCircle className="h-4 w-4" /><span>Aplicadas</span></div>
          <div className="panel-card-value text-xl">{sugerencias.filter(s => s.estado === 'aplicada').length}</div>
        </div>
      </div>

      <Tabs defaultValue="sugerencias">
        <TabsList>
          <TabsTrigger value="sugerencias">Sugerencias</TabsTrigger>
          <TabsTrigger value="historial">Historial PVP</TabsTrigger>
        </TabsList>

        <TabsContent value="sugerencias" className="space-y-3 mt-4">
          {/* Filter */}
          <div className="flex gap-2 flex-wrap">
            {['pendiente', 'aplicada', 'descartada', 'pospuesta', 'todas'].map(e => (
              <Button key={e} variant={filtroEstado === e ? 'default' : 'outline'} size="sm" onClick={() => setFiltroEstado(e)} className="capitalize">
                {e}
              </Button>
            ))}
          </div>

          {isLoading ? (
            <div className="text-sm text-muted-foreground p-8 text-center">Cargando...</div>
          ) : filtered.length === 0 ? (
            <div className="text-sm text-muted-foreground p-8 text-center">No hay sugerencias. Pulsa "Generar sugerencias" cuando haya alertas de precio.</div>
          ) : (
            <div className="space-y-3">
              {filtered.map(sug => (
                <div key={sug.id} className={`bg-card border rounded-lg p-4 ${getBorderColor(sug)} animate-fade-in-up`}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {sug.tipo_sugerencia === 'oportunidad' ? (
                          <Badge variant="outline" className="bg-[hsl(var(--success-highlight))] text-[hsl(var(--success))]">🟢 Oportunidad</Badge>
                        ) : Number(sug.food_cost_nuevo_pct) > 40 ? (
                          <Badge variant="destructive">⚠️ Urgente</Badge>
                        ) : Number(sug.food_cost_nuevo_pct) > 35 ? (
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">⚠️ Revisar</Badge>
                        ) : (
                          <Badge variant="secondary">ℹ️ Info</Badge>
                        )}
                        <span className="font-semibold">{sug.plato_nombre}</span>
                        {sug.familia && <span className="text-xs text-muted-foreground">{sug.familia}</span>}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {sug.producto_nombre} ha {Number(sug.variacion_producto_pct) > 0 ? 'subido' : 'bajado'} de {fmt(Number(sug.precio_producto_anterior))} a {fmt(Number(sug.precio_producto_nuevo))} ({Number(sug.variacion_producto_pct) > 0 ? '+' : ''}{Number(sug.variacion_producto_pct).toFixed(1)}%)
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0">{sug.estado}</Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
                    <div>
                      <span className="text-xs text-muted-foreground">Food cost</span>
                      <div className="font-semibold tabular-nums">
                        {Number(sug.food_cost_anterior_pct).toFixed(1)}% → <span className={Number(sug.food_cost_nuevo_pct) > 35 ? 'text-destructive' : ''}>{Number(sug.food_cost_nuevo_pct).toFixed(1)}%</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Margen</span>
                      <div className="font-semibold tabular-nums">{fmt(Number(sug.margen_anterior))} → {fmt(Number(sug.margen_nuevo))}</div>
                    </div>
                    {sug.tipo_sugerencia === 'subir_precio' && (
                      <>
                        <div>
                          <span className="text-xs text-muted-foreground">PVP sugerido</span>
                          <div className="font-semibold tabular-nums text-primary">{fmt(Number(sug.pvp_sugerido))}</div>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground">Con IVA</span>
                          <div className="font-semibold tabular-nums">{fmt(Number(sug.pvp_sugerido_con_iva))}</div>
                        </div>
                      </>
                    )}
                  </div>

                  <p className="text-sm mb-3">💡 {sug.descripcion}</p>

                  {sug.estado === 'pendiente' && (
                    <div className="flex gap-2 flex-wrap">
                      {sug.tipo_sugerencia === 'subir_precio' && (
                        <Button size="sm" onClick={() => aplicarMut.mutate(sug)} disabled={aplicarMut.isPending} className="gap-1 active:scale-95">
                          <CheckCircle className="h-3.5 w-3.5" /> Aplicar subida
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => posponerMut.mutate(sug.id)} className="gap-1">
                        <Clock className="h-3.5 w-3.5" /> Posponer
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => descartarMut.mutate(sug.id)} className="gap-1 text-muted-foreground">
                        <X className="h-3.5 w-3.5" /> Descartar
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="historial" className="mt-4">
          {historial.length === 0 ? (
            <div className="text-sm text-muted-foreground p-8 text-center">Sin cambios de PVP registrados</div>
          ) : (
            <div className="bg-card border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[hsl(var(--surface-offset))]">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fecha</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Plato</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">PVP anterior</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">PVP nuevo</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Variación</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Motivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historial.map((h: any) => {
                      const diff = Number(h.pvp_nuevo) - Number(h.pvp_anterior);
                      const pct = Number(h.pvp_anterior) > 0 ? (diff / Number(h.pvp_anterior) * 100) : 0;
                      return (
                        <tr key={h.id} className="border-t border-[hsl(var(--divider))]">
                          <td className="px-4 py-3 text-muted-foreground">{new Date(h.created_at).toLocaleDateString('es-ES')}</td>
                          <td className="px-4 py-3 font-medium">{h.plato_id}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{fmt(Number(h.pvp_anterior))}</td>
                          <td className="px-4 py-3 text-right tabular-nums font-semibold">{fmt(Number(h.pvp_nuevo))}</td>
                          <td className={`px-4 py-3 text-right tabular-nums font-semibold ${diff > 0 ? 'text-destructive' : 'text-[hsl(var(--success))]'}`}>
                            {diff > 0 ? '+' : ''}{pct.toFixed(1)}%
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{h.motivo}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
