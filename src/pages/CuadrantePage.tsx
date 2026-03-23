import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DeleteDialog } from '@/components/DeleteDialog';
import { ChevronLeft, ChevronRight, Copy, Plus, Trash2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { fmt } from '@/lib/queries';
import { format, startOfWeek, addDays, addWeeks, subWeeks, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function getWeekDates(ref: Date) {
  const monday = startOfWeek(ref, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

function timeToMinutes(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

function turnoHours(inicio: string, fin: string, pausa: number) {
  let mins = timeToMinutes(fin) - timeToMinutes(inicio);
  if (mins <= 0) mins += 24 * 60;
  return Math.max(0, (mins - pausa) / 60);
}

const emptyTurno = { empleado_id: '', fecha: '', hora_inicio: '09:00', hora_fin: '17:00', pausa_minutos: 0, color: '#01696F', notas: '' };

export default function CuadrantePage() {
  const [weekRef, setWeekRef] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyTurno);

  const weekDates = useMemo(() => getWeekDates(weekRef), [weekRef]);
  const desde = format(weekDates[0], 'yyyy-MM-dd');
  const hasta = format(weekDates[6], 'yyyy-MM-dd');

  const qc = useQueryClient();

  const { data: empleados = [] } = useQuery({
    queryKey: ['personal'],
    queryFn: async () => {
      const { data, error } = await supabase.from('personal').select('*').eq('activo', true).order('nombre');
      if (error) throw error;
      return data;
    },
  });

  const { data: turnos = [] } = useQuery({
    queryKey: ['turnos', desde, hasta],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('turnos_planificados')
        .select('*')
        .gte('fecha', desde)
        .lte('fecha', hasta)
        .order('hora_inicio');
      if (error) throw error;
      return data;
    },
  });

  const { data: plantillas = [] } = useQuery({
    queryKey: ['plantillas_turno'],
    queryFn: async () => {
      const { data, error } = await supabase.from('plantillas_turno').select('*').order('nombre');
      if (error) throw error;
      return data;
    },
  });

  const { data: ausencias = [] } = useQuery({
    queryKey: ['ausencias', desde, hasta],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ausencias')
        .select('*')
        .lte('fecha_inicio', hasta)
        .gte('fecha_fin', desde);
      if (error) throw error;
      return data;
    },
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload = {
        empleado_id: form.empleado_id,
        fecha: form.fecha,
        hora_inicio: form.hora_inicio,
        hora_fin: form.hora_fin,
        pausa_minutos: form.pausa_minutos,
        color: form.color,
        notas: form.notas,
      };
      if (editId) {
        const { error } = await supabase.from('turnos_planificados').update(payload).eq('id', editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('turnos_planificados').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['turnos'] });
      setDialogOpen(false);
      toast.success(editId ? 'Turno actualizado' : 'Turno asignado');
    },
    onError: () => toast.error('Error guardando turno'),
  });

  const delMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('turnos_planificados').delete().eq('id', deleteId!);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['turnos'] }); setDeleteOpen(false); toast.success('Turno eliminado'); },
  });

  const copyWeekMut = useMutation({
    mutationFn: async () => {
      const prevWeek = getWeekDates(subWeeks(weekRef, 1));
      const prevDesde = format(prevWeek[0], 'yyyy-MM-dd');
      const prevHasta = format(prevWeek[6], 'yyyy-MM-dd');
      const { data: prev, error } = await supabase
        .from('turnos_planificados')
        .select('*')
        .gte('fecha', prevDesde)
        .lte('fecha', prevHasta);
      if (error) throw error;
      if (!prev?.length) { toast.info('No hay turnos la semana anterior'); return; }
      const newTurnos = prev.map(t => {
        const oldDate = parseISO(t.fecha);
        const dayOfWeek = (oldDate.getDay() + 6) % 7;
        const newDate = format(weekDates[dayOfWeek], 'yyyy-MM-dd');
        return { empleado_id: t.empleado_id, fecha: newDate, hora_inicio: t.hora_inicio, hora_fin: t.hora_fin, pausa_minutos: t.pausa_minutos, color: t.color, notas: t.notas };
      });
      const { error: insErr } = await supabase.from('turnos_planificados').upsert(newTurnos, { onConflict: 'empleado_id,fecha,hora_inicio' });
      if (insErr) throw insErr;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['turnos'] }); toast.success('Semana copiada'); },
    onError: () => toast.error('Error copiando semana'),
  });

  const openNew = (empId: string, fecha: string) => {
    setEditId(null);
    setForm({ ...emptyTurno, empleado_id: empId, fecha });
    setDialogOpen(true);
  };

  const openEdit = (t: any) => {
    setEditId(t.id);
    setForm({ empleado_id: t.empleado_id, fecha: t.fecha, hora_inicio: t.hora_inicio, hora_fin: t.hora_fin, pausa_minutos: t.pausa_minutos || 0, color: t.color || '#01696F', notas: t.notas || '' });
    setDialogOpen(true);
  };

  const applyPlantilla = (p: any) => {
    setForm(f => ({ ...f, hora_inicio: p.hora_inicio, hora_fin: p.hora_fin, pausa_minutos: p.pausa_minutos || 0, color: p.color }));
  };

  // KPIs
  const totalHoras = turnos.reduce((s, t) => s + turnoHours(t.hora_inicio, t.hora_fin, t.pausa_minutos || 0), 0);
  const costeEstimado = turnos.reduce((s, t) => {
    const emp = empleados.find(e => e.id === t.empleado_id);
    const costeH = Number(emp?.coste_hora) || 0;
    return s + turnoHours(t.hora_inicio, t.hora_fin, t.pausa_minutos || 0) * costeH;
  }, 0);

  const isAusente = (empId: string, fecha: string) => {
    return ausencias.some(a =>
      a.empleado_id === empId && a.fecha_inicio <= fecha && a.fecha_fin >= fecha && a.estado === 'aprobada'
    );
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Cuadrante Semanal" description="Planificación de turnos del equipo">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => copyWeekMut.mutate()} disabled={copyWeekMut.isPending} className="gap-1.5">
            <Copy className="h-3.5 w-3.5" /> Copiar semana anterior
          </Button>
        </div>
      </PageHeader>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in-up">
        <div className="panel-card"><div className="panel-card-header"><span>Horas planificadas</span></div><div className="panel-card-value text-2xl tabular-nums">{totalHoras.toFixed(1)}h</div></div>
        <div className="panel-card"><div className="panel-card-header"><span>Coste estimado</span></div><div className="panel-card-value text-2xl tabular-nums">{fmt(costeEstimado)}</div></div>
        <div className="panel-card"><div className="panel-card-header"><span>Empleados activos</span></div><div className="panel-card-value text-2xl">{empleados.length}</div></div>
      </div>

      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => setWeekRef(d => subWeeks(d, 1))}><ChevronLeft className="h-4 w-4" /></Button>
        <span className="text-sm font-semibold">
          {format(weekDates[0], "d MMM", { locale: es })} — {format(weekDates[6], "d MMM yyyy", { locale: es })}
        </span>
        <Button variant="ghost" size="sm" onClick={() => setWeekRef(d => addWeeks(d, 1))}><ChevronRight className="h-4 w-4" /></Button>
      </div>

      {/* Cuadrante grid */}
      <div className="bg-card border rounded-lg overflow-hidden animate-fade-in-up animate-delay-1">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[hsl(var(--surface-offset))]">
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground w-40 sticky left-0 bg-[hsl(var(--surface-offset))] z-10">Empleado</th>
                {weekDates.map((d, i) => (
                  <th key={i} className="px-2 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground min-w-[110px]">
                    <div>{DAYS[i]}</div>
                    <div className="text-[10px] font-normal">{format(d, 'd MMM', { locale: es })}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {empleados.map(emp => (
                <tr key={emp.id} className="border-t border-[hsl(var(--divider))]">
                  <td className="px-3 py-2 font-medium sticky left-0 bg-card z-10">
                    <div className="text-xs">{emp.nombre}</div>
                    <div className="text-[10px] text-muted-foreground">{(emp as any).puesto || ''}</div>
                  </td>
                  {weekDates.map((d, i) => {
                    const dateStr = format(d, 'yyyy-MM-dd');
                    const dayTurnos = turnos.filter(t => t.empleado_id === emp.id && t.fecha === dateStr);
                    const ausente = isAusente(emp.id, dateStr);
                    return (
                      <td key={i} className="px-1 py-1 text-center align-top">
                        {ausente ? (
                          <div className="rounded-md px-1.5 py-1 text-[10px] font-semibold bg-destructive/10 text-destructive">Ausente</div>
                        ) : dayTurnos.length > 0 ? (
                          dayTurnos.map(t => (
                            <button
                              key={t.id}
                              onClick={() => openEdit(t)}
                              className="w-full rounded-md px-1.5 py-1 mb-0.5 text-[10px] font-semibold text-white cursor-pointer hover:opacity-80 transition-opacity"
                              style={{ backgroundColor: t.color || '#01696F' }}
                            >
                              {t.hora_inicio}-{t.hora_fin}
                            </button>
                          ))
                        ) : (
                          <button
                            onClick={() => openNew(emp.id, dateStr)}
                            className="w-full h-8 rounded-md border border-dashed border-[hsl(var(--divider))] hover:bg-[hsl(var(--surface-offset))] transition-colors text-muted-foreground text-[10px] flex items-center justify-center"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {empleados.length === 0 && (
                <tr><td colSpan={8} className="text-center py-8 text-muted-foreground text-sm">No hay empleados activos. Añádelos en la sección de Personal.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dialog crear/editar turno */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? 'Editar Turno' : 'Asignar Turno'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Plantillas rápidas */}
            {plantillas.length > 0 && (
              <div>
                <Label className="text-sm font-semibold">Plantilla rápida</Label>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {plantillas.map(p => (
                    <button key={p.id} onClick={() => applyPlantilla(p)} className="rounded-md px-2.5 py-1.5 text-xs font-medium text-white hover:opacity-80 transition-opacity" style={{ backgroundColor: p.color || '#01696F' }}>
                      {p.nombre}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-semibold">Hora inicio</Label>
                <Input type="time" value={form.hora_inicio} onChange={e => setForm(f => ({ ...f, hora_inicio: e.target.value }))} className="mt-1.5 bg-background" />
              </div>
              <div>
                <Label className="text-sm font-semibold">Hora fin</Label>
                <Input type="time" value={form.hora_fin} onChange={e => setForm(f => ({ ...f, hora_fin: e.target.value }))} className="mt-1.5 bg-background" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-semibold">Pausa (min)</Label>
                <Input type="number" min={0} value={form.pausa_minutos || ''} onChange={e => setForm(f => ({ ...f, pausa_minutos: parseInt(e.target.value) || 0 }))} className="mt-1.5 bg-background" placeholder="" />
              </div>
              <div>
                <Label className="text-sm font-semibold">Color</Label>
                <Input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="mt-1.5 h-9 p-1 bg-background" />
              </div>
            </div>
            <div>
              <Label className="text-sm font-semibold">Notas</Label>
              <Input value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} className="mt-1.5 bg-background" placeholder="Opcional" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            {editId && (
              <Button variant="destructive" size="sm" onClick={() => { setDeleteId(editId); setDeleteOpen(true); setDialogOpen(false); }}>
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Eliminar
              </Button>
            )}
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending} className="active:scale-95">
              {saveMut.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteDialog open={deleteOpen} onOpenChange={setDeleteOpen} onConfirm={() => delMut.mutate()} isPending={delMut.isPending} title="¿Eliminar turno?" />
    </div>
  );
}
