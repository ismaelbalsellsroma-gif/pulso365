import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DeleteDialog } from '@/components/DeleteDialog';
import { Plus, Pencil, Trash2, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const TIPOS = [
  { value: 'vacaciones', label: 'Vacaciones', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  { value: 'baja_medica', label: 'Baja médica', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  { value: 'permiso', label: 'Permiso', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  { value: 'asuntos_propios', label: 'Asuntos propios', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  { value: 'festivo', label: 'Festivo', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
];

const ESTADOS = ['pendiente', 'aprobada', 'rechazada'];

const emptyForm = { empleado_id: '', fecha_inicio: '', fecha_fin: '', tipo: 'vacaciones', estado: 'aprobada', notas: '' };

export default function AusenciasPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const qc = useQueryClient();

  const { data: empleados = [] } = useQuery({
    queryKey: ['personal'],
    queryFn: async () => {
      const { data, error } = await supabase.from('personal').select('*').eq('activo', true).order('nombre');
      if (error) throw error;
      return data;
    },
  });

  const { data: ausencias = [], isLoading } = useQuery({
    queryKey: ['ausencias_all'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ausencias').select('*').order('fecha_inicio', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload = { ...form };
      if (editId) {
        const { error } = await supabase.from('ausencias').update(payload).eq('id', editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('ausencias').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ausencias'] }); setDialogOpen(false); toast.success(editId ? 'Ausencia actualizada' : 'Ausencia registrada'); },
    onError: () => toast.error('Error guardando ausencia'),
  });

  const delMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('ausencias').delete().eq('id', deleteId!);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ausencias'] }); setDeleteOpen(false); toast.success('Ausencia eliminada'); },
  });

  const openNew = () => { setEditId(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (a: any) => {
    setEditId(a.id);
    setForm({ empleado_id: a.empleado_id, fecha_inicio: a.fecha_inicio, fecha_fin: a.fecha_fin, tipo: a.tipo, estado: a.estado || 'aprobada', notas: a.notas || '' });
    setDialogOpen(true);
  };

  const getEmpleadoNombre = (id: string) => empleados.find(e => e.id === id)?.nombre || 'Desconocido';
  const getTipoInfo = (tipo: string) => TIPOS.find(t => t.value === tipo) || TIPOS[0];

  const diffDays = (ini: string, fin: string) => {
    const d1 = new Date(ini); const d2 = new Date(fin);
    return Math.max(1, Math.ceil((d2.getTime() - d1.getTime()) / 86400000) + 1);
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Ausencias" description="Vacaciones, bajas y permisos del equipo">
        <Button className="gap-2 active:scale-95" onClick={openNew}><Plus className="h-4 w-4" /> Nueva Ausencia</Button>
      </PageHeader>

      {isLoading ? (
        <div className="text-sm text-muted-foreground p-8 text-center">Cargando...</div>
      ) : (
        <div className="bg-card border rounded-lg overflow-hidden animate-fade-in-up">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[hsl(var(--surface-offset))]">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Empleado</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tipo</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Desde</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Hasta</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Días</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Estado</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground w-20">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {ausencias.map(a => {
                  const tipoInfo = getTipoInfo(a.tipo);
                  return (
                    <tr key={a.id} className="border-t border-[hsl(var(--divider))] hover:bg-[hsl(var(--surface-offset))] transition-colors">
                      <td className="px-4 py-3 font-medium">{getEmpleadoNombre(a.empleado_id)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${tipoInfo.color}`}>{tipoInfo.label}</span>
                      </td>
                      <td className="px-4 py-3 text-center tabular-nums">{a.fecha_inicio}</td>
                      <td className="px-4 py-3 text-center tabular-nums">{a.fecha_fin}</td>
                      <td className="px-4 py-3 text-center font-semibold">{diffDays(a.fecha_inicio, a.fecha_fin)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${a.estado === 'aprobada' ? 'bg-[hsl(var(--success-highlight))] text-[hsl(var(--success))]' : a.estado === 'rechazada' ? 'bg-[hsl(var(--error-highlight))] text-[hsl(var(--error))]' : 'bg-[hsl(var(--warning-highlight))] text-[hsl(var(--warning))]'}`}>
                          {a.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center gap-1">
                          <button onClick={() => openEdit(a)} className="p-1.5 rounded-md text-muted-foreground hover:bg-[hsl(var(--surface-offset))] hover:text-foreground transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                          <button onClick={() => { setDeleteId(a.id); setDeleteOpen(true); }} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {ausencias.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-8 text-muted-foreground text-sm">No hay ausencias registradas</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editId ? 'Editar Ausencia' : 'Nueva Ausencia'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm font-semibold">Empleado *</Label>
              <Select value={form.empleado_id} onValueChange={v => setForm(f => ({ ...f, empleado_id: v }))}>
                <SelectTrigger className="mt-1.5 bg-background"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>{empleados.map(e => <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-sm font-semibold">Desde *</Label><Input type="date" value={form.fecha_inicio} onChange={e => setForm(f => ({ ...f, fecha_inicio: e.target.value }))} className="mt-1.5 bg-background" /></div>
              <div><Label className="text-sm font-semibold">Hasta *</Label><Input type="date" value={form.fecha_fin} onChange={e => setForm(f => ({ ...f, fecha_fin: e.target.value }))} className="mt-1.5 bg-background" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-semibold">Tipo</Label>
                <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
                  <SelectTrigger className="mt-1.5 bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>{TIPOS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-semibold">Estado</Label>
                <Select value={form.estado} onValueChange={v => setForm(f => ({ ...f, estado: v }))}>
                  <SelectTrigger className="mt-1.5 bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>{ESTADOS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label className="text-sm font-semibold">Notas</Label><Input value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} className="mt-1.5 bg-background" placeholder="Opcional" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => saveMut.mutate()} disabled={!form.empleado_id || !form.fecha_inicio || !form.fecha_fin || saveMut.isPending} className="active:scale-95">
              {saveMut.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteDialog open={deleteOpen} onOpenChange={setDeleteOpen} onConfirm={() => delMut.mutate()} isPending={delMut.isPending} title="¿Eliminar ausencia?" />
    </div>
  );
}
