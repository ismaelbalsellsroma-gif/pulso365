import { useState } from 'react';
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
import { Plus, ChefHat, Search, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const emptyForm = { nombre: '', familia_id: '', pvp: 0, coste: 0 };

export default function CartaPage() {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const qc = useQueryClient();
  const { data: platos = [], isLoading } = useQuery({ queryKey: ['platos'], queryFn: fetchPlatos });
  const { data: familias = [] } = useQuery({ queryKey: ['familias'], queryFn: fetchFamilias });

  const familiaMap = Object.fromEntries(familias.map(f => [f.id, f.nombre]));

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
        pvp,
        coste,
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

  return (
    <div className="space-y-5">
      <PageHeader title="Carta" description="Elaboraciones y escandallos — controla el food cost de cada plato">
        <Button className="gap-2 active:scale-95" onClick={openNew}><Plus className="h-4 w-4" /> Nueva Elaboración</Button>
      </PageHeader>

      <div className="relative max-w-md animate-fade-in-up">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar plato..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-card" />
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground p-8 text-center">Cargando carta...</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-muted-foreground p-8 text-center">No hay platos. Crea el primero.</div>
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

      <DeleteDialog open={deleteOpen} onOpenChange={setDeleteOpen} onConfirm={() => delMut.mutate()} isPending={delMut.isPending} title="¿Eliminar plato?" description="Se eliminará el plato y sus ingredientes." />
    </div>
  );
}
