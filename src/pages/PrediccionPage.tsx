import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { fmt } from '@/lib/queries';
import {
  TrendingUp, ShoppingCart, Package, AlertTriangle, Truck, Send, MessageCircle,
  Plus, Trash2, RefreshCw, Settings, Loader2,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// ─── Queries ───
async function fetchArqueosAll() {
  const { data, error } = await supabase.from('arqueos_z').select('*, arqueo_familias(*)').order('fecha', { ascending: false });
  if (error) throw error;
  return data;
}
async function fetchPlatos() {
  const { data, error } = await supabase.from('platos').select('*, plato_ingredientes(*)').order('nombre');
  if (error) throw error;
  return data;
}
async function fetchProductos() {
  const { data, error } = await supabase.from('productos').select('*').order('nombre');
  if (error) throw error;
  return data;
}
async function fetchStockMinimos() {
  const { data, error } = await supabase.from('stock_minimos').select('*');
  if (error) throw error;
  return data;
}
async function fetchPedidosSugeridos() {
  const { data, error } = await supabase.from('pedidos_sugeridos').select('*, pedido_sugerido_lineas(*)').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}
async function fetchProveedores() {
  const { data, error } = await supabase.from('proveedores').select('*').order('nombre');
  if (error) throw error;
  return data;
}
async function fetchStockConteos() {
  const { data, error } = await supabase.from('stock_conteos').select('*').order('fecha', { ascending: false });
  if (error) throw error;
  return data;
}
async function fetchFamilias() {
  const { data, error } = await supabase.from('familias').select('*');
  if (error) throw error;
  return data;
}

// ─── Helpers ───
function getDayOfWeek(dateStr: string) {
  return new Date(dateStr).getDay(); // 0=Sun
}
const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export default function PrediccionPage() {
  const qc = useQueryClient();
  const { data: arqueos = [] } = useQuery({ queryKey: ['arqueos-all'], queryFn: fetchArqueosAll });
  const { data: platos = [] } = useQuery({ queryKey: ['platos'], queryFn: fetchPlatos });
  const { data: productos = [] } = useQuery({ queryKey: ['productos'], queryFn: fetchProductos });
  const { data: stockMinimos = [] } = useQuery({ queryKey: ['stock-minimos'], queryFn: fetchStockMinimos });
  const { data: pedidos = [] } = useQuery({ queryKey: ['pedidos-sugeridos'], queryFn: fetchPedidosSugeridos });
  const { data: proveedores = [] } = useQuery({ queryKey: ['proveedores'], queryFn: fetchProveedores });
  const { data: stockConteos = [] } = useQuery({ queryKey: ['stock-conteos'], queryFn: fetchStockConteos });
  const { data: familias = [] } = useQuery({ queryKey: ['familias'], queryFn: fetchFamilias });

  const [generating, setGenerating] = useState(false);
  const [editPedido, setEditPedido] = useState<any>(null);
  const [minDialog, setMinDialog] = useState(false);

  // ─── Prediction algorithm ───
  const predicciones = useMemo(() => {
    if (arqueos.length === 0) return [];
    const today = new Date();
    const results: any[] = [];

    for (let d = 1; d <= 7; d++) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + d);
      const dow = targetDate.getDay();
      const dateStr = targetDate.toISOString().split('T')[0];

      // Get same day-of-week from last 8 weeks
      const sameDayArqueos = arqueos.filter(a => {
        const aDate = new Date(a.fecha);
        const diffDays = Math.floor((today.getTime() - aDate.getTime()) / 86400000);
        return getDayOfWeek(a.fecha) === dow && diffDays <= 56 && diffDays > 0;
      });

      const familyMap: Record<string, { totalUnits: number; totalImporte: number; count: number }> = {};
      sameDayArqueos.forEach(a => {
        (a.arqueo_familias || []).forEach((af: any) => {
          if (!familyMap[af.familia_nombre]) familyMap[af.familia_nombre] = { totalUnits: 0, totalImporte: 0, count: 0 };
          familyMap[af.familia_nombre].totalUnits += Number(af.unidades || 0);
          familyMap[af.familia_nombre].totalImporte += Number(af.importe || 0);
          familyMap[af.familia_nombre].count++;
        });
      });

      const weeksFound = sameDayArqueos.length;
      const confianza = Math.min(100, Math.round((weeksFound / 8) * 100));
      const familyPredictions = Object.entries(familyMap).map(([name, v]) => ({
        familia: name,
        unidades: Math.round(v.totalUnits / Math.max(v.count, 1)),
        importe: Math.round((v.totalImporte / Math.max(v.count, 1)) * 100) / 100,
      }));

      results.push({
        fecha: dateStr,
        dia: DIAS[dow],
        familias: familyPredictions,
        totalUnidades: familyPredictions.reduce((s, f) => s + f.unidades, 0),
        totalImporte: familyPredictions.reduce((s, f) => s + f.importe, 0),
        confianza,
      });
    }
    return results;
  }, [arqueos]);

  // ─── Generate orders ───
  const generateOrders = async () => {
    setGenerating(true);
    try {
      // Calculate ingredient needs from predictions using escandallos
      const ingredientNeeds: Record<string, { producto_id: string; nombre: string; cantidad: number; unidad: string; precio: number; proveedor_id?: string; proveedor_nombre?: string }> = {};

      for (const pred of predicciones) {
        for (const fp of pred.familias) {
          const familiaObj = familias.find(f => f.nombre === fp.familia);
          if (!familiaObj) continue;
          const platosFamily = platos.filter(p => p.familia_id === familiaObj.id);
          if (platosFamily.length === 0) continue;
          const unidadesPorPlato = fp.unidades / platosFamily.length;

          for (const plato of platosFamily) {
            for (const ing of (plato.plato_ingredientes || [])) {
              const pid = ing.producto_id;
              if (!pid) continue;
              const prod = productos.find(p => p.id === pid);
              const consumo = unidadesPorPlato * Number(ing.cantidad || 0) * (1 + Number(ing.merma_porcentaje || 0) / 100);
              if (!ingredientNeeds[pid]) {
                ingredientNeeds[pid] = {
                  producto_id: pid,
                  nombre: ing.producto_nombre || prod?.nombre || '',
                  cantidad: 0,
                  unidad: ing.unidad || prod?.unidad || 'ud',
                  precio: prod?.precio_actual || 0,
                  proveedor_id: prod?.proveedor_id || undefined,
                  proveedor_nombre: prod?.proveedor_nombre || '',
                };
              }
              ingredientNeeds[pid].cantidad += consumo;
            }
          }
        }
      }

      // Subtract stock actual (latest conteo)
      for (const [pid, need] of Object.entries(ingredientNeeds)) {
        const latestConteo = stockConteos.find(c => c.producto_id === pid);
        const stockActual = latestConteo ? Number(latestConteo.cantidad) : 0;
        need.cantidad = Math.max(0, need.cantidad - stockActual);
      }

      // Group by proveedor
      const byProveedor: Record<string, typeof ingredientNeeds[string][]> = {};
      for (const need of Object.values(ingredientNeeds)) {
        if (need.cantidad <= 0) continue;
        const key = need.proveedor_id || 'sin_proveedor';
        if (!byProveedor[key]) byProveedor[key] = [];
        byProveedor[key].push(need);
      }

      // Delete existing borradores
      const { data: existing } = await supabase.from('pedidos_sugeridos').select('id').eq('estado', 'borrador');
      if (existing && existing.length > 0) {
        for (const e of existing) {
          await supabase.from('pedidos_sugeridos').delete().eq('id', e.id);
        }
      }

      // Create pedidos
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const fechaEntrega = tomorrow.toISOString().split('T')[0];

      for (const [provId, items] of Object.entries(byProveedor)) {
        const prov = proveedores.find(p => p.id === provId);
        const total = items.reduce((s, i) => s + Math.ceil(i.cantidad) * i.precio, 0);

        const { data: pedido, error } = await supabase.from('pedidos_sugeridos').insert({
          fecha_entrega: fechaEntrega,
          proveedor_id: prov?.id || null,
          proveedor_nombre: prov?.nombre || 'Sin proveedor',
          total_estimado: Math.round(total * 100) / 100,
        }).select('id').single();
        if (error) throw error;

        const lineas = items.map(i => ({
          pedido_id: pedido.id,
          producto_id: i.producto_id,
          producto_nombre: i.nombre,
          cantidad_sugerida: Math.ceil(i.cantidad * 10) / 10,
          unidad: i.unidad,
          precio_estimado: i.precio,
          motivo: 'demanda_prevista',
          consumo_previsto: Math.round(i.cantidad * 100) / 100,
        }));

        if (lineas.length > 0) {
          const { error: lErr } = await supabase.from('pedido_sugerido_lineas').insert(lineas);
          if (lErr) throw lErr;
        }
      }

      qc.invalidateQueries({ queryKey: ['pedidos-sugeridos'] });
      toast.success(`Pedidos generados para ${Object.keys(byProveedor).length} proveedores`);
    } catch (e: any) {
      toast.error(e.message);
    }
    setGenerating(false);
  };

  // ─── Send functions ───
  const formatPedidoText = (pedido: any) => {
    const lineas = (pedido.pedido_sugerido_lineas || []) as any[];
    let text = `PEDIDO — Albarán360\nFecha: ${new Date().toLocaleDateString('es-ES')}\nProveedor: ${pedido.proveedor_nombre}\n\n`;
    text += 'Producto                  Cantidad    Unidad\n';
    text += '─────────────────────────────────────────────\n';
    lineas.forEach((l: any) => {
      const name = (l.producto_nombre || '').padEnd(26).slice(0, 26);
      const qty = String(l.cantidad_ajustada ?? l.cantidad_sugerida).padEnd(12);
      text += `${name}${qty}${l.unidad}\n`;
    });
    text += `\nTotal estimado: ${fmt(pedido.total_estimado)}`;
    return text;
  };

  const sendWhatsApp = (pedido: any) => {
    const text = encodeURIComponent(formatPedidoText(pedido));
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const sendEmail = (pedido: any) => {
    const prov = proveedores.find(p => p.id === pedido.proveedor_id);
    const email = prov?.email || '';
    const subject = encodeURIComponent(`Pedido - ${pedido.proveedor_nombre} - ${new Date().toLocaleDateString('es-ES')}`);
    const body = encodeURIComponent(formatPedidoText(pedido));
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_blank');
  };

  const markSent = async (id: string) => {
    await supabase.from('pedidos_sugeridos').update({ estado: 'enviado' }).eq('id', id);
    qc.invalidateQueries({ queryKey: ['pedidos-sugeridos'] });
    toast.success('Marcado como enviado');
  };

  const markReceived = async (id: string) => {
    await supabase.from('pedidos_sugeridos').update({ estado: 'recibido' }).eq('id', id);
    qc.invalidateQueries({ queryKey: ['pedidos-sugeridos'] });
    toast.success('Marcado como recibido');
  };

  const deletePedido = async (id: string) => {
    await supabase.from('pedidos_sugeridos').delete().eq('id', id);
    qc.invalidateQueries({ queryKey: ['pedidos-sugeridos'] });
    toast.success('Pedido eliminado');
  };

  // ─── Auto-configure minimums ───
  const autoConfigMinimos = async () => {
    try {
      // Calculate weekly consumption per product from last 8 weeks of arqueos + escandallos
      const consumoSemanal: Record<string, number> = {};
      const last8w = arqueos.filter(a => {
        const diff = Math.floor((Date.now() - new Date(a.fecha).getTime()) / 86400000);
        return diff <= 56;
      });
      const weeks = Math.max(1, Math.ceil(last8w.length / 7));

      for (const a of last8w) {
        for (const af of (a.arqueo_familias || [])) {
          const fam = familias.find(f => f.nombre === af.familia_nombre);
          if (!fam) continue;
          const platosF = platos.filter(p => p.familia_id === fam.id);
          if (platosF.length === 0) continue;
          const uPorPlato = Number(af.unidades || 0) / platosF.length;
          for (const pl of platosF) {
            for (const ing of (pl.plato_ingredientes || [])) {
              if (!ing.producto_id) continue;
              const c = uPorPlato * Number(ing.cantidad || 0) * (1 + Number(ing.merma_porcentaje || 0) / 100);
              consumoSemanal[ing.producto_id] = (consumoSemanal[ing.producto_id] || 0) + c;
            }
          }
        }
      }

      const rows = Object.entries(consumoSemanal).map(([pid, total]) => {
        const avg = total / weeks;
        return {
          producto_id: pid,
          cantidad_minima: Math.round(avg * 1.5 * 10) / 10,
          cantidad_reposicion: Math.round(avg * 10) / 10,
          dias_entrega: 1,
        };
      });

      if (rows.length > 0) {
        // Upsert
        for (const r of rows) {
          const { data: existing } = await supabase.from('stock_minimos').select('id').eq('producto_id', r.producto_id).maybeSingle();
          if (existing) {
            await supabase.from('stock_minimos').update(r).eq('producto_id', r.producto_id);
          } else {
            await supabase.from('stock_minimos').insert(r);
          }
        }
        qc.invalidateQueries({ queryKey: ['stock-minimos'] });
        toast.success(`${rows.length} mínimos configurados`);
      } else {
        toast.info('No hay datos suficientes para auto-configurar');
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // ─── KPIs ───
  const ventasPrevistas = predicciones.reduce((s, p) => s + p.totalImporte, 0);
  const comprasNecesarias = pedidos.filter(p => p.estado === 'borrador').reduce((s, p) => s + Number(p.total_estimado || 0), 0);
  const productosBajoMinimo = useMemo(() => {
    return stockMinimos.filter(sm => {
      const conteo = stockConteos.find(c => c.producto_id === sm.producto_id);
      return (conteo ? Number(conteo.cantidad) : 0) < Number(sm.cantidad_minima);
    }).length;
  }, [stockMinimos, stockConteos]);
  const pedidosPendientes = pedidos.filter(p => p.estado === 'borrador').length;

  const estadoColors: Record<string, string> = {
    borrador: 'bg-muted text-muted-foreground',
    enviado: 'bg-primary/10 text-primary',
    confirmado: 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]',
    recibido: 'bg-[hsl(var(--success))]/20 text-[hsl(var(--success))]',
  };

  return (
    <div className="space-y-4 md:space-y-5">
      <PageHeader title="Predicción y Pedidos" description="Demanda prevista y pedidos inteligentes" />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><TrendingUp className="h-4 w-4" /> Ventas previstas (7d)</div>
          <p className="text-lg md:text-xl font-bold tabular-nums">{fmt(ventasPrevistas)}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><ShoppingCart className="h-4 w-4" /> Compras necesarias</div>
          <p className="text-lg md:text-xl font-bold tabular-nums">{fmt(comprasNecesarias)}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><AlertTriangle className="h-4 w-4" /> Bajo mínimo</div>
          <p className="text-lg md:text-xl font-bold tabular-nums">{productosBajoMinimo}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><Package className="h-4 w-4" /> Pedidos pendientes</div>
          <p className="text-lg md:text-xl font-bold tabular-nums">{pedidosPendientes}</p>
        </Card>
      </div>

      <Tabs defaultValue="prediccion" className="space-y-4">
        <TabsList>
          <TabsTrigger value="prediccion">Predicción semanal</TabsTrigger>
          <TabsTrigger value="pedidos">Pedidos sugeridos</TabsTrigger>
          <TabsTrigger value="minimos">Stock mínimos</TabsTrigger>
        </TabsList>

        {/* ─── Tab: Predicción ─── */}
        <TabsContent value="prediccion" className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={generateOrders} disabled={generating || predicciones.length === 0}>
              {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Generar pedidos desde predicción
            </Button>
          </div>

          {predicciones.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              <p>No hay datos de arqueos para generar predicciones.</p>
              <p className="text-xs mt-1">Introduce arqueos Z para que el sistema pueda predecir la demanda.</p>
            </Card>
          ) : (
            <div className="grid gap-3">
              {predicciones.map(pred => (
                <Card key={pred.fecha} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-semibold">{pred.dia} {new Date(pred.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                      <Badge variant="outline" className="ml-2 text-xs">{pred.confianza}% confianza</Badge>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold tabular-nums">{pred.totalUnidades} uds</span>
                      <span className="text-xs text-muted-foreground ml-2">{fmt(pred.totalImporte)}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {pred.familias.sort((a: any, b: any) => b.unidades - a.unidades).slice(0, 6).map((f: any) => (
                      <Badge key={f.familia} variant="secondary" className="text-xs">
                        {f.familia}: {f.unidades} uds
                      </Badge>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ─── Tab: Pedidos ─── */}
        <TabsContent value="pedidos" className="space-y-4">
          {pedidos.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              <p>No hay pedidos sugeridos aún.</p>
              <p className="text-xs mt-1">Genera pedidos desde la pestaña de predicción.</p>
            </Card>
          ) : (
            <div className="grid gap-4">
              {pedidos.map(ped => {
                const lineas = (ped as any).pedido_sugerido_lineas || [];
                return (
                  <Card key={ped.id} className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold flex items-center gap-2">
                          <Truck className="h-4 w-4" />
                          {ped.proveedor_nombre}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Entrega: {new Date(ped.fecha_entrega).toLocaleDateString('es-ES')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={estadoColors[ped.estado || 'borrador']}>{ped.estado}</Badge>
                        <span className="font-bold tabular-nums">{fmt(ped.total_estimado)}</span>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b text-muted-foreground">
                            <th className="text-left py-1">Producto</th>
                            <th className="text-right py-1">Cantidad</th>
                            <th className="text-left py-1 pl-2">Ud.</th>
                            <th className="text-right py-1">Precio est.</th>
                            <th className="text-right py-1">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lineas.map((l: any) => (
                            <tr key={l.id} className="border-b border-border/50">
                              <td className="py-1.5">{l.producto_nombre}</td>
                              <td className="text-right py-1.5 tabular-nums">{l.cantidad_ajustada ?? l.cantidad_sugerida}</td>
                              <td className="py-1.5 pl-2 text-muted-foreground">{l.unidad}</td>
                              <td className="text-right py-1.5 tabular-nums">{fmt(l.precio_estimado)}</td>
                              <td className="text-right py-1.5 tabular-nums font-medium">
                                {fmt((l.cantidad_ajustada ?? l.cantidad_sugerida) * l.precio_estimado)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-3">
                      {ped.estado === 'borrador' && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => sendWhatsApp(ped)}>
                            <MessageCircle className="h-3.5 w-3.5 mr-1" /> WhatsApp
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => sendEmail(ped)}>
                            <Send className="h-3.5 w-3.5 mr-1" /> Email
                          </Button>
                          <Button size="sm" onClick={() => markSent(ped.id)}>Marcar enviado</Button>
                        </>
                      )}
                      {ped.estado === 'enviado' && (
                        <Button size="sm" onClick={() => markReceived(ped.id)}>Marcar recibido</Button>
                      )}
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deletePedido(ped.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ─── Tab: Mínimos ─── */}
        <TabsContent value="minimos" className="space-y-4">
          <div className="flex gap-2">
            <Button variant="outline" onClick={autoConfigMinimos}>
              <Settings className="h-4 w-4 mr-2" /> Auto-configurar mínimos
            </Button>
          </div>
          <Card className="overflow-x-auto">
            <table className="w-full text-xs md:text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left p-2">Producto</th>
                  <th className="text-right p-2">Mínimo</th>
                  <th className="text-right p-2">Reposición</th>
                  <th className="text-right p-2">Días entrega</th>
                  <th className="text-right p-2">Stock actual</th>
                  <th className="text-center p-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {stockMinimos.length === 0 ? (
                  <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">Sin configuración. Usa "Auto-configurar" para generar mínimos.</td></tr>
                ) : stockMinimos.map(sm => {
                  const prod = productos.find(p => p.id === sm.producto_id);
                  const conteo = stockConteos.find(c => c.producto_id === sm.producto_id);
                  const actual = conteo ? Number(conteo.cantidad) : 0;
                  const bajo = actual < Number(sm.cantidad_minima);
                  return (
                    <tr key={sm.id} className="border-b border-border/50">
                      <td className="p-2">{prod?.nombre || sm.producto_id}</td>
                      <td className="text-right p-2 tabular-nums">{sm.cantidad_minima}</td>
                      <td className="text-right p-2 tabular-nums">{sm.cantidad_reposicion}</td>
                      <td className="text-right p-2 tabular-nums">{sm.dias_entrega}</td>
                      <td className="text-right p-2 tabular-nums">{actual}</td>
                      <td className="text-center p-2">
                        {bajo
                          ? <Badge variant="destructive" className="text-[10px]">Bajo</Badge>
                          : <Badge variant="secondary" className="text-[10px]">OK</Badge>
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
