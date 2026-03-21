import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { DeleteDialog } from '@/components/DeleteDialog';
import { supabase } from '@/integrations/supabase/client';
import { fetchAlbaranes } from '@/lib/queries';
import { toast } from 'sonner';
import { Upload, Search, Eye, Pencil, Trash2, Image, CheckSquare, Loader2, Zap } from 'lucide-react';
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

export default function AlbaranesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [autoMode, setAutoMode] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [processingPhase, setProcessingPhase] = useState(0);
  const [viewAlbaran, setViewAlbaran] = useState<Tables<'albaranes'> | null>(null);
  const [viewLines, setViewLines] = useState<Tables<'lineas_albaran'>[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);

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

  // Upload file and process with AI
  const handleUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);

    for (const file of Array.from(files)) {
      try {
        // 1. Upload to storage
        const fileName = `${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('albaranes')
          .upload(fileName, file);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('albaranes').getPublicUrl(fileName);

        // 2. Create albaran record
        const { data: albaran, error: insertError } = await supabase
          .from('albaranes')
          .insert({
            estado: 'procesando',
            imagen_url: urlData.publicUrl,
            proveedor_nombre: 'Procesando…',
          })
          .select()
          .single();
        if (insertError) throw insertError;

        queryClient.invalidateQueries({ queryKey: ['albaranes'] });

        // 3. Convert file to base64 for AI
        const arrayBuffer = await file.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
        );

        setProcessingId(albaran.id);

        // Phase 1: Identify provider
        setProcessingPhase(1);
        const { data: fn1Data, error: fn1Error } = await supabase.functions.invoke('process-albaran', {
          body: { albaran_id: albaran.id, fase: 1, imagen_base64: base64 },
        });
        if (fn1Error) throw fn1Error;
        if (fn1Data?.error) throw new Error(fn1Data.error);

        queryClient.invalidateQueries({ queryKey: ['albaranes'] });

        // Phase 2: Extract data
        setProcessingPhase(2);
        const proveedorId = fn1Data?.resultado?.proveedor_id || undefined;
        const { data: fn2Data, error: fn2Error } = await supabase.functions.invoke('process-albaran', {
          body: { albaran_id: albaran.id, fase: 2, imagen_base64: base64, proveedor_id: proveedorId },
        });
        if (fn2Error) throw fn2Error;
        if (fn2Data?.error) throw new Error(fn2Data.error);

        // If auto mode, mark as processed directly
        if (autoMode) {
          await supabase.from('albaranes').update({ estado: 'procesado' }).eq('id', albaran.id);
        }

        queryClient.invalidateQueries({ queryKey: ['albaranes'] });
        toast.success(`Albarán "${file.name}" procesado correctamente`);

      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error al procesar';
        toast.error(message);
        console.error(err);
      }
    }

    setUploading(false);
    setProcessingId(null);
    setProcessingPhase(0);
  }, [autoMode, queryClient]);

  // View albaran details
  const handleView = async (a: Tables<'albaranes'>) => {
    setViewAlbaran(a);
    const { data } = await supabase
      .from('lineas_albaran')
      .select('*')
      .eq('albaran_id', a.id);
    setViewLines(data || []);
  };

  // Mark as verified/processed
  const handleVerify = async (id: string) => {
    await supabase.from('albaranes').update({ estado: 'procesado' }).eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['albaranes'] });
    toast.success('Albarán verificado');
    setViewAlbaran(null);
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Albaranes" description="Gestión y procesamiento automático con IA">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Zap className={`h-4 w-4 ${autoMode ? 'text-amber-500' : 'text-muted-foreground'}`} />
            <Label htmlFor="auto-mode" className="text-sm cursor-pointer">Auto</Label>
            <Switch id="auto-mode" checked={autoMode} onCheckedChange={setAutoMode} />
          </div>
          <label className="cursor-pointer">
            <Button className="gap-2 active:scale-95 pointer-events-none" disabled={uploading}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              <span className="hidden sm:inline">{uploading ? 'Procesando…' : 'Subir Albarán'}</span>
            </Button>
            <input
              type="file"
              accept="image/*,.pdf"
              multiple
              className="hidden"
              onChange={e => handleUpload(e.target.files)}
              disabled={uploading}
            />
          </label>
        </div>
      </PageHeader>

      {/* Processing indicator */}
      {processingId && (
        <div className="bg-card border rounded-lg p-4 animate-fade-in-up">
          <div className="flex items-center gap-3 mb-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm font-medium">
              {processingPhase === 1 ? 'Fase 1: Identificando proveedor…' : 'Fase 2: Extrayendo datos…'}
            </span>
          </div>
          <Progress value={processingPhase === 1 ? 35 : 75} className="h-1.5" />
        </div>
      )}

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
                  <tr key={a.id} className="border-t border-border hover:bg-muted/30 transition-colors group">
                    <td className="px-4 py-3 tabular-nums whitespace-nowrap">{a.fecha}</td>
                    <td className="px-4 py-3 font-medium whitespace-nowrap">{a.numero || '—'}</td>
                    <td className="px-4 py-3">{a.proveedor_nombre || '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums whitespace-nowrap">{fmt(a.importe)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${st.className}`}>{st.label}</span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {a.imagen_url && (
                          <a href={a.imagen_url} target="_blank" rel="noreferrer"
                            className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                            <Image className="h-4 w-4" />
                          </a>
                        )}
                        {(a.estado === 'pendiente_verificacion' || a.estado === 'revisar') ? (
                          <button onClick={() => handleView(a)}
                            className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                            <CheckSquare className="h-4 w-4" />
                          </button>
                        ) : (
                          <button onClick={() => handleView(a)}
                            className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                        <button onClick={() => handleView(a)}
                          className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                          <Eye className="h-4 w-4" />
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

      {/* View/Review Dialog */}
      <Dialog open={!!viewAlbaran} onOpenChange={() => setViewAlbaran(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Albarán {viewAlbaran?.numero || 'sin número'} — {viewAlbaran?.proveedor_nombre}
            </DialogTitle>
          </DialogHeader>

          {viewAlbaran && (
            <div className="space-y-4">
              {/* Image preview */}
              {viewAlbaran.imagen_url && (
                <div className="border rounded-lg overflow-hidden max-h-64">
                  <img src={viewAlbaran.imagen_url} alt="Albarán" className="w-full object-contain max-h-64" />
                </div>
              )}

              {/* General info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Fecha:</span> <span className="font-medium">{viewAlbaran.fecha}</span></div>
                <div><span className="text-muted-foreground">Número:</span> <span className="font-medium">{viewAlbaran.numero || '—'}</span></div>
                <div><span className="text-muted-foreground">Proveedor:</span> <span className="font-medium">{viewAlbaran.proveedor_nombre || '—'}</span></div>
                <div><span className="text-muted-foreground">Importe:</span> <span className="font-semibold">{fmt(viewAlbaran.importe)}</span></div>
              </div>

              {/* Line items */}
              {viewLines.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Líneas ({viewLines.length})</h4>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="px-3 py-2 text-left">Descripción</th>
                          <th className="px-3 py-2 text-right">Cant.</th>
                          <th className="px-3 py-2 text-right">P.Unit.</th>
                          <th className="px-3 py-2 text-right">Importe</th>
                          <th className="px-3 py-2 text-right">IVA</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewLines.map(l => (
                          <tr key={l.id} className="border-t border-border">
                            <td className="px-3 py-2">{l.descripcion}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{l.cantidad}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{fmt(l.precio_unitario)}</td>
                            <td className="px-3 py-2 text-right tabular-nums font-medium">{fmt(l.importe)}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{l.iva_pct}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* AI data dump */}
              {viewAlbaran.datos_ia && Object.keys(viewAlbaran.datos_ia as object).length > 0 && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Datos IA (debug)</summary>
                  <pre className="mt-2 bg-muted p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(viewAlbaran.datos_ia, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setViewAlbaran(null)}>Cerrar</Button>
            {viewAlbaran && (viewAlbaran.estado === 'pendiente_verificacion' || viewAlbaran.estado === 'revisar') && (
              <Button onClick={() => handleVerify(viewAlbaran.id)} className="gap-2">
                <CheckSquare className="h-4 w-4" /> Verificar y aprobar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
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
