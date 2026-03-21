import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { DeleteDialog } from '@/components/DeleteDialog';
import { supabase } from '@/integrations/supabase/client';
import { fetchAlbaranes } from '@/lib/queries';
import { toast } from 'sonner';
import { Search, Eye, Pencil, Trash2, Image, CheckSquare, X, Plus, Save } from 'lucide-react';
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
}

export default function AlbaranesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Review state
  const [reviewAlbaran, setReviewAlbaran] = useState<Tables<'albaranes'> | null>(null);
  const [reviewLines, setReviewLines] = useState<EditableLine[]>([]);
  const [saving, setSaving] = useState(false);

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
      }))
    );
  };

  // Update a line field
  const updateLine = (idx: number, field: keyof EditableLine, value: string | number) => {
    setReviewLines(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      // Auto-calc importe
      if (field === 'cantidad' || field === 'precio_unitario') {
        const cant = field === 'cantidad' ? Number(value) : updated[idx].cantidad;
        const pu = field === 'precio_unitario' ? Number(value) : updated[idx].precio_unitario;
        updated[idx].importe = Math.round(cant * pu * 100) / 100;
      }
      return updated;
    });
  };

  const addLine = () => {
    setReviewLines(prev => [...prev, { codigo: '', descripcion: '', cantidad: 1, precio_unitario: 0, importe: 0, iva_pct: 10 }]);
  };

  const removeLine = (idx: number) => {
    setReviewLines(prev => prev.filter((_, i) => i !== idx));
  };

  // Save changes and mark as processed
  const handleSave = async (markProcessed: boolean) => {
    if (!reviewAlbaran) return;
    setSaving(true);
    try {
      // Delete old lines
      await supabase.from('lineas_albaran').delete().eq('albaran_id', reviewAlbaran.id);

      // Insert updated lines
      if (reviewLines.length > 0) {
        const rows = reviewLines.map(l => ({
          albaran_id: reviewAlbaran.id,
          codigo: l.codigo,
          descripcion: l.descripcion,
          cantidad: l.cantidad,
          precio_unitario: l.precio_unitario,
          importe: l.importe,
          iva_pct: l.iva_pct,
        }));
        const { error: lineErr } = await supabase.from('lineas_albaran').insert(rows);
        if (lineErr) throw lineErr;
      }

      // Update total and status
      const total = reviewLines.reduce((sum, l) => sum + (l.importe || 0), 0);
      const { error: upErr } = await supabase.from('albaranes').update({
        importe: Math.round(total * 100) / 100,
        estado: markProcessed ? 'procesado' : reviewAlbaran.estado,
      }).eq('id', reviewAlbaran.id);
      if (upErr) throw upErr;

      // Save corrections to aprendizaje if provider exists
      if (reviewAlbaran.proveedor_id) {
        await supabase.from('aprendizaje').insert([{
          proveedor_id: reviewAlbaran.proveedor_id,
          tipo: 'revision',
          descripcion: `Revisión manual del albarán ${reviewAlbaran.numero || 'SN'}: ${reviewLines.length} líneas confirmadas.`,
          datos_despues: { lineas: reviewLines, total } as unknown as Record<string, unknown>,
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

  // If reviewing, show split view
  if (reviewAlbaran) {
    const totalLineas = reviewLines.reduce((s, l) => s + (l.importe || 0), 0);
    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-card shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setReviewAlbaran(null)} className="p-1.5 rounded-md hover:bg-muted transition-colors active:scale-95">
              <X className="h-5 w-5" />
            </button>
            <div>
              <h2 className="font-semibold text-sm">Albarán {reviewAlbaran.numero || 'sin número'}</h2>
              <p className="text-xs text-muted-foreground">{reviewAlbaran.proveedor_nombre} · {reviewAlbaran.fecha}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleSave(false)} disabled={saving} className="gap-1.5 active:scale-95">
              <Save className="h-3.5 w-3.5" /> Guardar
            </Button>
            <Button size="sm" onClick={() => handleSave(true)} disabled={saving} className="gap-1.5 active:scale-95">
              <CheckSquare className="h-3.5 w-3.5" /> Verificar y aprobar
            </Button>
          </div>
        </div>

        {/* Split view */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Image */}
          <div className="w-1/2 border-r bg-muted/30 flex items-center justify-center overflow-auto p-4">
            {reviewAlbaran.imagen_url ? (
              <img
                src={reviewAlbaran.imagen_url}
                alt="Albarán escaneado"
                className="max-w-full max-h-full object-contain rounded-lg shadow-sm"
              />
            ) : (
              <div className="text-center text-muted-foreground">
                <Image className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Sin imagen</p>
              </div>
            )}
          </div>

          {/* Right: Editable lines */}
          <div className="w-1/2 flex flex-col overflow-hidden">
            {/* Info bar */}
            <div className="px-4 py-3 border-b bg-card/50 flex items-center justify-between shrink-0">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {reviewLines.length} líneas · Total: {fmt(totalLineas)}
              </span>
              <Button variant="outline" size="sm" onClick={addLine} className="gap-1.5 h-7 text-xs active:scale-95">
                <Plus className="h-3 w-3" /> Línea
              </Button>
            </div>

            {/* Lines */}
            <div className="flex-1 overflow-y-auto">
              {reviewLines.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <p className="text-sm mb-2">Sin líneas</p>
                  <Button variant="outline" size="sm" onClick={addLine}>Añadir primera línea</Button>
                </div>
              ) : (
                <div className="divide-y">
                  {reviewLines.map((line, idx) => (
                    <div key={idx} className="px-4 py-3 hover:bg-muted/20 transition-colors group">
                      <div className="flex items-start gap-2">
                        {/* Main content */}
                        <div className="flex-1 space-y-2">
                          {/* Row 1: code + description */}
                          <div className="flex gap-2">
                            <Input
                              value={line.codigo}
                              onChange={e => updateLine(idx, 'codigo', e.target.value)}
                              placeholder="Ref."
                              className="w-20 h-8 text-xs bg-transparent"
                            />
                            <Input
                              value={line.descripcion}
                              onChange={e => updateLine(idx, 'descripcion', e.target.value)}
                              placeholder="Descripción"
                              className="flex-1 h-8 text-xs font-medium bg-transparent"
                            />
                          </div>
                          {/* Row 2: numbers */}
                          <div className="flex gap-2 items-center">
                            <div className="flex items-center gap-1">
                              <Label className="text-[10px] text-muted-foreground w-8">Cant.</Label>
                              <Input
                                type="number"
                                value={line.cantidad}
                                onChange={e => updateLine(idx, 'cantidad', parseFloat(e.target.value) || 0)}
                                className="w-16 h-7 text-xs tabular-nums bg-transparent"
                                step="any"
                              />
                            </div>
                            <div className="flex items-center gap-1">
                              <Label className="text-[10px] text-muted-foreground w-8">P.U.</Label>
                              <Input
                                type="number"
                                value={line.precio_unitario}
                                onChange={e => updateLine(idx, 'precio_unitario', parseFloat(e.target.value) || 0)}
                                className="w-20 h-7 text-xs tabular-nums bg-transparent"
                                step="any"
                              />
                            </div>
                            <div className="flex items-center gap-1">
                              <Label className="text-[10px] text-muted-foreground w-8">IVA</Label>
                              <Input
                                type="number"
                                value={line.iva_pct}
                                onChange={e => updateLine(idx, 'iva_pct', parseFloat(e.target.value) || 0)}
                                className="w-14 h-7 text-xs tabular-nums bg-transparent"
                              />
                              <span className="text-[10px] text-muted-foreground">%</span>
                            </div>
                            <div className="ml-auto text-right">
                              <span className="text-xs font-semibold tabular-nums">{fmt(line.importe)}</span>
                            </div>
                          </div>
                        </div>
                        {/* Delete */}
                        <button
                          onClick={() => removeLine(idx)}
                          className="p-1 rounded text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all mt-1 active:scale-90"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer total */}
            <div className="px-4 py-3 border-t bg-card shrink-0 flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Total sin IVA</span>
              <span className="text-lg font-bold tabular-nums">{fmt(totalLineas)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Albaranes" description="Recepción y verificación de albaranes">
        <div className="text-xs text-muted-foreground text-right hidden sm:block">
          Los albaranes llegan desde<br />la app de escaneo automáticamente
        </div>
      </PageHeader>

      {/* Toolbar */}
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

      {/* Table */}
      <div className="bg-card border rounded-lg overflow-hidden animate-fade-in-up animate-delay-1">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fecha</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Número</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Proveedor</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Importe</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Estado</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground"></th>
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
