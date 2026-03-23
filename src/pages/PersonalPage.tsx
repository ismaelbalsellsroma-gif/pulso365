import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DeleteDialog } from '@/components/DeleteDialog';
import { fetchPersonal, fmt } from '@/lib/queries';
import { upsertPersonal, deletePersonal } from '@/lib/mutations';
import { Plus, UserCircle, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const PUESTOS = ['cocinero', 'camarero', 'encargado', 'limpieza', 'ayudante', 'otro'];
const CONTRATOS = [
  { value: 'indefinido', label: 'Indefinido' },
  { value: 'temporal', label: 'Temporal' },
  { value: 'practicas', label: 'Prácticas' },
  { value: 'fijo_discontinuo', label: 'Fijo discontinuo' },
];

const emptyForm = {
  nombre: '', apellidos: '', dni: '', email: '', telefono: '',
  puesto: '', tipo_contrato: 'indefinido', horas_contrato: 40,
  salario_bruto_mensual: 0, coste_empresa_mensual: 0, coste_hora: 0,
  fecha_alta: '', fecha_baja: '', activo: true, notas: '',
};

function calcCosteHora(costeEmpresa: number, horasContrato: number) {
  if (!horasContrato) return 0;
  return Math.round((costeEmpresa / (horasContrato * 4.33)) * 100) / 100;
}

export default function PersonalPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const qc = useQueryClient();
  const { data: personal = [], isLoading } = useQuery({ queryKey: ['personal'], queryFn: fetchPersonal });
  const activos = personal.filter(e => e.activo);
  const totalCoste = activos.reduce((s, e) => s + Number((e as any).coste_empresa_mensual || e.coste_mensual || 0), 0);

  const saveMut = useMutation({
    mutationFn: () => {
      const costeHora = calcCosteHora(form.coste_empresa_mensual, form.horas_contrato);
      return upsertPersonal({
        id: editId || undefined,
        nombre: form.nombre,
        dni: form.dni,
        coste_mensual: form.coste_empresa_mensual,
        activo: form.activo,
        apellidos: form.apellidos,
        email: form.email,
        telefono: form.telefono,
        puesto: form.puesto,
        tipo_contrato: form.tipo_contrato,
        horas_contrato: form.horas_contrato,
        salario_bruto_mensual: form.salario_bruto_mensual,
        coste_empresa_mensual: form.coste_empresa_mensual,
        coste_hora: costeHora,
        fecha_alta: form.fecha_alta || undefined,
        fecha_baja: form.fecha_baja || undefined,
        notas: form.notas,
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['personal'] }); setDialogOpen(false); toast.success(editId ? 'Empleado actualizado' : 'Empleado añadido'); },
    onError: () => toast.error('Error guardando empleado'),
  });

  const delMut = useMutation({
    mutationFn: () => deletePersonal(deleteId!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['personal'] }); setDeleteOpen(false); toast.success('Empleado eliminado'); },
    onError: () => toast.error('Error eliminando empleado'),
  });

  const openNew = () => { setEditId(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (e: any) => {
    setEditId(e.id);
    setForm({
      nombre: e.nombre, apellidos: e.apellidos || '', dni: e.dni || '',
      email: e.email || '', telefono: e.telefono || '',
      puesto: e.puesto || '', tipo_contrato: e.tipo_contrato || 'indefinido',
      horas_contrato: Number(e.horas_contrato || 40),
      salario_bruto_mensual: Number(e.salario_bruto_mensual || 0),
      coste_empresa_mensual: Number(e.coste_empresa_mensual || e.coste_mensual || 0),
      coste_hora: Number(e.coste_hora || 0),
      fecha_alta: e.fecha_alta || '', fecha_baja: e.fecha_baja || '',
      activo: e.activo ?? true, notas: e.notas || '',
    });
    setDialogOpen(true);
  };

  const updateCosteEmpresa = (bruto: number) => {
    const costeEmpresa = Math.round(bruto * 1.33 * 100) / 100;
    const costeHora = calcCosteHora(costeEmpresa, form.horas_contrato);
    setForm(f => ({ ...f, salario_bruto_mensual: bruto, coste_empresa_mensual: costeEmpresa, coste_hora: costeHora }));
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Personal" description="Gestión de empleados y costes de personal">
        <Button className="gap-2 active:scale-95" onClick={openNew}><Plus className="h-4 w-4" /> Añadir Empleado</Button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 animate-fade-in-up">
        <div className="panel-card"><div className="panel-card-header"><span>Empleados activos</span></div><div className="panel-card-value text-2xl">{activos.length}</div></div>
        <div className="panel-card"><div className="panel-card-header"><span>Coste empresa mensual</span></div><div className="panel-card-value text-2xl tabular-nums">{fmt(totalCoste)}</div></div>
        <div className="panel-card"><div className="panel-card-header"><span>Coste medio/hora</span></div><div className="panel-card-value text-2xl tabular-nums">{activos.length ? fmt(activos.reduce((s, e) => s + Number((e as any).coste_hora || 0), 0) / activos.length) : '—'}</div></div>
        <div className="panel-card"><div className="panel-card-header"><span>Total plantilla</span></div><div className="panel-card-value text-2xl">{personal.length}</div></div>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground p-8 text-center">Cargando personal...</div>
      ) : (
        <div className="bg-card border rounded-lg overflow-hidden animate-fade-in-up animate-delay-1">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[hsl(var(--surface-offset))]">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Empleado</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Puesto</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">DNI</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Horas/sem</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Coste empresa</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">€/hora</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Estado</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground w-20">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {personal.map(e => (
                  <tr key={e.id} className="border-t border-[hsl(var(--divider))] hover:bg-[hsl(var(--surface-offset))] transition-colors">
                    <td className="px-4 py-3 font-medium flex items-center gap-2">
                      <UserCircle className="h-4 w-4 text-muted-foreground" /> {e.nombre}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground capitalize">{(e as any).puesto || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground tabular-nums">{e.dni || '—'}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{(e as any).horas_contrato || 40}h</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">{fmt(Number((e as any).coste_empresa_mensual || e.coste_mensual))}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{fmt(Number((e as any).coste_hora || 0))}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${e.activo ? 'bg-[hsl(var(--success-highlight))] text-[hsl(var(--success))]' : 'bg-[hsl(var(--surface-offset))] text-muted-foreground'}`}>
                        {e.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-1">
                        <button onClick={() => openEdit(e)} className="p-1.5 rounded-md text-muted-foreground hover:bg-[hsl(var(--surface-offset))] hover:text-foreground transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                        <button onClick={() => { setDeleteId(e.id); setDeleteOpen(true); }} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? 'Editar Empleado' : 'Nuevo Empleado'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-sm font-semibold">Nombre *</Label><Input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} className="mt-1.5 bg-background" /></div>
              <div><Label className="text-sm font-semibold">Apellidos</Label><Input value={form.apellidos} onChange={e => setForm(f => ({ ...f, apellidos: e.target.value }))} className="mt-1.5 bg-background" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-sm font-semibold">DNI</Label><Input value={form.dni} onChange={e => setForm(f => ({ ...f, dni: e.target.value }))} className="mt-1.5 bg-background" /></div>
              <div><Label className="text-sm font-semibold">Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="mt-1.5 bg-background" /></div>
              <div><Label className="text-sm font-semibold">Teléfono</Label><Input value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} className="mt-1.5 bg-background" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-semibold">Puesto</Label>
                <Select value={form.puesto} onValueChange={v => setForm(f => ({ ...f, puesto: v }))}>
                  <SelectTrigger className="mt-1.5 bg-background"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>{PUESTOS.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-semibold">Contrato</Label>
                <Select value={form.tipo_contrato} onValueChange={v => setForm(f => ({ ...f, tipo_contrato: v }))}>
                  <SelectTrigger className="mt-1.5 bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>{CONTRATOS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-sm font-semibold">Horas/semana</Label>
                <Input type="number" min={0} step={1} value={form.horas_contrato || ''} onChange={e => {
                  const v = parseFloat(e.target.value) || 0;
                  setForm(f => ({ ...f, horas_contrato: v, coste_hora: calcCosteHora(f.coste_empresa_mensual, v) }));
                }} className="mt-1.5 bg-background" placeholder="" />
              </div>
              <div>
                <Label className="text-sm font-semibold">Salario bruto €</Label>
                <Input type="number" min={0} step={0.01} value={form.salario_bruto_mensual || ''} onChange={e => updateCosteEmpresa(parseFloat(e.target.value) || 0)} className="mt-1.5 bg-background" placeholder="" />
              </div>
              <div>
                <Label className="text-sm font-semibold">Coste empresa €</Label>
                <Input type="number" min={0} step={0.01} value={form.coste_empresa_mensual || ''} onChange={e => {
                  const v = parseFloat(e.target.value) || 0;
                  setForm(f => ({ ...f, coste_empresa_mensual: v, coste_hora: calcCosteHora(v, f.horas_contrato) }));
                }} className="mt-1.5 bg-background" placeholder="" />
              </div>
            </div>
            <div className="text-xs text-muted-foreground bg-[hsl(var(--surface-offset))] rounded-md px-3 py-2">
              Coste/hora calculado: <strong>{fmt(form.coste_hora)}</strong> = Coste empresa / (horas × 4,33)
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-sm font-semibold">Fecha alta</Label><Input type="date" value={form.fecha_alta} onChange={e => setForm(f => ({ ...f, fecha_alta: e.target.value }))} className="mt-1.5 bg-background" /></div>
              <div><Label className="text-sm font-semibold">Fecha baja</Label><Input type="date" value={form.fecha_baja} onChange={e => setForm(f => ({ ...f, fecha_baja: e.target.value }))} className="mt-1.5 bg-background" /></div>
            </div>
            <div><Label className="text-sm font-semibold">Notas</Label><Input value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} className="mt-1.5 bg-background" placeholder="Opcional" /></div>
            <div className="flex items-center gap-3">
              <Switch checked={form.activo} onCheckedChange={v => setForm(f => ({ ...f, activo: v }))} />
              <Label className="text-sm">{form.activo ? 'Activo' : 'Inactivo'}</Label>
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

      <DeleteDialog open={deleteOpen} onOpenChange={setDeleteOpen} onConfirm={() => delMut.mutate()} isPending={delMut.isPending} title="¿Eliminar empleado?" />
    </div>
  );
}
