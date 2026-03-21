import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DeleteDialog } from '@/components/DeleteDialog';
import { fetchArqueos, fetchFamilias, fmt } from '@/lib/queries';
import { upsertArqueo, deleteArqueo } from '@/lib/mutations';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Plus, Camera, Pencil, Trash2, Loader2, Images, AlertTriangle, PlusCircle } from 'lucide-react';
import { toast } from 'sonner';

interface FamiliaLine {
  familia_nombre: string;
  nombre_ticket?: string;
  unidades: number;
  importe: number;
  matched?: boolean;
}

export default function ArqueoZPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [lines, setLines] = useState<FamiliaLine[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState('');
  const [unmatchedLines, setUnmatchedLines] = useState<FamiliaLine[]>([]);
  const [resolveOpen, setResolveOpen] = useState(false);
  const [resolveMapping, setResolveMapping] = useState<Record<number, string>>({});
  const [pendingMatchedLines, setPendingMatchedLines] = useState<FamiliaLine[]>([]);
  const [pendingFecha, setPendingFecha] = useState('');
  const [pendingMultiQueue, setPendingMultiQueue] = useState<Array<{ matched: FamiliaLine[], unmatched: FamiliaLine[], fecha: string }>>([]);
  const [newFamiliaName, setNewFamiliaName] = useState('');
  const [creatingFamilia, setCreatingFamilia] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const multiFileRef = useRef<HTMLInputElement>(null);

  const qc = useQueryClient();
  const { data: arqueos = [], isLoading } = useQuery({ queryKey: ['arqueos'], queryFn: fetchArqueos });
  const { data: familias = [] } = useQuery({ queryKey: ['familias'], queryFn: fetchFamilias });

  const totalSinIva = lines.reduce((s, l) => s + (Number(l.importe) || 0), 0);

  const saveMut = useMutation({
    mutationFn: () => upsertArqueo({
      id: editId || undefined,
      fecha,
      total_sin_iva: totalSinIva,
      familias: lines.map(l => ({ familia_nombre: l.familia_nombre, unidades: l.unidades, importe: l.importe })),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['arqueos'] });
      qc.invalidateQueries({ queryKey: ['familias'] });
      setDialogOpen(false);
      toast.success(editId ? 'Arqueo actualizado' : 'Arqueo guardado');
    },
    onError: () => toast.error('Error guardando arqueo'),
  });

  const delMut = useMutation({
    mutationFn: () => deleteArqueo(deleteId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['arqueos'] });
      setDeleteOpen(false);
      toast.success('Arqueo eliminado');
    },
    onError: () => toast.error('Error eliminando arqueo'),
  });

  const openNew = () => {
    setEditId(null);
    setFecha(new Date().toISOString().slice(0, 10));
    setLines(familias.map(f => ({ familia_nombre: f.nombre, unidades: 0, importe: 0, matched: true })));
    setDialogOpen(true);
  };

  const openEdit = (arq: any) => {
    setEditId(arq.id);
    setFecha(arq.fecha);
    setLines((arq.arqueo_familias || []).map((f: any) => ({
      familia_nombre: f.familia_nombre,
      unidades: Number(f.unidades) || 0,
      importe: Number(f.importe) || 0,
      matched: true,
    })));
    setDialogOpen(true);
  };

  const openDelete = (id: string) => { setDeleteId(id); setDeleteOpen(true); };

  const updateLine = (idx: number, field: keyof FamiliaLine, value: string | number) => {
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  };

  const addLine = () => setLines(prev => [...prev, { familia_nombre: '', unidades: 0, importe: 0, matched: true }]);
  const removeLine = (idx: number) => setLines(prev => prev.filter((_, i) => i !== idx));

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(file);
    });

  const processOneTicket = async (base64: string) => {
    const { data, error } = await supabase.functions.invoke('process-arqueo-z', {
      body: { image_base64: base64, familias_conocidas: familias.map(f => f.nombre) },
    });
    if (error) throw error;
    return data;
  };

  /** Separate matched and unmatched lines from AI result */
  const separateLines = (data: any): { matched: FamiliaLine[], unmatched: FamiliaLine[], fecha: string } => {
    const allLines: FamiliaLine[] = (data.familias || []).map((f: any) => ({
      familia_nombre: f.familia_nombre || f.nombre || '',
      nombre_ticket: f.nombre_ticket || f.familia_nombre || '',
      unidades: Number(f.unidades) || 0,
      importe: Number(f.importe) || 0,
      matched: f.matched !== false,
    }));

    const familiaNames = new Set(familias.map(f => f.nombre.toLowerCase().trim()));
    
    const matched: FamiliaLine[] = [];
    const unmatched: FamiliaLine[] = [];

    for (const line of allLines) {
      if (line.matched && familiaNames.has(line.familia_nombre.toLowerCase().trim())) {
        matched.push(line);
      } else {
        line.matched = false;
        unmatched.push(line);
      }
    }

    return { matched, unmatched, fecha: data.fecha || new Date().toISOString().slice(0, 10) };
  };

  /** Merge unmatched lines into matched lines based on user mapping */
  const applyResolution = (matched: FamiliaLine[], unmatched: FamiliaLine[], mapping: Record<number, string>): FamiliaLine[] => {
    const result = [...matched];
    
    for (let i = 0; i < unmatched.length; i++) {
      const targetFamily = mapping[i];
      if (!targetFamily) continue; // skip unmapped
      
      const existingIdx = result.findIndex(r => r.familia_nombre === targetFamily);
      if (existingIdx >= 0) {
        // Merge: add units and amount to existing family
        result[existingIdx] = {
          ...result[existingIdx],
          unidades: result[existingIdx].unidades + unmatched[i].unidades,
          importe: result[existingIdx].importe + unmatched[i].importe,
        };
      } else {
        result.push({ ...unmatched[i], familia_nombre: targetFamily, matched: true });
      }
    }
    
    return result;
  };

  /** Single scan → opens dialog with extracted data */
  const handleScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanning(true);
    try {
      const base64 = await fileToBase64(file);
      const data = await processOneTicket(base64);
      const { matched, unmatched, fecha: extractedFecha } = separateLines(data);

      if (unmatched.length > 0) {
        // Show resolution dialog
        setPendingMatchedLines(matched);
        setUnmatchedLines(unmatched);
        setPendingFecha(extractedFecha);
        setResolveMapping({});
        setResolveOpen(true);
      } else {
        setFecha(extractedFecha);
        setLines(matched);
        toast.success('Ticket Z interpretado correctamente');
      }
    } catch (err) {
      console.error('Scan error:', err);
      toast.error('Error interpretando el ticket Z');
    } finally {
      setScanning(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  /** Confirm resolution of unmatched families for single scan */
  const confirmResolve = () => {
    const resolved = applyResolution(pendingMatchedLines, unmatchedLines, resolveMapping);
    setFecha(pendingFecha);
    setLines(resolved);
    setResolveOpen(false);
    setUnmatchedLines([]);
    toast.success('Ticket Z interpretado correctamente');
  };

  /** Multi-scan → processes multiple images */
  const handleMultiScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    setScanning(true);
    let saved = 0;
    let errors = 0;
    const needsResolution: typeof pendingMultiQueue = [];

    for (let i = 0; i < fileArray.length; i++) {
      setScanProgress(`Procesando ${i + 1} de ${fileArray.length}...`);
      try {
        const base64 = await fileToBase64(fileArray[i]);
        const data = await processOneTicket(base64);
        const { matched, unmatched, fecha: extractedFecha } = separateLines(data);

        if (unmatched.length > 0) {
          needsResolution.push({ matched, unmatched, fecha: extractedFecha });
        } else {
          const total = matched.reduce((s, l) => s + l.importe, 0);
          await upsertArqueo({
            fecha: extractedFecha,
            total_sin_iva: total,
            familias: matched.map(l => ({ familia_nombre: l.familia_nombre, unidades: l.unidades, importe: l.importe })),
          });
          saved++;
        }
      } catch (err) {
        console.error(`Error processing file ${fileArray[i].name}:`, err);
        errors++;
      }
    }

    qc.invalidateQueries({ queryKey: ['arqueos'] });
    qc.invalidateQueries({ queryKey: ['familias'] });
    setScanning(false);
    setScanProgress('');
    if (multiFileRef.current) multiFileRef.current.value = '';

    if (saved > 0) toast.success(`${saved} arqueo${saved > 1 ? 's' : ''} guardado${saved > 1 ? 's' : ''}`);
    if (errors > 0) toast.error(`${errors} ticket${errors > 1 ? 's' : ''} no se pudieron procesar`);

    if (needsResolution.length > 0) {
      setPendingMultiQueue(needsResolution);
      // Show first one
      const first = needsResolution[0];
      setPendingMatchedLines(first.matched);
      setUnmatchedLines(first.unmatched);
      setPendingFecha(first.fecha);
      setResolveMapping({});
      setResolveOpen(true);
    }
  };

  /** Confirm resolution for multi-scan queue */
  const confirmResolveMulti = async () => {
    const resolved = applyResolution(pendingMatchedLines, unmatchedLines, resolveMapping);
    const total = resolved.reduce((s, l) => s + l.importe, 0);

    try {
      await upsertArqueo({
        fecha: pendingFecha,
        total_sin_iva: total,
        familias: resolved.map(l => ({ familia_nombre: l.familia_nombre, unidades: l.unidades, importe: l.importe })),
      });
      toast.success('Arqueo guardado');
    } catch {
      toast.error('Error guardando arqueo');
    }

    const remaining = pendingMultiQueue.slice(1);
    if (remaining.length > 0) {
      setPendingMultiQueue(remaining);
      const next = remaining[0];
      setPendingMatchedLines(next.matched);
      setUnmatchedLines(next.unmatched);
      setPendingFecha(next.fecha);
      setResolveMapping({});
    } else {
      setPendingMultiQueue([]);
      setResolveOpen(false);
      setUnmatchedLines([]);
      qc.invalidateQueries({ queryKey: ['arqueos'] });
    }
  };

  const totalGlobal = arqueos.reduce((s, a) => s + (Number(a.total_sin_iva) || 0), 0);

  return (
    <div className="space-y-5">
      <PageHeader title="Arqueo Z" description="Registro diario de ventas por familia — tiquets Z">
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 active:scale-95" onClick={() => multiFileRef.current?.click()} disabled={scanning}>
            {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Images className="h-4 w-4" />}
            {scanning ? scanProgress || 'Procesando...' : 'Escanear varios'}
          </Button>
          <input ref={multiFileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleMultiScan} />
          <Button className="gap-2 active:scale-95" onClick={openNew}><Plus className="h-4 w-4" /> Nuevo Arqueo</Button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 animate-fade-in-up">
        <div className="panel-card">
          <div className="panel-card-header"><span>Total arqueos</span></div>
          <div className="panel-card-value text-2xl">{arqueos.length}</div>
        </div>
        <div className="panel-card">
          <div className="panel-card-header"><span>Ventas acumuladas</span></div>
          <div className="panel-card-value text-2xl tabular-nums">{fmt(totalGlobal)}</div>
        </div>
        <div className="panel-card">
          <div className="panel-card-header"><span>Media diaria</span></div>
          <div className="panel-card-value text-2xl tabular-nums">{arqueos.length > 0 ? fmt(totalGlobal / arqueos.length) : '—'}</div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground p-8 text-center">Cargando arqueos...</div>
      ) : arqueos.length === 0 ? (
        <div className="text-sm text-muted-foreground p-8 text-center">No hay arqueos. Crea el primero o escanea un ticket Z.</div>
      ) : (
        <div className="space-y-4 animate-fade-in-up">
          {arqueos.map(arq => (
            <div key={arq.id} className="panel-card !p-0 overflow-hidden group">
              <div className="px-5 py-4 bg-[hsl(var(--surface-offset))] flex items-center justify-between border-b border-[hsl(var(--divider))]">
                <div>
                  <h3 className="font-semibold text-sm">{arq.fecha}</h3>
                  <p className="text-xs text-muted-foreground">Arqueo Z</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-lg font-bold tabular-nums">{fmt(Number(arq.total_sin_iva))}</p>
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(arq)} className="p-1.5 rounded-md text-muted-foreground hover:text-primary transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => openDelete(arq.id)} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[hsl(var(--surface-offset))]">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Familia</th>
                      <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Unidades</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Importe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(arq.arqueo_familias || []).map((f: any) => (
                      <tr key={f.id} className="border-t border-[hsl(var(--divider))]">
                        <td className="px-4 py-2.5 font-medium">{f.familia_nombre}</td>
                        <td className="px-4 py-2.5 text-center tabular-nums">{f.unidades}</td>
                        <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{fmt(Number(f.importe))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit/New Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? 'Editar Arqueo Z' : 'Nuevo Arqueo Z'}</DialogTitle>
          </DialogHeader>

          <div className="flex gap-2">
            <Button variant="outline" className="gap-2 flex-1 active:scale-95" onClick={() => fileRef.current?.click()} disabled={scanning}>
              {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              {scanning ? 'Interpretando...' : 'Escanear Ticket Z'}
            </Button>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleScan} />
          </div>

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm font-semibold">Fecha</Label>
              <Input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className="mt-1.5 bg-background w-44" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-semibold">Familias</Label>
                <Button variant="ghost" size="sm" onClick={addLine} className="gap-1 text-xs"><Plus className="h-3 w-3" /> Añadir</Button>
              </div>

              <div className="space-y-2">
                {lines.map((line, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_80px_100px_32px] gap-2 items-center">
                    <Select value={line.familia_nombre} onValueChange={v => updateLine(idx, 'familia_nombre', v)}>
                      <SelectTrigger className="bg-background text-sm">
                        <SelectValue placeholder="Familia" />
                      </SelectTrigger>
                      <SelectContent>
                        {familias.map(f => (
                          <SelectItem key={f.id} value={f.nombre}>{f.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      placeholder="Uds"
                      value={line.unidades || ''}
                      onChange={e => updateLine(idx, 'unidades', parseInt(e.target.value) || 0)}
                      className="bg-background text-sm text-center"
                    />
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Importe"
                      value={line.importe || ''}
                      onChange={e => updateLine(idx, 'importe', parseFloat(e.target.value) || 0)}
                      className="bg-background text-sm text-right"
                    />
                    <button onClick={() => removeLine(idx)} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[hsl(var(--surface-offset))] rounded-lg p-3 flex justify-between items-center">
              <span className="text-sm font-semibold">Total sin IVA</span>
              <span className="text-lg font-bold tabular-nums">{fmt(totalSinIva)}</span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => saveMut.mutate()} disabled={lines.length === 0 || saveMut.isPending} className="active:scale-95">
              {saveMut.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resolve unmatched families dialog */}
      <Dialog open={resolveOpen} onOpenChange={(open) => { if (!open) { setResolveOpen(false); setUnmatchedLines([]); setPendingMultiQueue([]); } }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Familias no reconocidas
            </DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">
            El ticket del <strong>{pendingFecha}</strong> tiene líneas que no coinciden con las familias existentes.
            Asigna cada una a la familia correcta o crea una nueva:
          </p>

          <div className="space-y-3 py-2">
            {unmatchedLines.map((line, idx) => {
              const suggestedName = (line.nombre_ticket || line.familia_nombre || '').toUpperCase().trim();
              const currentValue = resolveMapping[idx] || '';

              return (
                <div key={idx} className="border border-[hsl(var(--divider))] rounded-lg p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">"{line.nombre_ticket || line.familia_nombre}"</span>
                    <span className="text-xs text-muted-foreground tabular-nums">{line.unidades} uds · {fmt(line.importe)}</span>
                  </div>

                  <Select
                    value={currentValue}
                    onValueChange={async (v) => {
                      if (v === `__create__${idx}`) {
                        const name = suggestedName;
                        if (!name) return;
                        if (familias.some(f => f.nombre.toLowerCase() === name.toLowerCase())) {
                          setResolveMapping(prev => ({ ...prev, [idx]: name }));
                          toast.info(`"${name}" ya existe, asignada automáticamente`);
                          return;
                        }
                        setCreatingFamilia(true);
                        try {
                          await supabase.from('familias').insert({ nombre: name, orden: familias.length });
                          await qc.invalidateQueries({ queryKey: ['familias'] });
                          setResolveMapping(prev => ({ ...prev, [idx]: name }));
                          toast.success(`Familia "${name}" creada`);
                        } catch {
                          toast.error('Error creando familia');
                        } finally {
                          setCreatingFamilia(false);
                        }
                      } else {
                        setResolveMapping(prev => ({ ...prev, [idx]: v }));
                      }
                    }}
                  >
                    <SelectTrigger className="bg-background text-sm">
                      <SelectValue placeholder="Asignar a familia..." />
                    </SelectTrigger>
                    <SelectContent>
                      {familias.map(f => (
                        <SelectItem key={f.id} value={f.nombre}>{f.nombre}</SelectItem>
                      ))}
                      <SelectItem value={`__create__${idx}`} className="text-primary font-medium border-t border-[hsl(var(--divider))] mt-1">
                        <span className="flex items-center gap-1.5">
                          <PlusCircle className="h-3.5 w-3.5" />
                          Crear "{suggestedName}"
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
          </div>

          {pendingMultiQueue.length > 1 && (
            <p className="text-xs text-muted-foreground">
              {pendingMultiQueue.length - 1} ticket{pendingMultiQueue.length > 2 ? 's' : ''} más pendiente{pendingMultiQueue.length > 2 ? 's' : ''} de resolver.
            </p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setResolveOpen(false); setUnmatchedLines([]); setPendingMultiQueue([]); }}>
              Cancelar
            </Button>
            <Button
              onClick={pendingMultiQueue.length > 0 ? confirmResolveMulti : confirmResolve}
              disabled={Object.keys(resolveMapping).length < unmatchedLines.length}
              className="active:scale-95"
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteDialog open={deleteOpen} onOpenChange={setDeleteOpen} onConfirm={() => delMut.mutate()} isPending={delMut.isPending} title="¿Eliminar arqueo?" description="Se eliminará el arqueo Z y sus datos de familias." />
    </div>
  );
}
