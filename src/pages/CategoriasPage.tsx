import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DeleteDialog } from '@/components/DeleteDialog';
import { fetchCategorias } from '@/lib/queries';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

const ICONS = ['📦', '🥩', '🐟', '🥬', '🧀', '🍞', '🍷', '🍺', '🥤', '🧴', '🍳', '🥚', '🧈', '🫒', '🍫', '🌶️'];
const TIPOS = [
  { value: 'comida', label: 'Comida' },
  { value: 'bebida', label: 'Bebida' },
  { value: 'otro', label: 'Otro' },
];

const emptyForm = { nombre: '', icon: '📦', tipo: 'otro', orden: 0 };

export default function CategoriasPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [subcategorias, setSubcategorias] = useState<{ id?: string; nombre: string }[]>([]);
  const [newSub, setNewSub] = useState('');

  const qc = useQueryClient();
  const { data: categorias = [], isLoading } = useQuery({ queryKey: ['categorias'], queryFn: fetchCategorias });

  const saveMut = useMutation({
    mutationFn: async () => {
      const { id, ...rest } = { id: editId, ...form };
      if (id) {
        const { error } = await supabase.from('categorias').update({ nombre: rest.nombre, icon: rest.icon, tipo: rest.tipo, orden: rest.orden }).eq('id', id);
        if (error) throw error;
        // Sync subcategorias: delete removed, insert new
        const existing = categorias.find(c => c.id === id)?.subcategorias || [];
        const existingIds = existing.map((s: any) => s.id);
        const keepIds = subcategorias.filter(s => s.id).map(s => s.id!);
        const toDelete = existingIds.filter((eid: string) => !keepIds.includes(eid));
        if (toDelete.length > 0) {
          await supabase.from('subcategorias').delete().in('id', toDelete);
        }
        const toInsert = subcategorias.filter(s => !s.id && s.nombre.trim());
        if (toInsert.length > 0) {
          await supabase.from('subcategorias').insert(toInsert.map(s => ({ categoria_id: id, nombre: s.nombre })));
        }
      } else {
        const { data: inserted, error } = await supabase.from('categorias').insert({ nombre: rest.nombre, icon: rest.icon, tipo: rest.tipo, orden: rest.orden }).select('id').single();
        if (error) throw error;
        const toInsert = subcategorias.filter(s => s.nombre.trim());
        if (toInsert.length > 0 && inserted) {
          await supabase.from('subcategorias').insert(toInsert.map(s => ({ categoria_id: inserted.id, nombre: s.nombre })));
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categorias'] });
      setDialogOpen(false);
      toast.success(editId ? 'Categoría actualizada' : 'Categoría creada');
    },
    onError: () => toast.error('Error guardando categoría'),
  });

  const delMut = useMutation({
    mutationFn: async () => {
      // Delete subcategorias first
      await supabase.from('subcategorias').delete().eq('categoria_id', deleteId!);
      const { error } = await supabase.from('categorias').delete().eq('id', deleteId!);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categorias'] });
      setDeleteOpen(false);
      toast.success('Categoría eliminada');
    },
    onError: () => toast.error('Error eliminando categoría'),
  });

  const openNew = () => {
    setEditId(null);
    setForm(emptyForm);
    setSubcategorias([]);
    setDialogOpen(true);
  };

  const openEdit = (cat: any) => {
    setEditId(cat.id);
    setForm({ nombre: cat.nombre, icon: cat.icon || '📦', tipo: cat.tipo || 'otro', orden: cat.orden || 0 });
    setSubcategorias((cat.subcategorias || []).map((s: any) => ({ id: s.id, nombre: s.nombre })));
    setDialogOpen(true);
  };

  const openDelete = (id: string) => { setDeleteId(id); setDeleteOpen(true); };

  const addSub = () => {
    if (!newSub.trim()) return;
    setSubcategorias(prev => [...prev, { nombre: newSub.trim() }]);
    setNewSub('');
  };

  const removeSub = (idx: number) => {
    setSubcategorias(prev => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Categorías (Compras)" description="Organiza los productos por categoría de compra">
        <Button className="gap-2 active:scale-95" onClick={openNew}><Plus className="h-4 w-4" /> Nueva Categoría</Button>
      </PageHeader>

      {isLoading ? (
        <div className="text-sm text-muted-foreground p-8 text-center">Cargando categorías...</div>
      ) : categorias.length === 0 ? (
        <div className="text-sm text-muted-foreground p-8 text-center">No hay categorías. Crea la primera.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-fade-in-up">
          {categorias.map(cat => (
            <div key={cat.id} className="panel-card group">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-[hsl(var(--surface-offset))] flex items-center justify-center text-lg">
                    {cat.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{cat.nombre}</h3>
                    <span className={`inline-block mt-0.5 text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                      cat.tipo === 'comida' ? 'bg-[hsl(var(--success-highlight))] text-[hsl(var(--success))]'
                      : cat.tipo === 'bebida' ? 'bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))]'
                      : 'bg-[hsl(var(--surface-offset))] text-muted-foreground'
                    }`}>
                      {cat.tipo === 'comida' ? 'Comida' : cat.tipo === 'bebida' ? 'Bebida' : 'Otro'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(cat)} className="p-1 rounded-md text-muted-foreground hover:bg-[hsl(var(--surface-offset))] hover:text-foreground transition-colors">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => openDelete(cat.id)} className="p-1 rounded-md text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {(cat.subcategorias || []).map((sub: any) => (
                  <span key={sub.id} className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border border-[hsl(var(--divider))] text-muted-foreground">
                    {sub.nombre}
                  </span>
                ))}
                {(!cat.subcategorias || cat.subcategorias.length === 0) && (
                  <span className="text-[10px] text-muted-foreground">Sin subcategorías</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? 'Editar Categoría' : 'Nueva Categoría'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm font-semibold">Nombre *</Label>
              <Input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} className="mt-1.5 bg-background" maxLength={50} />
            </div>
            <div>
              <Label className="text-sm font-semibold mb-2 block">Icono</Label>
              <div className="flex flex-wrap gap-2">
                {ICONS.map(ic => (
                  <button key={ic} onClick={() => setForm(f => ({ ...f, icon: ic }))} className={`text-xl p-1.5 rounded-lg transition-colors ${form.icon === ic ? 'bg-primary/10 ring-2 ring-primary' : 'hover:bg-[hsl(var(--surface-offset))]'}`}>
                    {ic}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-semibold">Tipo</Label>
                <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
                  <SelectTrigger className="mt-1.5 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-semibold">Orden</Label>
                <Input type="number" value={form.orden} onChange={e => setForm(f => ({ ...f, orden: parseInt(e.target.value) || 0 }))} className="mt-1.5 bg-background" />
              </div>
            </div>

            {/* Subcategorías */}
            <div>
              <Label className="text-sm font-semibold mb-2 block">Subcategorías</Label>
              <div className="space-y-1.5">
                {subcategorias.map((sub, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-[hsl(var(--surface-offset))] rounded-lg px-3 py-1.5">
                    <span className="text-sm flex-1">{sub.nombre}</span>
                    <button onClick={() => removeSub(idx)} className="p-0.5 text-muted-foreground hover:text-destructive transition-colors">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <Input
                  placeholder="Nueva subcategoría..."
                  value={newSub}
                  onChange={e => setNewSub(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSub())}
                  className="bg-background text-sm"
                />
                <Button variant="outline" size="sm" onClick={addSub} disabled={!newSub.trim()}>Añadir</Button>
              </div>
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

      <DeleteDialog open={deleteOpen} onOpenChange={setDeleteOpen} onConfirm={() => delMut.mutate()} isPending={delMut.isPending} title="¿Eliminar categoría?" description="Se eliminará la categoría y sus subcategorías." />
    </div>
  );
}
