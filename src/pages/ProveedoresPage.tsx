import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DeleteDialog } from '@/components/DeleteDialog';
import { PeriodSelector } from '@/components/PeriodSelector';
import { fetchProveedores, fetchAlbaranes, fmt } from '@/lib/queries';
import { upsertProveedor, deleteProveedor } from '@/lib/mutations';
import { Plus, Search, Phone, Mail, Pencil, Trash2, FileText, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

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
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [expandedProv, setExpandedProv] = useState<string | null>(null);

  // Period filter
  const now = new Date();
  const [periodo, setPeriodo] = useState(format(now, 'yyyy-MM'));

  const qc = useQueryClient();
  const { data: proveedores = [], isLoading } = useQuery({ queryKey: ['proveedores'], queryFn: fetchProveedores });
  const { data: albaranes = [] } = useQuery({ queryKey: ['albaranes'], queryFn: fetchAlbaranes });

  const filtered = proveedores.filter(p => !search || p.nombre.toLowerCase().includes(search.toLowerCase()));

  // Group albaranes by proveedor_id, filtered by period
  const periodoStart = startOfMonth(parseISO(periodo + '-01'));
  const periodoEnd = endOfMonth(periodoStart);

  const albaranesPorProveedor = useMemo(() => {
    const map: Record<string, { fecha: string; numero: string | null; importe: number }[]> = {};
    for (const a of albaranes) {
      if (!a.proveedor_id) continue;
      const fecha = parseISO(a.fecha);
      if (fecha >= periodoStart && fecha <= periodoEnd) {
        if (!map[a.proveedor_id]) map[a.proveedor_id] = [];
        map[a.proveedor_id].push({ fecha: a.fecha, numero: a.numero, importe: Number(a.importe) || 0 });
      }
    }
    // Sort each group by date desc
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => b.fecha.localeCompare(a.fecha));
    }
    return map;
  }, [albaranes, periodo]);

  const totalPorProveedor = useMemo(() => {
    const map: Record<string, number> = {};
    for (const [provId, lines] of Object.entries(albaranesPorProveedor)) {
      map[provId] = lines.reduce((s, l) => s + l.importe, 0);
    }
    return map;
  }, [albaranesPorProveedor]);

  // Duplicate check
  const checkDuplicate = (nombre: string, cif: string) => {
    if (!nombre.trim() && !cif.trim()) { setDuplicateWarning(null); return; }
    const found = proveedores.find(p => {
      if (editId && p.id === editId) return false;
      if (cif.trim() && p.cif && p.cif.toLowerCase() === cif.trim().toLowerCase()) return true;
      if (nombre.trim() && p.nombre.toLowerCase() === nombre.trim().toLowerCase()) return true;
      return false;
    });
    setDuplicateWarning(found ? `Ya existe un proveedor similar: "${found.nombre}" (CIF: ${found.cif || '—'})` : null);
  };

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

  const openNew = () => { setEditId(null); setForm(emptyForm); setDuplicateWarning(null); setDialogOpen(true); };
  const openEdit = (p: any) => {
    setEditId(p.id);
    setForm({ nombre: p.nombre, cif: p.cif || '', contacto: p.contacto || '', telefono: p.telefono || '', email: p.email || '', tipos: p.tipos || [] });
    setDuplicateWarning(null);
    setDialogOpen(true);
  };
  const openDelete = (id: string) => { setDeleteId(id); setDeleteOpen(true); };

  const toggleTipo = (t: string) => {
    setForm(f => ({ ...f, tipos: f.tipos.includes(t) ? f.tipos.filter(x => x !== t) : [...f.tipos, t] }));
  };

  const updateField = (field: string, value: string) => {
    setForm(f => {
      const next = { ...f, [field]: value };
      if (field === 'nombre' || field === 'cif') checkDuplicate(next.nombre, next.cif);
      return next;
    });
  };

  const periodoLabel = format(periodoStart, 'MMMM yyyy', { locale: es });

  return (
    <div className="space-y-5">
      <PageHeader title="Proveedores" description="Gestión de proveedores y contactos">
        <Button className="gap-2 active:scale-95" onClick={openNew}><Plus className="h-4 w-4" /> Nuevo Proveedor</Button>
      </PageHeader>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center animate-fade-in-up">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar proveedor..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-card" />
        </div>
        <PeriodSelector value={periodo} onChange={setPeriodo} />
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground p-8 text-center">Cargando proveedores...</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-muted-foreground p-8 text-center">No hay proveedores. Crea el primero.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in-up animate-delay-1">
          {filtered.map(p => {
            const provAlbaranes = albaranesPorProveedor[p.id] || [];
            const provTotal = totalPorProveedor[p.id] || 0;
            const isExpanded = expandedProv === p.id;

            return (
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

                {/* Albaranes summary for the period */}
                <div className="mt-3 pt-3 border-t border-[hsl(var(--divider))]">
                  <button
                    onClick={() => setExpandedProv(isExpanded ? null : p.id)}
                    className="w-full flex items-center justify-between text-xs hover:bg-[hsl(var(--surface-offset))] rounded-md px-2 py-1.5 -mx-2 transition-colors"
                  >
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <FileText className="h-3 w-3" />
                      {provAlbaranes.length} albarán{provAlbaranes.length !== 1 ? 'es' : ''} en {periodoLabel}
                    </span>
                    <span className="font-semibold tabular-nums text-foreground">{fmt(provTotal)}</span>
                  </button>

                  {isExpanded && provAlbaranes.length > 0 && (
                    <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                      {provAlbaranes.map((a, i) => (
                        <div key={i} className="flex items-center justify-between text-[11px] px-2 py-1 rounded bg-[hsl(var(--surface-offset))]">
                          <span className="text-muted-foreground">
                            {format(parseISO(a.fecha), 'dd/MM/yyyy')} {a.numero ? `#${a.numero}` : ''}
                          </span>
                          <span className="font-medium tabular-nums">{fmt(a.importe)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {isExpanded && provAlbaranes.length === 0 && (
                    <p className="text-[11px] text-muted-foreground mt-2 px-2">Sin albaranes en este periodo</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog crear/editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? 'Editar Proveedor' : 'Nuevo Proveedor'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {duplicateWarning && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{duplicateWarning}</span>
              </div>
            )}
            <div>
              <Label className="text-sm font-semibold">Nombre *</Label>
              <Input value={form.nombre} onChange={e => updateField('nombre', e.target.value)} className="mt-1.5 bg-background" maxLength={100} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-semibold">CIF</Label>
                <Input value={form.cif} onChange={e => updateField('cif', e.target.value)} className="mt-1.5 bg-background" maxLength={20} />
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
            <Button
              onClick={() => saveMut.mutate()}
              disabled={!form.nombre.trim() || saveMut.isPending}
              className="active:scale-95"
            >
              {saveMut.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteDialog open={deleteOpen} onOpenChange={setDeleteOpen} onConfirm={() => delMut.mutate()} isPending={delMut.isPending} title="¿Eliminar proveedor?" description="Se eliminará el proveedor y no se podrá recuperar." />
    </div>
  );
}
