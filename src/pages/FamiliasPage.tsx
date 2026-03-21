import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DeleteDialog } from '@/components/DeleteDialog';
import { fetchFamilias } from '@/lib/queries';
import { upsertFamilia, deleteFamilia } from '@/lib/mutations';
import { Plus, Pencil, Trash2, GripVertical } from 'lucide-react';
import { toast } from 'sonner';

const ICONS = ['🍽️', '🥩', '🐟', '🥗', '🍕', '🍷', '🍺', '☕', '🧁', '🍝', '🥘', '🧀', '🍞', '📦'];

const emptyForm = { nombre: '', icon: '🍽️', orden: 0 };

export default function FamiliasPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const qc = useQueryClient();
  const { data: familias = [], isLoading } = useQuery({ queryKey: ['familias'], queryFn: fetchFamilias });

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

  return (
    <div className="space-y-5">
      <PageHeader title="Familias (Ventas)" description="Familias de venta para clasificar platos y elaboraciones">
        <Button className="gap-2 active:scale-95" onClick={openNew}><Plus className="h-4 w-4" /> Nueva Familia</Button>
      </PageHeader>

      {isLoading ? (
        <div className="text-sm text-muted-foreground p-8 text-center">Cargando familias...</div>
      ) : familias.length === 0 ? (
        <div className="text-sm text-muted-foreground p-8 text-center">No hay familias. Crea la primera.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in-up">
          {familias.map(f => (
            <div key={f.id} className="panel-card group cursor-pointer active:scale-[0.98]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{f.icon}</span>
                  <div>
                    <h3 className="font-semibold">{f.nombre}</h3>
                    <p className="text-xs text-muted-foreground">Orden: {f.orden}</p>
                  </div>
                </div>
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(f)} className="p-1.5 rounded-md text-muted-foreground hover:bg-[hsl(var(--surface-offset))] hover:text-foreground transition-colors">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => openDelete(f.id)} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
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
