import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DeleteDialog } from '@/components/DeleteDialog';
import { ZoomableImage } from '@/components/ZoomableImage';
import { supabase } from '@/integrations/supabase/client';
import { fetchAlbaranes } from '@/lib/queries';
import { toast } from 'sonner';
import { Search, Eye, Pencil, Trash2, Image, CheckSquare, X, Plus, Save, Percent, Receipt, Calculator } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

const statusMap: Record<string, { label: string; className: string }> = {
  procesado: { label: 'Procesado', className: 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/20' },
  pendiente: { label: 'Pendiente', className: 'bg-amber-500/15 text-amber-600 border border-amber-500/20' },
  pendiente_verificacion: { label: 'Verificar', className: 'bg-blue-500/15 text-blue-600 border border-blue-500/20' },
  procesando: { label: 'Procesando…', className: 'bg-amber-500/15 text-amber-600 border border-amber-500/20 animate-pulse' },
  rechazado: { label: 'Rechazado', className: 'bg-destructive/15 text-destructive border border-destructive/20' },
  revisar: { label: 'Revisar', className: 'bg-destructive/15 text-destructive border border-destructive/20' },
  error: { label: 'Error', className: 'bg-destructive/15 text-destructive border border-destructive/20' },
};

function fmt(n: number | null | undefined): string {
  return (n || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

interface EditableLine {
  id?: string;
  codigo: string;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  importe: number;
  iva_pct: number;
  descuento_pct: number;
  descuento_tipo: string; // '%' or '€'
}

interface IvaDesglose {
  base: number;
  tipo: number;
  cuota: number;
}

interface AlbaranExtra {
  descuento_global_pct: number;
  subtotal: number;
  iva_desglose: IvaDesglose[];
  notas: string;
  fecha_vencimiento: string;
}

export default function AlbaranesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Review state
  const [reviewAlbaran, setReviewAlbaran] = useState<Tables<'albaranes'> | null>(null);
  const [reviewLines, setReviewLines] = useState<EditableLine[]>([]);
  const [extraData, setExtraData] = useState<AlbaranExtra>({ descuento_global_pct: 0, subtotal: 0, iva_desglose: [], notas: '', fecha_vencimiento: '' });
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('lineas');

  const { data: albaranes = [], isLoading } = useQuery({
    queryKey: ['albaranes'],
    queryFn: fetchAlbaranes,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('lineas_albaran').delete().eq('albaran_id', id);
      const { error } = await supabase.from('albaranes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['albaranes'] });
      toast.success('Albarán eliminado');
      setDeleteId(null);
    },
    onError: () => toast.error('Error al eliminar'),
  });

  const filtered = albaranes.filter((a: Tables<'albaranes'>) => {
    const matchSearch = !search || (a.proveedor_nombre || '').toLowerCase().includes(search.toLowerCase()) || (a.numero || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'todos' || a.estado === statusFilter;
    return matchSearch && matchStatus;
  });

  // Open review panel
  const handleReview = async (a: Tables<'albaranes'>) => {
    setReviewAlbaran(a);
    setActiveTab('lineas');
    const { data } = await supabase
      .from('lineas_albaran')
      .select('*')
      .eq('albaran_id', a.id);
    setReviewLines(
      (data || []).map(l => ({
        id: l.id,
        codigo: l.codigo || '',
        descripcion: l.descripcion,
        cantidad: l.cantidad || 1,
        precio_unitario: l.precio_unitario || 0,
        importe: l.importe || 0,
        iva_pct: l.iva_pct || 0,
        descuento_pct: l.descuento_pct || 0,
        descuento_tipo: l.descuento_tipo || '%',
      }))
    );

    // Parse datos_ia for extra fields
    const ia = (a.datos_ia && typeof a.datos_ia === 'object' && !Array.isArray(a.datos_ia)) ? a.datos_ia as Record<string, unknown> : {};
    setExtraData({
      descuento_global_pct: Number(ia.descuento_global_pct) || 0,
      subtotal: Number(ia.subtotal) || 0,
      iva_desglose: Array.isArray(ia.iva_desglose) ? (ia.iva_desglose as IvaDesglose[]) : [],
      notas: String(ia.notas || ''),
      fecha_vencimiento: String(ia.fecha_vencimiento || ''),
    });
  };

  // Recalculate line importe with discounts
  const calcLineImporte = (line: EditableLine) => {
    const bruto = line.cantidad * line.precio_unitario;
    if (line.descuento_pct > 0) {
      if (line.descuento_tipo === '%') {
        return Math.round(bruto * (1 - line.descuento_pct / 100) * 100) / 100;
      } else {
        return Math.round((bruto - line.descuento_pct) * 100) / 100;
      }
    }
    return Math.round(bruto * 100) / 100;
  };

  // Update a line field
  const updateLine = (idx: number, field: keyof EditableLine, value: string | number) => {
    setReviewLines(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      // Auto-calc importe
      if (['cantidad', 'precio_unitario', 'descuento_pct', 'descuento_tipo'].includes(field)) {
        updated[idx].importe = calcLineImporte(updated[idx]);
      }
      return updated;
    });
  };

  const addLine = () => {
    setReviewLines(prev => [...prev, { codigo: '', descripcion: '', cantidad: 1, precio_unitario: 0, importe: 0, iva_pct: 10, descuento_pct: 0, descuento_tipo: '%' }]);
  };

  const removeLine = (idx: number) => {
    setReviewLines(prev => prev.filter((_, i) => i !== idx));
  };

  // Computed totals
  const subtotalLineas = reviewLines.reduce((s, l) => s + (l.importe || 0), 0);
  const descuentoGlobal = extraData.descuento_global_pct > 0 ? subtotalLineas * (extraData.descuento_global_pct / 100) : 0;
  const baseImponible = subtotalLineas - descuentoGlobal;

  // Auto-calculate IVA from lines
  const ivaFromLines: Record<number, { base: number; cuota: number }> = {};
  reviewLines.forEach(l => {
    const lineBase = l.importe * (1 - (extraData.descuento_global_pct || 0) / 100);
    if (!ivaFromLines[l.iva_pct]) ivaFromLines[l.iva_pct] = { base: 0, cuota: 0 };
    ivaFromLines[l.iva_pct].base += lineBase;
    ivaFromLines[l.iva_pct].cuota += lineBase * (l.iva_pct / 100);
  });
  const totalIva = Object.values(ivaFromLines).reduce((s, v) => s + v.cuota, 0);
  const totalFinal = baseImponible + totalIva;

  // Save changes
  const handleSave = async (markProcessed: boolean) => {
    if (!reviewAlbaran) return;
    setSaving(true);
    try {
      await supabase.from('lineas_albaran').delete().eq('albaran_id', reviewAlbaran.id);
      if (reviewLines.length > 0) {
        const rows = reviewLines.map(l => ({
          albaran_id: reviewAlbaran.id,
          codigo: l.codigo,
          descripcion: l.descripcion,
          cantidad: l.cantidad,
          precio_unitario: l.precio_unitario,
          importe: l.importe,
          iva_pct: l.iva_pct,
          descuento_pct: l.descuento_pct,
          descuento_tipo: l.descuento_tipo,
        }));
        const { error: lineErr } = await supabase.from('lineas_albaran').insert(rows);
        if (lineErr) throw lineErr;
      }

      const { error: upErr } = await supabase.from('albaranes').update({
        importe: Math.round(totalFinal * 100) / 100,
        estado: markProcessed ? 'procesado' : reviewAlbaran.estado,
        datos_ia: {
          subtotal: Math.round(subtotalLineas * 100) / 100,
          descuento_global_pct: extraData.descuento_global_pct,
          iva_desglose: Object.entries(ivaFromLines).map(([tipo, v]) => ({
            tipo: Number(tipo),
            base: Math.round(v.base * 100) / 100,
            cuota: Math.round(v.cuota * 100) / 100,
          })),
          notas: extraData.notas,
          fecha_vencimiento: extraData.fecha_vencimiento,
        },
      }).eq('id', reviewAlbaran.id);
      if (upErr) throw upErr;

      if (reviewAlbaran.proveedor_id) {
        await supabase.from('aprendizaje').insert([{
          proveedor_id: reviewAlbaran.proveedor_id,
          tipo: 'revision',
          descripcion: `Revisión albarán ${reviewAlbaran.numero || 'SN'}: ${reviewLines.length} líneas, total ${fmt(totalFinal)}`,
          datos_despues: JSON.parse(JSON.stringify({ lineas: reviewLines, total: totalFinal })),
        }]);
      }

      queryClient.invalidateQueries({ queryKey: ['albaranes'] });
      toast.success(markProcessed ? 'Albarán verificado y guardado' : 'Cambios guardados');
      setReviewAlbaran(null);
    } catch (err) {
      toast.error('Error al guardar');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // ─── REVIEW SPLIT VIEW ───
  if (reviewAlbaran) {
    return (
      <div className="h-[calc(100vh-3.5rem)] md:h-[calc(100vh-4rem)] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-3 md:px-4 py-2.5 md:py-3 border-b bg-card shrink-0">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <button onClick={() => setReviewAlbaran(null)} className="p-1.5 rounded-md hover:bg-muted transition-colors active:scale-95 shrink-0">
              <X className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h2 className="font-semibold text-xs md:text-sm truncate">Albarán {reviewAlbaran.numero || 'sin número'}</h2>
              <p className="text-[10px] md:text-xs text-muted-foreground truncate">{reviewAlbaran.proveedor_nombre} · {reviewAlbaran.fecha}</p>
            </div>
          </div>
          <div className="flex gap-1.5 md:gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => handleSave(false)} disabled={saving} className="gap-1 md:gap-1.5 active:scale-95 h-8 text-xs px-2 md:px-3">
              <Save className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Guardar</span>
            </Button>
            <Button size="sm" onClick={() => handleSave(true)} disabled={saving} className="gap-1 md:gap-1.5 active:scale-95 h-8 text-xs px-2 md:px-3">
              <CheckSquare className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Verificar</span>
            </Button>
          </div>
        </div>

        {/* Split view — stacked on mobile, side by side on md+ */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Image — collapsed on mobile with toggle */}
          <div className="hidden md:flex w-1/2 border-r bg-muted/30 p-2">
            {reviewAlbaran.imagen_url ? (
              <ZoomableImage src={reviewAlbaran.imagen_url} alt="Albarán escaneado" />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                <Image className="h-12 w-12 mb-3 opacity-30" />
                <p className="text-sm">Sin imagen</p>
              </div>
            )}
          </div>
          {/* Mobile: small image button */}
          {reviewAlbaran.imagen_url && (
            <div className="md:hidden px-3 py-2 border-b bg-muted/20 shrink-0">
              <a href={reviewAlbaran.imagen_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs text-primary font-medium">
                <Image className="h-4 w-4" /> Ver imagen del albarán
              </a>
            </div>
          )}

          {/* Right: Tabbed editor */}
          <div className="flex-1 md:w-1/2 flex flex-col overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 overflow-hidden">
              <div className="px-3 pt-2 shrink-0 border-b bg-card/50">
                <TabsList className="h-9">
                  <TabsTrigger value="lineas" className="text-xs gap-1.5">
                    <Receipt className="h-3.5 w-3.5" /> Líneas ({reviewLines.length})
                  </TabsTrigger>
                  <TabsTrigger value="descuentos" className="text-xs gap-1.5">
                    <Percent className="h-3.5 w-3.5" /> Descuentos
                  </TabsTrigger>
                  <TabsTrigger value="iva" className="text-xs gap-1.5">
                    <Calculator className="h-3.5 w-3.5" /> IVA / Totales
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* TAB: Líneas */}
              <TabsContent value="lineas" className="flex-1 flex flex-col overflow-hidden m-0">
                <div className="px-3 py-2 border-b bg-card/30 flex items-center justify-between shrink-0">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Subtotal líneas: {fmt(subtotalLineas)}
                  </span>
                  <Button variant="outline" size="sm" onClick={addLine} className="gap-1.5 h-7 text-xs active:scale-95">
                    <Plus className="h-3 w-3" /> Línea
                  </Button>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {reviewLines.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <p className="text-sm mb-2">Sin líneas</p>
                      <Button variant="outline" size="sm" onClick={addLine}>Añadir primera línea</Button>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {reviewLines.map((line, idx) => (
                        <div key={idx} className="px-3 py-2.5 hover:bg-muted/20 transition-colors group">
                          <div className="flex items-start gap-2">
                            <div className="flex-1 space-y-1.5">
                              {/* Row 1: code + description */}
                              <div className="flex gap-2">
                                <Input value={line.codigo} onChange={e => updateLine(idx, 'codigo', e.target.value)} placeholder="Ref." className="w-20 h-7 text-xs bg-transparent" />
                                <Input value={line.descripcion} onChange={e => updateLine(idx, 'descripcion', e.target.value)} placeholder="Descripción" className="flex-1 h-7 text-xs font-medium bg-transparent" />
                              </div>
                              {/* Row 2: cantidad, PU, dto, IVA, importe */}
                              <div className="flex gap-1.5 items-center flex-wrap">
                                <div className="flex items-center gap-0.5">
                                  <Label className="text-[9px] text-muted-foreground">Cant</Label>
                                  <Input type="number" value={line.cantidad} onChange={e => updateLine(idx, 'cantidad', parseFloat(e.target.value) || 0)} className="w-14 h-6 text-[11px] tabular-nums bg-transparent" step="any" />
                                </div>
                                <div className="flex items-center gap-0.5">
                                  <Label className="text-[9px] text-muted-foreground">P.U.</Label>
                                  <Input type="number" value={line.precio_unitario} onChange={e => updateLine(idx, 'precio_unitario', parseFloat(e.target.value) || 0)} className="w-[72px] h-6 text-[11px] tabular-nums bg-transparent" step="any" />
                                </div>
                                <div className="flex items-center gap-0.5">
                                  <Label className="text-[9px] text-muted-foreground">Dto</Label>
                                  <Input type="number" value={line.descuento_pct} onChange={e => updateLine(idx, 'descuento_pct', parseFloat(e.target.value) || 0)} className="w-14 h-6 text-[11px] tabular-nums bg-transparent" step="any" />
                                  <select value={line.descuento_tipo} onChange={e => updateLine(idx, 'descuento_tipo', e.target.value)} className="h-6 text-[10px] bg-transparent border rounded px-0.5 text-muted-foreground">
                                    <option value="%">%</option>
                                    <option value="€">€</option>
                                  </select>
                                </div>
                                <div className="flex items-center gap-0.5">
                                  <Label className="text-[9px] text-muted-foreground">IVA</Label>
                                  <Input type="number" value={line.iva_pct} onChange={e => updateLine(idx, 'iva_pct', parseFloat(e.target.value) || 0)} className="w-12 h-6 text-[11px] tabular-nums bg-transparent" />
                                  <span className="text-[9px] text-muted-foreground">%</span>
                                </div>
                                <div className="ml-auto">
                                  <span className="text-xs font-semibold tabular-nums">{fmt(line.importe)}</span>
                                </div>
                              </div>
                            </div>
                            <button onClick={() => removeLine(idx)} className="p-1 rounded text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all mt-0.5 active:scale-90">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* TAB: Descuentos */}
              <TabsContent value="descuentos" className="flex-1 overflow-y-auto m-0 p-4 space-y-5">
                {/* Per-line discounts summary */}
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Descuentos por producto</h3>
                  <div className="space-y-1.5">
                    {reviewLines.filter(l => l.descuento_pct > 0).length === 0 ? (
                      <p className="text-xs text-muted-foreground">No hay descuentos por producto. Edita cada línea en la pestaña "Líneas" para añadir descuentos.</p>
                    ) : (
                      reviewLines.filter(l => l.descuento_pct > 0).map((l, i) => {
                        const bruto = l.cantidad * l.precio_unitario;
                        const ahorro = bruto - l.importe;
                        return (
                          <div key={i} className="flex justify-between items-center px-3 py-2 bg-muted/30 rounded-md text-xs">
                            <span className="font-medium truncate max-w-[200px]">{l.descripcion || l.codigo}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-muted-foreground">{l.descuento_pct}{l.descuento_tipo}</span>
                              <span className="text-[hsl(var(--success))] font-semibold tabular-nums">-{fmt(ahorro)}</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Global / invoice discount */}
                <div className="border-t pt-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Descuento global en factura</h3>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <Label className="text-xs">Descuento global (%)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={extraData.descuento_global_pct}
                        onChange={e => setExtraData(d => ({ ...d, descuento_global_pct: parseFloat(e.target.value) || 0 }))}
                        className="mt-1 bg-background"
                      />
                    </div>
                    <div className="text-right pt-5">
                      {descuentoGlobal > 0 && (
                        <span className="text-sm font-semibold text-[hsl(var(--success))] tabular-nums">-{fmt(descuentoGlobal)}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Fecha vencimiento */}
                <div className="border-t pt-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Información adicional</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Fecha vencimiento</Label>
                      <Input
                        type="date"
                        value={extraData.fecha_vencimiento}
                        onChange={e => setExtraData(d => ({ ...d, fecha_vencimiento: e.target.value }))}
                        className="mt-1 bg-background"
                      />
                    </div>
                  </div>
                  <div className="mt-3">
                    <Label className="text-xs">Notas</Label>
                    <textarea
                      value={extraData.notas}
                      onChange={e => setExtraData(d => ({ ...d, notas: e.target.value }))}
                      className="mt-1 w-full bg-background border rounded-md px-3 py-2 text-sm min-h-[60px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      placeholder="Notas adicionales..."
                    />
                  </div>
                </div>
              </TabsContent>

              {/* TAB: IVA / Totales */}
              <TabsContent value="iva" className="flex-1 overflow-y-auto m-0 p-4 space-y-5">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Desglose IVA (calculado desde líneas)</h3>
                  <div className="bg-muted/30 rounded-lg overflow-hidden border">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Tipo IVA</th>
                          <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Base</th>
                          <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Cuota IVA</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(ivaFromLines).length === 0 ? (
                          <tr><td colSpan={3} className="px-3 py-4 text-center text-muted-foreground">Sin datos de IVA</td></tr>
                        ) : (
                          Object.entries(ivaFromLines).map(([tipo, v]) => (
                            <tr key={tipo} className="border-t">
                              <td className="px-3 py-2 font-medium">{tipo}%</td>
                              <td className="px-3 py-2 text-right tabular-nums">{fmt(v.base)}</td>
                              <td className="px-3 py-2 text-right tabular-nums font-semibold">{fmt(v.cuota)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* IVA from original (datos_ia) if available */}
                {extraData.iva_desglose.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">IVA original (desde escáner)</h3>
                    <div className="bg-muted/30 rounded-lg overflow-hidden border">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-muted/50">
                            <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Tipo</th>
                            <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Base</th>
                            <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Cuota</th>
                          </tr>
                        </thead>
                        <tbody>
                          {extraData.iva_desglose.map((row, i) => (
                            <tr key={i} className="border-t">
                              <td className="px-3 py-2 font-medium">{row.tipo}%</td>
                              <td className="px-3 py-2 text-right tabular-nums">{fmt(row.base)}</td>
                              <td className="px-3 py-2 text-right tabular-nums font-semibold">{fmt(row.cuota)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Totales */}
                <div className="border-t pt-4 space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Resumen</h3>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal líneas</span>
                      <span className="tabular-nums">{fmt(subtotalLineas)}</span>
                    </div>
                    {descuentoGlobal > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Dto. global ({extraData.descuento_global_pct}%)</span>
                        <span className="tabular-nums text-[hsl(var(--success))]">-{fmt(descuentoGlobal)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Base imponible</span>
                      <span className="tabular-nums font-medium">{fmt(baseImponible)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total IVA</span>
                      <span className="tabular-nums">{fmt(totalIva)}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between">
                      <span className="font-semibold">TOTAL</span>
                      <span className="text-lg font-bold tabular-nums">{fmt(totalFinal)}</span>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Footer total (always visible) */}
            <div className="px-4 py-2.5 border-t bg-card shrink-0 flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Total con IVA</span>
              <span className="text-lg font-bold tabular-nums">{fmt(totalFinal)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── LIST VIEW ───
  return (
    <div className="space-y-5">
      <PageHeader title="Albaranes" description="Recepción y verificación de albaranes">
        <div className="text-xs text-muted-foreground text-right hidden sm:block">
          Los albaranes llegan desde<br />la app de escaneo automáticamente
        </div>
      </PageHeader>

      <div className="flex flex-col sm:flex-row gap-3 animate-fade-in-up">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por proveedor o número..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-card" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px] bg-card">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="procesado">Procesado</SelectItem>
            <SelectItem value="pendiente">Pendiente</SelectItem>
            <SelectItem value="pendiente_verificacion">Verificar</SelectItem>
            <SelectItem value="procesando">Procesando</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card border rounded-lg overflow-hidden animate-fade-in-up animate-delay-1">
        <div className="overflow-x-auto">
          {/* Desktop table */}
          <table className="w-full text-sm hidden md:table">
            <thead>
              <tr className="bg-muted/50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fecha</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Número</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Proveedor</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Importe</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">Cargando…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">No se encontraron albaranes</td></tr>
              ) : filtered.map((a: Tables<'albaranes'>) => {
                const st = statusMap[a.estado || 'pendiente'] || statusMap.pendiente;
                return (
                  <tr key={a.id} className="border-t border-border hover:bg-muted/30 transition-colors group cursor-pointer" onClick={() => handleReview(a)}>
                    <td className="px-4 py-3 tabular-nums whitespace-nowrap">{a.fecha}</td>
                    <td className="px-4 py-3 font-medium whitespace-nowrap">{a.numero || '—'}</td>
                    <td className="px-4 py-3">{a.proveedor_nombre || '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums whitespace-nowrap">{fmt(a.importe)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${st.className}`}>{st.label}</span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                        {a.imagen_url && (
                          <a href={a.imagen_url} target="_blank" rel="noreferrer"
                            className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                            <Image className="h-4 w-4" />
                          </a>
                        )}
                        <button onClick={() => handleReview(a)}
                          className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                          {(a.estado === 'pendiente_verificacion' || a.estado === 'revisar') ? <CheckSquare className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                        </button>
                        <button onClick={() => setDeleteId(a.id)}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Mobile card list */}
          <div className="md:hidden divide-y">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground text-sm">Cargando…</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">No se encontraron albaranes</div>
            ) : filtered.map((a: Tables<'albaranes'>) => {
              const st = statusMap[a.estado || 'pendiente'] || statusMap.pendiente;
              return (
                <div key={a.id} className="px-3 py-3 active:bg-muted/30 transition-colors cursor-pointer" onClick={() => handleReview(a)}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{a.proveedor_nombre || '—'}</span>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${st.className}`}>{st.label}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                        <span className="tabular-nums">{a.fecha}</span>
                        {a.numero && <span>· Nº {a.numero}</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-semibold text-sm tabular-nums">{fmt(a.importe)}</span>
                    </div>
                  </div>
                  <div className="flex justify-end gap-1 mt-1.5" onClick={e => e.stopPropagation()}>
                    <button onClick={() => handleReview(a)} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground">
                      {(a.estado === 'pendiente_verificacion' || a.estado === 'revisar') ? <CheckSquare className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                    </button>
                    <button onClick={() => setDeleteId(a.id)} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <DeleteDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        isPending={deleteMutation.isPending}
        title="¿Eliminar albarán?"
        description="Se eliminarán también las líneas asociadas."
      />
    </div>
  );
}
