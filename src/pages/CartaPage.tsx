import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DeleteDialog } from '@/components/DeleteDialog';
import { fetchPlatos, fetchFamilias, fmt } from '@/lib/queries';
import { upsertPlato, deletePlato } from '@/lib/mutations';
import { supabase } from '@/integrations/supabase/client';
import { Plus, ChefHat, Search, Pencil, Trash2, Camera, Loader2, Check, X } from 'lucide-react';
import { toast } from 'sonner';

const emptyForm = { nombre: '', familia_id: '', pvp: 0, coste: 0 };

interface ScannedPlato {
  nombre: string;
  pvp: number;
  familia: string;
  selected: boolean;
}

export default function CartaPage() {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [scanDialogOpen, setScanDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [scanning, setScanning] = useState(false);
  const [scannedPlatos, setScannedPlatos] = useState<ScannedPlato[]>([]);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const qc = useQueryClient();
  const { data: platos = [], isLoading } = useQuery({ queryKey: ['platos'], queryFn: fetchPlatos });
  const { data: familias = [] } = useQuery({ queryKey: ['familias'], queryFn: fetchFamilias });

  const familiaMap = Object.fromEntries(familias.map(f => [f.id, f.nombre]));
  const familiaByName = Object.fromEntries(familias.map(f => [f.nombre.toLowerCase(), f.id]));

  const filtered = platos.filter(p =>
    !search || p.nombre.toLowerCase().includes(search.toLowerCase())
  );

  const saveMut = useMutation({
    mutationFn: () => {
      const pvp = Number(form.pvp) || 0;
      const coste = Number(form.coste) || 0;
      const margen_pct = pvp > 0 ? ((pvp - coste) / pvp * 100) : 0;
      return upsertPlato({
        id: editId || undefined,
        nombre: form.nombre,
        familia_id: form.familia_id || undefined,
        pvp, coste,
        margen_pct: Math.round(margen_pct * 10) / 10,
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['platos'] }); setDialogOpen(false); toast.success(editId ? 'Plato actualizado' : 'Plato creado'); },
    onError: () => toast.error('Error guardando plato'),
  });

  const delMut = useMutation({
    mutationFn: () => deletePlato(deleteId!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['platos'] }); setDeleteOpen(false); toast.success('Plato eliminado'); },
    onError: () => toast.error('Error eliminando plato'),
  });

  const openNew = () => { setEditId(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (p: any) => {
    setEditId(p.id);
    setForm({ nombre: p.nombre, familia_id: p.familia_id || '', pvp: Number(p.pvp) || 0, coste: Number(p.coste) || 0 });
    setDialogOpen(true);
  };
  const openDelete = (id: string) => { setDeleteId(id); setDeleteOpen(true); };

  const margenPreview = Number(form.pvp) > 0 ? (((Number(form.pvp) - Number(form.coste)) / Number(form.pvp)) * 100) : 0;

  // ── Scan carta ──
  const handleScanFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanning(true);
    setScanDialogOpen(true);
    setScannedPlatos([]);

    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke('process-carta', {
        body: { image_base64: base64, familias_conocidas: familias.map(f => f.nombre) },
      });

      if (error) throw error;

      if (data.platos && Array.isArray(data.platos)) {
        setScannedPlatos(data.platos.map((p: any) => ({
          nombre: p.nombre || '',
          pvp: Number(p.pvp) || 0,
          familia: p.familia || '',
          selected: true,
        })));
        toast.success(`${data.platos.length} platos detectados`);
      } else {
        toast.error('No se encontraron platos en la imagen');
      }
    } catch (err) {
      console.error('Scan error:', err);
      toast.error('Error interpretando la carta');
    } finally {
      setScanning(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const toggleScanned = (idx: number) => {
    setScannedPlatos(prev => prev.map((p, i) => i === idx ? { ...p, selected: !p.selected } : p));
  };

  const importScanned = async () => {
    const toImport = scannedPlatos.filter(p => p.selected && p.nombre.trim());
    if (toImport.length === 0) return;

    setImporting(true);
    try {
      for (const p of toImport) {
        const matchedFamilia = familiaByName[p.familia.toLowerCase()] || undefined;
        await upsertPlato({
          nombre: p.nombre,
          pvp: p.pvp,
          coste: 0,
          margen_pct: 100,
          familia_id: matchedFamilia,
        });
      }
      qc.invalidateQueries({ queryKey: ['platos'] });
      setScanDialogOpen(false);
      toast.success(`${toImport.length} platos importados`);
    } catch {
      toast.error('Error importando platos');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Carta" description="Elaboraciones y escandallos — controla el food cost de cada plato">
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 active:scale-95" onClick={() => fileRef.current?.click()}>
            <Camera className="h-4 w-4" /> Escanear Carta
          </Button>
          <Button className="gap-2 active:scale-95" onClick={openNew}><Plus className="h-4 w-4" /> Nueva Elaboración</Button>
        </div>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleScanFile} />
      </PageHeader>

      <div className="relative max-w-md animate-fade-in-up">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar plato..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-card" />
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground p-8 text-center">Cargando carta...</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-muted-foreground p-8 text-center">No hay platos. Crea el primero o escanea una carta.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in-up">
          {filtered.map(p => {
            const margen = Number(p.margen_pct) || 0;
            return (
              <div key={p.id} className="panel-card cursor-pointer group active:scale-[0.98]">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <ChefHat className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate">{p.nombre}</h3>
                    <p className="text-xs text-muted-foreground">{p.familia_id ? familiaMap[p.familia_id] || '—' : 'Sin familia'}</p>
                  </div>
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(p)} className="p-1.5 rounded-md text-muted-foreground hover:text-primary transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => openDelete(p.id)} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-[hsl(var(--divider))]">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">PVP</p>
                    <p className="font-semibold tabular-nums text-sm">{fmt(Number(p.pvp))}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Coste</p>
                    <p className="font-semibold tabular-nums text-sm">{fmt(Number(p.coste))}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Margen</p>
                    <p className={`font-bold tabular-nums text-sm ${
                      margen >= 65 ? 'text-[hsl(var(--success))]' : margen >= 50 ? 'text-[hsl(var(--warning))]' : 'text-[hsl(var(--error))]'
                    }`}>
                      {margen.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? 'Editar Plato' : 'Nueva Elaboración'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm font-semibold">Nombre *</Label>
              <Input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} className="mt-1.5 bg-background" />
            </div>
            <div>
              <Label className="text-sm font-semibold">Familia</Label>
              <Select value={form.familia_id} onValueChange={v => setForm(f => ({ ...f, familia_id: v }))}>
                <SelectTrigger className="mt-1.5 bg-background">
                  <SelectValue placeholder="Selecciona familia" />
                </SelectTrigger>
                <SelectContent>
                  {familias.map(f => (
                    <SelectItem key={f.id} value={f.id}>{f.icon} {f.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-semibold">PVP (€)</Label>
                <Input type="number" step="0.01" value={form.pvp} onChange={e => setForm(f => ({ ...f, pvp: parseFloat(e.target.value) || 0 }))} className="mt-1.5 bg-background" />
              </div>
              <div>
                <Label className="text-sm font-semibold">Coste (€)</Label>
                <Input type="number" step="0.01" value={form.coste} onChange={e => setForm(f => ({ ...f, coste: parseFloat(e.target.value) || 0 }))} className="mt-1.5 bg-background" />
              </div>
            </div>
            {Number(form.pvp) > 0 && (
              <div className="bg-[hsl(var(--surface-offset))] rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Margen estimado</p>
                <p className={`text-lg font-bold tabular-nums ${
                  margenPreview >= 65 ? 'text-[hsl(var(--success))]' : margenPreview >= 50 ? 'text-[hsl(var(--warning))]' : 'text-[hsl(var(--error))]'
                }`}>
                  {margenPreview.toFixed(1)}%
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => saveMut.mutate()} disabled={!form.nombre.trim() || saveMut.isPending} className="active:scale-95">
              {saveMut.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Scan results dialog */}
      <Dialog open={scanDialogOpen} onOpenChange={setScanDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Platos detectados en la carta</DialogTitle>
          </DialogHeader>

          {scanning ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Interpretando carta con IA...</p>
            </div>
          ) : scannedPlatos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No se encontraron platos.</p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Selecciona los platos que quieres importar. Se encontraron <strong>{scannedPlatos.length}</strong> platos.
              </p>
              <div className="space-y-1.5 max-h-[50vh] overflow-y-auto">
                {scannedPlatos.map((p, idx) => (
                  <div
                    key={idx}
                    onClick={() => toggleScanned(idx)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                      p.selected ? 'bg-primary/5 border border-primary/20' : 'bg-[hsl(var(--surface-offset))] border border-transparent opacity-50'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${
                      p.selected ? 'bg-primary text-primary-foreground' : 'border border-muted-foreground/30'
                    }`}>
                      {p.selected && <Check className="h-3 w-3" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.nombre}</p>
                      <p className="text-xs text-muted-foreground">{p.familia || 'Sin familia'}</p>
                    </div>
                    <p className="text-sm font-semibold tabular-nums shrink-0">{fmt(p.pvp)}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setScanDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={importScanned}
              disabled={importing || scannedPlatos.filter(p => p.selected).length === 0}
              className="active:scale-95 gap-2"
            >
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {importing ? 'Importando...' : `Importar ${scannedPlatos.filter(p => p.selected).length} platos`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteDialog open={deleteOpen} onOpenChange={setDeleteOpen} onConfirm={() => delMut.mutate()} isPending={delMut.isPending} title="¿Eliminar plato?" description="Se eliminará el plato y sus ingredientes." />
    </div>
  );
}
