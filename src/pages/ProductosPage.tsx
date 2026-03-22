import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DeleteDialog } from '@/components/DeleteDialog';
import { supabase } from '@/integrations/supabase/client';
import { fetchProductos, fetchCategorias, fetchAlbaranes, fmt } from '@/lib/queries';
import { upsertProducto, deleteProducto } from '@/lib/mutations';
import { Plus, Search, Package, AlertTriangle, TrendingUp, Pencil, Trash2, FolderPlus, ArrowLeft, ExternalLink, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

const UNIDADES_CONTENIDO = ['kg', 'g', 'L', 'ml', 'ud'];
const emptyForm = { nombre: '', referencia: '', unidad: 'ud', precio_actual: 0, proveedor_nombre: '', categoria_id: '', contenido_neto: '' as string, contenido_unidad: 'kg' };

export default function ProductosPage() {
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('todas');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  // Quick category assignment
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [catProductId, setCatProductId] = useState<string | null>(null);
  const [catProductName, setCatProductName] = useState('');
  const [selectedCatId, setSelectedCatId] = useState('');

  // Inline new category creation
  const [newCatMode, setNewCatMode] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('📦');
  const [newCatTipo, setNewCatTipo] = useState('otro');

  const qc = useQueryClient();
  const { data: productos = [], isLoading } = useQuery({ queryKey: ['productos'], queryFn: fetchProductos });
  const { data: categorias = [] } = useQuery({ queryKey: ['categorias'], queryFn: fetchCategorias });

  // Build categoria id -> name map
  const catMap: Record<string, { nombre: string; icon: string }> = {};
  for (const cat of categorias) {
    catMap[cat.id] = { nombre: cat.nombre, icon: cat.icon || '📦' };
  }

  const filtered = productos.filter(p => {
    const matchSearch = !search || p.nombre.toLowerCase().includes(search.toLowerCase()) || (p.referencia || '').toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === 'todas' || catFilter === 'sin_categoria'
      ? (catFilter === 'sin_categoria' ? !(p as any).categoria_id : true)
      : ((p as any).categoria_id && catMap[(p as any).categoria_id]?.nombre === catFilter);
    return matchSearch && matchCat;
  });

  const sinCategoria = productos.filter(p => !(p as any).categoria_id);
  const conCambio = productos.filter(p => p.precio_anterior && Math.abs(Number(p.precio_actual) - Number(p.precio_anterior)) > 0.001).length;

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload: any = {
        id: editId || undefined,
        nombre: form.nombre,
        referencia: form.referencia,
        unidad: form.unidad,
        precio_actual: Number(form.precio_actual),
        proveedor_nombre: form.proveedor_nombre,
        contenido_neto: form.contenido_neto ? parseFloat(form.contenido_neto) : null,
        contenido_unidad: form.contenido_neto ? form.contenido_unidad : null,
      };
      if (form.categoria_id) {
        payload.categoria_id = form.categoria_id;
      } else {
        payload.categoria_id = null;
      }
      await upsertProducto(payload);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['productos'] }); setDialogOpen(false); toast.success(editId ? 'Producto actualizado' : 'Producto creado'); },
    onError: () => toast.error('Error guardando producto'),
  });

  const delMut = useMutation({
    mutationFn: () => deleteProducto(deleteId!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['productos'] }); setDeleteOpen(false); toast.success('Producto eliminado'); },
    onError: () => toast.error('Error eliminando producto'),
  });

  // Quick category assignment mutation
  const assignCatMut = useMutation({
    mutationFn: async () => {
      if (!catProductId || !selectedCatId) return;
      const { error } = await supabase.from('productos').update({ categoria_id: selectedCatId } as any).eq('id', catProductId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['productos'] });
      setCatDialogOpen(false);
      toast.success('Categoría asignada');
    },
    onError: () => toast.error('Error asignando categoría'),
  });

  // Create new category inline
  const createCatMut = useMutation({
    mutationFn: async () => {
      if (!newCatName.trim()) return;
      const { data, error } = await supabase.from('categorias').insert({ nombre: newCatName.trim(), icon: newCatIcon, tipo: newCatTipo }).select('id').single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['categorias'] });
      if (data) {
        setSelectedCatId(data.id);
        setNewCatMode(false);
        setNewCatName('');
      }
      toast.success('Categoría creada');
    },
    onError: () => toast.error('Error creando categoría'),
  });

  const openNew = () => { setEditId(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (p: any) => {
    setEditId(p.id);
    setForm({ nombre: p.nombre, referencia: p.referencia || '', unidad: p.unidad || 'ud', precio_actual: Number(p.precio_actual) || 0, proveedor_nombre: p.proveedor_nombre || '', categoria_id: p.categoria_id || '', contenido_neto: p.contenido_neto != null ? String(p.contenido_neto) : '', contenido_unidad: p.contenido_unidad || 'kg' });
    setDialogOpen(true);
  };
  const openDelete = (id: string) => { setDeleteId(id); setDeleteOpen(true); };

  // Quick category dialog
  const openQuickCat = (e: React.MouseEvent, p: any) => {
    e.stopPropagation();
    setCatProductId(p.id);
    setCatProductName(p.nombre);
    setSelectedCatId(p.categoria_id || '');
    setNewCatMode(false);
    setCatDialogOpen(true);
  };

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
        <div className="panel-card cursor-pointer hover:ring-2 hover:ring-amber-400/50 transition-all active:scale-[0.98]" onClick={() => setCatFilter(catFilter === 'sin_categoria' ? 'todas' : 'sin_categoria')}>
          <div className="panel-card-header"><AlertTriangle className="h-4 w-4 text-amber-500" /><span>Sin categoría</span></div>
          <div className="panel-card-value text-2xl text-amber-500 font-bold">{sinCategoria.length}</div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 animate-fade-in-up animate-delay-1">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar producto o referencia..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-card" />
        </div>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-[200px] bg-card">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las categorías</SelectItem>
            <SelectItem value="sin_categoria">
              <span className="text-amber-500 font-semibold">⚠ Sin categoría ({sinCategoria.length})</span>
            </SelectItem>
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
                  {['Ref', 'Producto', 'Categoría', 'Proveedor', 'Precio', 'Cont. Neto', 'Precio Real', 'Var.', 'Última compra', 'Nº'].map(h => (
                    <th key={h} className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap ${
                      ['Precio', 'Precio Real', 'Var.'].includes(h) ? 'text-right' : h === 'Nº' ? 'text-center' : 'text-left'
                    }`}>{h}</th>
                  ))}
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const actual = Number(p.precio_actual);
                  const anterior = Number(p.precio_anterior);
                  const pCatId = (p as any).categoria_id;
                  const noCat = !pCatId;
                  let variacion = '—';
                  let varClass = '';
                  if (anterior > 0 && Math.abs(actual - anterior) > 0.001) {
                    const pct = ((actual - anterior) / anterior * 100);
                    variacion = (pct > 0 ? '+' : '') + pct.toFixed(1) + '%';
                    varClass = pct > 0 ? 'text-[hsl(var(--error))] font-semibold' : 'text-[hsl(var(--success))] font-semibold';
                  }
                  const catInfo = pCatId ? catMap[pCatId] : null;
                  return (
                    <tr
                      key={p.id}
                      className={`border-t border-[hsl(var(--divider))] hover:bg-[hsl(var(--surface-offset))] transition-colors group cursor-pointer ${noCat ? 'bg-amber-500/[0.06]' : ''}`}
                      onClick={() => openEdit(p)}
                    >
                      <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">{p.referencia || '—'}</td>
                      <td className="px-4 py-3 font-medium">{p.nombre}</td>
                      <td className="px-4 py-3 text-xs">
                        {catInfo ? (
                          <span className="text-muted-foreground">{catInfo.icon} {catInfo.nombre}</span>
                        ) : (
                          <button
                            onClick={e => openQuickCat(e, p)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600 border border-amber-500/25 text-[11px] font-semibold hover:bg-amber-500/25 transition-colors active:scale-95"
                          >
                            <AlertTriangle className="h-3 w-3" /> Asignar
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{p.proveedor_nombre}</td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">{fmt(actual)}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {(p as any).contenido_neto ? `${(p as any).contenido_neto} ${(p as any).contenido_unidad || 'kg'}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium">
                        {(p as any).contenido_neto && (p as any).contenido_neto > 0
                          ? fmt(actual / Number((p as any).contenido_neto)) + '/' + ((p as any).contenido_unidad || 'kg')
                          : '—'}
                      </td>
                      <td className={`px-4 py-3 text-right tabular-nums ${varClass}`}>{variacion}</td>
                      <td className="px-4 py-3 tabular-nums whitespace-nowrap">{p.ultima_compra || '—'}</td>
                      <td className="px-4 py-3 text-center tabular-nums">{p.num_compras}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
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

      {/* Edit / New product dialog */}
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
              <Label className="text-sm font-semibold">Categoría</Label>
              <Select value={form.categoria_id || 'none'} onValueChange={v => setForm(f => ({ ...f, categoria_id: v === 'none' ? '' : v }))}>
                <SelectTrigger className="mt-1.5 bg-background">
                  <SelectValue placeholder="Selecciona categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin categoría</SelectItem>
                  {categorias.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.icon} {cat.nombre}
                    </SelectItem>
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
            {/* Contenido neto para escandallos */}
            <div className="p-3 rounded-lg bg-muted/30 border space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">📦 Contenido neto (para escandallos)</p>
              <p className="text-[11px] text-muted-foreground">Define cuánto producto real contiene la unidad comercial. Ej: una bolsa de lechuga = 1.6 kg</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Cantidad real</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Ej: 1.6"
                    value={form.contenido_neto}
                    onChange={e => setForm(f => ({ ...f, contenido_neto: e.target.value }))}
                    className="mt-1 bg-background h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">Unidad real</Label>
                  <Select value={form.contenido_unidad} onValueChange={v => setForm(f => ({ ...f, contenido_unidad: v }))}>
                    <SelectTrigger className="mt-1 bg-background h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {UNIDADES_CONTENIDO.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {form.contenido_neto && parseFloat(form.contenido_neto) > 0 && (
                <p className="text-xs font-medium text-primary">
                  Precio real: {fmt(form.precio_actual / parseFloat(form.contenido_neto))}/{form.contenido_unidad}
                </p>
              )}
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

      {/* Quick category assignment dialog */}
      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Asignar categoría</DialogTitle>
            <p className="text-sm text-muted-foreground mt-1 truncate">{catProductName}</p>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {!newCatMode ? (
              <>
                {categorias.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No hay categorías creadas. Crea una primero.</p>
                ) : (
                  <div className="flex flex-wrap gap-2 max-h-[250px] overflow-y-auto">
                    {categorias.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCatId(cat.id)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all active:scale-95 border ${
                          selectedCatId === cat.id
                            ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                            : 'bg-muted/50 text-foreground border-transparent hover:bg-muted hover:border-border'
                        }`}
                      >
                        {cat.icon} {cat.nombre}
                      </button>
                    ))}
                  </div>
                )}

                <div className="pt-1 border-t">
                  <button
                    onClick={() => { setNewCatMode(true); setNewCatName(''); setNewCatIcon('📦'); setNewCatTipo('otro'); }}
                    className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                  >
                    <Plus className="h-3.5 w-3.5" /> Nueva categoría
                  </button>
                </div>
              </>
            ) : (
              /* Inline new CATEGORY form */
              <div className="space-y-3 p-3 bg-muted/30 rounded-lg border">
                <p className="text-xs font-semibold">Nueva categoría</p>
                <div>
                  <Label className="text-xs">Nombre</Label>
                  <Input value={newCatName} onChange={e => setNewCatName(e.target.value)} className="mt-1 bg-background h-8 text-xs" placeholder="Ej: Pescado, Limpieza..." autoFocus />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Icono</Label>
                    <Input value={newCatIcon} onChange={e => setNewCatIcon(e.target.value)} className="mt-1 bg-background h-8 text-xs text-center" maxLength={4} />
                  </div>
                  <div>
                    <Label className="text-xs">Tipo</Label>
                    <Select value={newCatTipo} onValueChange={setNewCatTipo}>
                      <SelectTrigger className="mt-1 bg-background h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="comida">🍽️ Comida</SelectItem>
                        <SelectItem value="bebida">🥤 Bebida</SelectItem>
                        <SelectItem value="otro">📦 Otro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setNewCatMode(false)}>Cancelar</Button>
                  <Button size="sm" className="h-7 text-xs active:scale-95" onClick={() => createCatMut.mutate()} disabled={!newCatName.trim() || createCatMut.isPending}>
                    {createCatMut.isPending ? 'Creando...' : 'Crear categoría'}
                  </Button>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => assignCatMut.mutate()}
              disabled={!selectedCatId || assignCatMut.isPending}
              className="active:scale-95"
            >
              {assignCatMut.isPending ? 'Guardando...' : 'Asignar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteDialog open={deleteOpen} onOpenChange={setDeleteOpen} onConfirm={() => delMut.mutate()} isPending={delMut.isPending} title="¿Eliminar producto?" description="Se eliminará el producto y su historial de precios." />
    </div>
  );
}
