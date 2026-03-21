import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DeleteDialog } from '@/components/DeleteDialog';
import { fetchProveedores } from '@/lib/queries';
import { upsertProveedor, deleteProveedor } from '@/lib/mutations';
import { Plus, Search, Phone, Mail, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const TIPOS = [
  { value: 'alimentacion', label: 'Alimentación' },
  { value: 'bebida', label: 'Bebida' },
  { value: 'limpieza', label: 'Limpieza' },
  { value: 'menaje', label: 'Menaje' },
  { value: 'otros', label: 'Otros' },
];

const tipoLabels: Record<string, string> = Object.fromEntries(TIPOS.map(t => [t.value, t.label]));

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

const emptyForm = { nombre: '', cif: '', contacto: '', telefono: '', email: '', tipos: [] as string[] };

export default function ProveedoresPage() {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const qc = useQueryClient();
  const { data: proveedores = [], isLoading } = useQuery({ queryKey: ['proveedores'], queryFn: fetchProveedores });
  const filtered = proveedores.filter(p => !search || p.nombre.toLowerCase().includes(search.toLowerCase()));

  const saveMut = useMutation({
    mutationFn: () => upsertProveedor({ id: editId || undefined, ...form }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['proveedores'] }); setDialogOpen(false); toast.success(editId ? 'Proveedor actualizado' : 'Proveedor creado'); },
    onError: () => toast.error('Error guardando proveedor'),
  });

  const delMut = useMutation({
    mutationFn: () => deleteProveedor(deleteId!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['proveedores'] }); setDeleteOpen(false); toast.success('Proveedor eliminado'); },
    onError: () => toast.error('Error eliminando proveedor'),
  });

  const openNew = () => { setEditId(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (p: any) => {
    setEditId(p.id);
    setForm({ nombre: p.nombre, cif: p.cif || '', contacto: p.contacto || '', telefono: p.telefono || '', email: p.email || '', tipos: p.tipos || [] });
    setDialogOpen(true);
  };
  const openDelete = (id: string) => { setDeleteId(id); setDeleteOpen(true); };

  const toggleTipo = (t: string) => {
    setForm(f => ({ ...f, tipos: f.tipos.includes(t) ? f.tipos.filter(x => x !== t) : [...f.tipos, t] }));
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Proveedores" description="Gestión de proveedores y contactos">
        <Button className="gap-2 active:scale-95" onClick={openNew}><Plus className="h-4 w-4" /> Nuevo Proveedor</Button>
      </PageHeader>

      <div className="relative max-w-md animate-fade-in-up">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar proveedor..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-card" />
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground p-8 text-center">Cargando proveedores...</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-muted-foreground p-8 text-center">No hay proveedores. Crea el primero.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in-up animate-delay-1">
          {filtered.map(p => (
            <div key={p.id} className="panel-card group">
              <div className="flex items-start gap-3 mb-3">
                <div className="prov-avatar">{getInitials(p.nombre)}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm truncate">{p.nombre}</h3>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {(p.tipos || []).map((t: string) => (
                      <span key={t} className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[hsl(var(--surface-offset))] text-muted-foreground">
                        {tipoLabels[t] || t}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(p)} className="p-1.5 rounded-md text-muted-foreground hover:bg-[hsl(var(--surface-offset))] hover:text-foreground transition-colors">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => openDelete(p.id)} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                {p.contacto && <p>{p.contacto}</p>}
                {p.telefono && <p className="flex items-center gap-1"><Phone className="h-3 w-3" /> {p.telefono}</p>}
                {p.email && <p className="flex items-center gap-1"><Mail className="h-3 w-3" /> {p.email}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-[hsl(var(--divider))]">
                <div>
                  <p className="text-[10px] text-muted-foreground">CIF</p>
                  <p className="text-xs font-medium tabular-nums">{p.cif || '—'}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground">Email</p>
                  <p className="text-xs font-medium truncate">{p.email || '—'}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog crear/editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? 'Editar Proveedor' : 'Nuevo Proveedor'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm font-semibold">Nombre *</Label>
              <Input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} className="mt-1.5 bg-background" maxLength={100} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-semibold">CIF</Label>
                <Input value={form.cif} onChange={e => setForm(f => ({ ...f, cif: e.target.value }))} className="mt-1.5 bg-background" maxLength={20} />
              </div>
              <div>
                <Label className="text-sm font-semibold">Contacto</Label>
                <Input value={form.contacto} onChange={e => setForm(f => ({ ...f, contacto: e.target.value }))} className="mt-1.5 bg-background" maxLength={100} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-semibold">Teléfono</Label>
                <Input value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} className="mt-1.5 bg-background" maxLength={20} />
              </div>
              <div>
                <Label className="text-sm font-semibold">Email</Label>
                <Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="mt-1.5 bg-background" type="email" maxLength={100} />
              </div>
            </div>
            <div>
              <Label className="text-sm font-semibold mb-2 block">Tipo de proveedor</Label>
              <div className="flex flex-wrap gap-3">
                {TIPOS.map(t => (
                  <label key={t.value} className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <Checkbox checked={form.tipos.includes(t.value)} onCheckedChange={() => toggleTipo(t.value)} />
                    {t.label}
                  </label>
                ))}
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

      <DeleteDialog open={deleteOpen} onOpenChange={setDeleteOpen} onConfirm={() => delMut.mutate()} isPending={delMut.isPending} title="¿Eliminar proveedor?" description="Se eliminará el proveedor y no se podrá recuperar." />
    </div>
  );
}
