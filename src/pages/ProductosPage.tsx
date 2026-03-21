import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DeleteDialog } from '@/components/DeleteDialog';
import { fetchProductos, fetchCategorias, fmt } from '@/lib/queries';
import { upsertProducto, deleteProducto } from '@/lib/mutations';
import { Plus, Search, Package, AlertTriangle, TrendingUp, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const emptyForm = { nombre: '', referencia: '', unidad: 'ud', precio_actual: 0, proveedor_nombre: '', subcategoria_id: '' };

export default function ProductosPage() {
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('todas');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const qc = useQueryClient();
  const { data: productos = [], isLoading } = useQuery({ queryKey: ['productos'], queryFn: fetchProductos });
  const { data: categorias = [] } = useQuery({ queryKey: ['categorias'], queryFn: fetchCategorias });

  // Build subcategoria -> categoria name map
  const subToCategoria: Record<string, string> = {};
  const allSubs: { id: string; nombre: string; categoria_nombre: string }[] = [];
  for (const cat of categorias) {
    for (const sub of (cat.subcategorias || [])) {
      subToCategoria[sub.id] = cat.nombre;
      allSubs.push({ id: sub.id, nombre: sub.nombre, categoria_nombre: cat.nombre });
    }
  }

  const filtered = productos.filter(p => {
    const matchSearch = !search || p.nombre.toLowerCase().includes(search.toLowerCase()) || (p.referencia || '').toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === 'todas' || (p.subcategoria_id && subToCategoria[p.subcategoria_id] === catFilter);
    return matchSearch && matchCat;
  });

  const conCambio = productos.filter(p => p.precio_anterior && Math.abs(Number(p.precio_actual) - Number(p.precio_anterior)) > 0.001).length;

  const saveMut = useMutation({
    mutationFn: () => upsertProducto({
      id: editId || undefined,
      ...form,
      precio_actual: Number(form.precio_actual),
      subcategoria_id: form.subcategoria_id || undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['productos'] }); setDialogOpen(false); toast.success(editId ? 'Producto actualizado' : 'Producto creado'); },
    onError: () => toast.error('Error guardando producto'),
  });

  const delMut = useMutation({
    mutationFn: () => deleteProducto(deleteId!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['productos'] }); setDeleteOpen(false); toast.success('Producto eliminado'); },
    onError: () => toast.error('Error eliminando producto'),
  });

  const openNew = () => { setEditId(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (p: any) => {
    setEditId(p.id);
    setForm({ nombre: p.nombre, referencia: p.referencia || '', unidad: p.unidad || 'ud', precio_actual: Number(p.precio_actual) || 0, proveedor_nombre: p.proveedor_nombre || '', subcategoria_id: p.subcategoria_id || '' });
    setDialogOpen(true);
  };
  const openDelete = (id: string) => { setDeleteId(id); setDeleteOpen(true); };

  const uniqueCatNames = [...new Set(categorias.map(c => c.nombre))];

  return (
    <div className="space-y-5">
      <PageHeader title="Productos" description="Catálogo de productos creados automáticamente desde albaranes">
        <Button className="gap-2 active:scale-95" onClick={openNew}><Plus className="h-4 w-4" /> Nuevo Producto</Button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in-up">
        <div className="panel-card">
          <div className="panel-card-header"><Package className="h-4 w-4" /><span>Total Productos</span></div>
          <div className="panel-card-value text-2xl">{productos.length}</div>
        </div>
        <div className="panel-card">
          <div className="panel-card-header"><TrendingUp className="h-4 w-4" /><span>Con cambio precio</span></div>
          <div className="panel-card-value text-2xl">{conCambio}</div>
        </div>
        <div className="panel-card">
          <div className="panel-card-header"><AlertTriangle className="h-4 w-4" /><span>Sin categoría</span></div>
          <div className="panel-card-value text-2xl" style={{ color: 'hsl(var(--warning))' }}>
            {productos.filter(p => !p.subcategoria_id).length}
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 animate-fade-in-up animate-delay-1">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar producto o referencia..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-card" />
        </div>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-[180px] bg-card">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las categorías</SelectItem>
            {uniqueCatNames.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground p-8 text-center">Cargando productos...</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-muted-foreground p-8 text-center">No hay productos.</div>
      ) : (
        <div className="bg-card border rounded-lg overflow-hidden animate-fade-in-up animate-delay-2">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[hsl(var(--surface-offset))]">
                  {['Ref', 'Producto', 'Categoría', 'Proveedor', 'Precio', 'Anterior', 'Var.', 'Última compra', 'Nº'].map(h => (
                    <th key={h} className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap ${
                      ['Precio', 'Anterior', 'Var.'].includes(h) ? 'text-right' : h === 'Nº' ? 'text-center' : 'text-left'
                    }`}>{h}</th>
                  ))}
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const actual = Number(p.precio_actual);
                  const anterior = Number(p.precio_anterior);
                  let variacion = '—';
                  let varClass = '';
                  if (anterior > 0 && Math.abs(actual - anterior) > 0.001) {
                    const pct = ((actual - anterior) / anterior * 100);
                    variacion = (pct > 0 ? '+' : '') + pct.toFixed(1) + '%';
                    varClass = pct > 0 ? 'text-[hsl(var(--error))] font-semibold' : 'text-[hsl(var(--success))] font-semibold';
                  }
                  const catName = p.subcategoria_id ? subToCategoria[p.subcategoria_id] || '—' : '—';
                  return (
                    <tr key={p.id} className="border-t border-[hsl(var(--divider))] hover:bg-[hsl(var(--surface-offset))] transition-colors group cursor-pointer">
                      <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">{p.referencia || '—'}</td>
                      <td className="px-4 py-3 font-medium">{p.nombre}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{catName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.proveedor_nombre}</td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">{fmt(actual)}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">{anterior > 0 ? fmt(anterior) : '—'}</td>
                      <td className={`px-4 py-3 text-right tabular-nums ${varClass}`}>{variacion}</td>
                      <td className="px-4 py-3 tabular-nums whitespace-nowrap">{p.ultima_compra || '—'}</td>
                      <td className="px-4 py-3 text-center tabular-nums">{p.num_compras}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(p)} className="p-1.5 rounded-md text-muted-foreground hover:text-primary transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                          <button onClick={() => openDelete(p.id)} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? 'Editar Producto' : 'Nuevo Producto'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm font-semibold">Nombre *</Label>
              <Input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} className="mt-1.5 bg-background" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-semibold">Referencia</Label>
                <Input value={form.referencia} onChange={e => setForm(f => ({ ...f, referencia: e.target.value }))} className="mt-1.5 bg-background" />
              </div>
              <div>
                <Label className="text-sm font-semibold">Unidad</Label>
                <Input value={form.unidad} onChange={e => setForm(f => ({ ...f, unidad: e.target.value }))} className="mt-1.5 bg-background" placeholder="ud, kg, l..." />
              </div>
            </div>
            <div>
              <Label className="text-sm font-semibold">Subcategoría</Label>
              <Select value={form.subcategoria_id} onValueChange={v => setForm(f => ({ ...f, subcategoria_id: v }))}>
                <SelectTrigger className="mt-1.5 bg-background">
                  <SelectValue placeholder="Selecciona subcategoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin categoría</SelectItem>
                  {categorias.map(cat => (
                    (cat.subcategorias || []).map((sub: any) => (
                      <SelectItem key={sub.id} value={sub.id}>
                        {cat.icon} {cat.nombre} → {sub.nombre}
                      </SelectItem>
                    ))
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-semibold">Precio actual (€)</Label>
                <Input type="number" step="0.01" value={form.precio_actual} onChange={e => setForm(f => ({ ...f, precio_actual: parseFloat(e.target.value) || 0 }))} className="mt-1.5 bg-background" />
              </div>
              <div>
                <Label className="text-sm font-semibold">Proveedor</Label>
                <Input value={form.proveedor_nombre} onChange={e => setForm(f => ({ ...f, proveedor_nombre: e.target.value }))} className="mt-1.5 bg-background" />
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

      <DeleteDialog open={deleteOpen} onOpenChange={setDeleteOpen} onConfirm={() => delMut.mutate()} isPending={delMut.isPending} title="¿Eliminar producto?" description="Se eliminará el producto y su historial de precios." />
    </div>
  );
}
