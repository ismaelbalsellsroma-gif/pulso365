import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { PeriodSelector } from '@/components/PeriodSelector';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DeleteDialog } from '@/components/DeleteDialog';
import { fetchFamilias, fetchArqueos, fmt } from '@/lib/queries';
import { upsertFamilia, deleteFamilia } from '@/lib/mutations';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const ICONS = ['🍽️', '🥩', '🐟', '🥗', '🍕', '🍷', '🍺', '☕', '🧁', '🍝', '🥘', '🧀', '🍞', '📦'];
const emptyForm = { nombre: '', icon: '🍽️', orden: 0 };

function toISO(d: Date) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

export default function FamiliasPage() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [desde, setDesde] = useState(toISO(monthStart));
  const [hasta, setHasta] = useState(toISO(now));

  const qc = useQueryClient();
  const { data: familias = [], isLoading } = useQuery({ queryKey: ['familias'], queryFn: fetchFamilias });
  const { data: arqueos = [] } = useQuery({ queryKey: ['arqueos'], queryFn: fetchArqueos });

  // Aggregate sales per family within selected period
  const salesByFamily = useMemo(() => {
    const map: Record<string, { importe: number; unidades: number }> = {};
    for (const arq of arqueos) {
      if (arq.fecha < desde || arq.fecha > hasta) continue;
      for (const af of (arq.arqueo_familias || [])) {
        const name = af.familia_nombre;
        if (!map[name]) map[name] = { importe: 0, unidades: 0 };
        map[name].importe += Number(af.importe) || 0;
        map[name].unidades += Number(af.unidades) || 0;
      }
    }
    return map;
  }, [arqueos, desde, hasta]);

  const totalVentas = Object.values(salesByFamily).reduce((s, v) => s + v.importe, 0);

  const saveMut = useMutation({
    mutationFn: () => upsertFamilia({ id: editId || undefined, ...form }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['familias'] }); setDialogOpen(false); toast.success(editId ? 'Familia actualizada' : 'Familia creada'); },
    onError: () => toast.error('Error guardando familia'),
  });

  const delMut = useMutation({
    mutationFn: () => deleteFamilia(deleteId!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['familias'] }); setDeleteOpen(false); toast.success('Familia eliminada'); },
    onError: () => toast.error('Error eliminando familia'),
  });

  const openNew = () => { setEditId(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (f: any) => {
    setEditId(f.id);
    setForm({ nombre: f.nombre, icon: f.icon || '🍽️', orden: f.orden || 0 });
    setDialogOpen(true);
  };
  const openDelete = (id: string) => { setDeleteId(id); setDeleteOpen(true); };

  // Sort families by sales descending
  const sortedFamilias = useMemo(() => {
    return [...familias].sort((a, b) => {
      const sa = salesByFamily[a.nombre]?.importe || 0;
      const sb = salesByFamily[b.nombre]?.importe || 0;
      return sb - sa;
    });
  }, [familias, salesByFamily]);

  return (
    <div className="space-y-5">
      <PageHeader title="Familias (Ventas)" description="Familias de venta — facturación por período">
        <div className="flex items-center gap-2 flex-wrap">
          <PeriodSelector onChange={(d, h) => { setDesde(d); setHasta(h); }} />
          <Button className="gap-2 active:scale-95" onClick={openNew}><Plus className="h-4 w-4" /> Nueva</Button>
        </div>
      </PageHeader>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 animate-fade-in-up">
        <div className="panel-card">
          <div className="panel-card-header"><span>Familias</span></div>
          <div className="panel-card-value text-2xl">{familias.length}</div>
        </div>
        <div className="panel-card">
          <div className="panel-card-header"><span>Ventas período (sin IVA)</span></div>
          <div className="panel-card-value text-2xl tabular-nums">{fmt(totalVentas)}</div>
        </div>
        <div className="panel-card">
          <div className="panel-card-header"><span>Arqueos período</span></div>
          <div className="panel-card-value text-2xl">{arqueos.filter(a => a.fecha >= desde && a.fecha <= hasta).length}</div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground p-8 text-center">Cargando familias...</div>
      ) : familias.length === 0 ? (
        <div className="text-sm text-muted-foreground p-8 text-center">No hay familias. Crea la primera.</div>
      ) : (
        <div className="panel-card !p-0 overflow-hidden animate-fade-in-up">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[hsl(var(--surface-offset))]">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Familia</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Uds</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ventas sin IVA</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">% Total</th>
                <th className="px-4 py-3 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {sortedFamilias.map(f => {
                const sales = salesByFamily[f.nombre];
                const importe = sales?.importe || 0;
                const unidades = sales?.unidades || 0;
                const pct = totalVentas > 0 ? (importe / totalVentas) * 100 : 0;

                return (
                  <tr key={f.id} className="border-t border-[hsl(var(--divider))] group hover:bg-[hsl(var(--surface-offset))] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">{f.icon}</span>
                        <span className="font-medium">{f.nombre}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums">{unidades || '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">{importe > 0 ? fmt(importe) : '—'}</td>
                    <td className="px-4 py-3 text-right">
                      {pct > 0 ? (
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                          <span className="text-xs tabular-nums font-medium w-10 text-right">{pct.toFixed(1)}%</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-0.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(f)} className="p-1.5 rounded-md text-muted-foreground hover:text-primary transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                        <button onClick={() => openDelete(f.id)} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {/* Totals row */}
              <tr className="border-t-2 border-[hsl(var(--divider))] bg-[hsl(var(--surface-offset))] font-semibold">
                <td className="px-4 py-3">Total</td>
                <td className="px-4 py-3 text-center tabular-nums">{Object.values(salesByFamily).reduce((s, v) => s + v.unidades, 0)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{fmt(totalVentas)}</td>
                <td className="px-4 py-3 text-right text-xs tabular-nums">{totalVentas > 0 ? '100%' : '—'}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? 'Editar Familia' : 'Nueva Familia'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm font-semibold">Nombre *</Label>
              <Input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} className="mt-1.5 bg-background" />
            </div>
            <div>
              <Label className="text-sm font-semibold mb-2 block">Icono</Label>
              <div className="flex flex-wrap gap-2">
                {ICONS.map(ic => (
                  <button key={ic} onClick={() => setForm(f => ({ ...f, icon: ic }))} className={`text-2xl p-1.5 rounded-lg transition-colors ${form.icon === ic ? 'bg-primary/10 ring-2 ring-primary' : 'hover:bg-[hsl(var(--surface-offset))]'}`}>
                    {ic}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-sm font-semibold">Orden</Label>
              <Input type="number" value={form.orden} onChange={e => setForm(f => ({ ...f, orden: parseInt(e.target.value) || 0 }))} className="mt-1.5 bg-background w-24" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => saveMut.mutate()} disabled={!form.nombre.trim() || saveMut.isPending} className="active:scale-95">
              {saveMut.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteDialog open={deleteOpen} onOpenChange={setDeleteOpen} onConfirm={() => delMut.mutate()} isPending={delMut.isPending} title="¿Eliminar familia?" description="Se eliminará la familia. Los platos asociados no se borrarán." />
    </div>
  );
}
