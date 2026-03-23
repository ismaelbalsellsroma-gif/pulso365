import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { LogIn, LogOut, Clock, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { fmt } from '@/lib/queries';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

function now() {
  return format(new Date(), 'HH:mm');
}

function calcHours(entrada: string | null, salida: string | null) {
  if (!entrada) return 0;
  const end = salida || now();
  const [eh, em] = entrada.split(':').map(Number);
  const [sh, sm] = end.split(':').map(Number);
  let mins = (sh * 60 + sm) - (eh * 60 + em);
  if (mins < 0) mins += 24 * 60;
  return mins / 60;
}

export default function FichajePage() {
  const [editDialog, setEditDialog] = useState(false);
  const [editFichaje, setEditFichaje] = useState<any>(null);
  const [editForm, setEditForm] = useState({ hora_entrada: '', hora_salida: '', notas: '' });

  const hoy = format(new Date(), 'yyyy-MM-dd');
  const qc = useQueryClient();

  const { data: empleados = [] } = useQuery({
    queryKey: ['personal'],
    queryFn: async () => {
      const { data, error } = await supabase.from('personal').select('*').eq('activo', true).order('nombre');
      if (error) throw error;
      return data;
    },
  });

  const { data: fichajes = [] } = useQuery({
    queryKey: ['fichajes', hoy],
    queryFn: async () => {
      const { data, error } = await supabase.from('fichajes').select('*').eq('fecha', hoy);
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });

  const { data: turnosHoy = [] } = useQuery({
    queryKey: ['turnos', hoy, hoy],
    queryFn: async () => {
      const { data, error } = await supabase.from('turnos_planificados').select('*').eq('fecha', hoy);
      if (error) throw error;
      return data;
    },
  });

  const { data: ausenciasHoy = [] } = useQuery({
    queryKey: ['ausencias_hoy', hoy],
    queryFn: async () => {
      const { data, error } = await supabase.from('ausencias').select('*').lte('fecha_inicio', hoy).gte('fecha_fin', hoy).eq('estado', 'aprobada');
      if (error) throw error;
      return data;
    },
  });

  const ficharEntrada = useMutation({
    mutationFn: async (empId: string) => {
      const { error } = await supabase.from('fichajes').insert({ empleado_id: empId, fecha: hoy, hora_entrada: now(), origen: 'manual' });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fichajes'] }); toast.success('Entrada fichada'); },
    onError: () => toast.error('Error fichando entrada'),
  });

  const ficharSalida = useMutation({
    mutationFn: async (fichajeId: string) => {
      const hora = now();
      const fichaje = fichajes.find(f => f.id === fichajeId);
      const horas = fichaje ? calcHours(fichaje.hora_entrada, hora) : 0;
      const { error } = await supabase.from('fichajes').update({ hora_salida: hora, horas_trabajadas: Math.round(horas * 100) / 100 }).eq('id', fichajeId);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fichajes'] }); toast.success('Salida fichada'); },
    onError: () => toast.error('Error fichando salida'),
  });

  const editMut = useMutation({
    mutationFn: async () => {
      const horas = calcHours(editForm.hora_entrada, editForm.hora_salida || null);
      const { error } = await supabase.from('fichajes').update({
        hora_entrada: editForm.hora_entrada,
        hora_salida: editForm.hora_salida || null,
        horas_trabajadas: editForm.hora_salida ? Math.round(horas * 100) / 100 : 0,
        notas: editForm.notas,
      }).eq('id', editFichaje.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fichajes'] }); setEditDialog(false); toast.success('Fichaje actualizado'); },
  });

  // KPIs
  const costeHoy = useMemo(() => {
    return fichajes.reduce((s, f) => {
      const emp = empleados.find(e => e.id === f.empleado_id);
      const ch = Number((emp as any)?.coste_hora) || 0;
      const h = f.hora_salida ? Number(f.horas_trabajadas) || 0 : calcHours(f.hora_entrada, null);
      return s + h * ch;
    }, 0);
  }, [fichajes, empleados]);

  const horasHoy = fichajes.reduce((s, f) => {
    return s + (f.hora_salida ? Number(f.horas_trabajadas) || 0 : calcHours(f.hora_entrada, null));
  }, 0);

  type Estado = 'trabajando' | 'salido' | 'no_fichado' | 'ausente' | 'libre';

  const getEstado = (empId: string): { estado: Estado; fichaje: any } => {
    const ausente = ausenciasHoy.some(a => a.empleado_id === empId);
    if (ausente) return { estado: 'ausente', fichaje: null };
    const turno = turnosHoy.find(t => t.empleado_id === empId);
    const fichaje = fichajes.find(f => f.empleado_id === empId);
    if (!turno && !fichaje) return { estado: 'libre', fichaje: null };
    if (fichaje?.hora_salida) return { estado: 'salido', fichaje };
    if (fichaje?.hora_entrada) return { estado: 'trabajando', fichaje };
    return { estado: 'no_fichado', fichaje: null };
  };

  const estadoBadge: Record<Estado, { label: string; cls: string }> = {
    trabajando: { label: '🟢 Trabajando', cls: 'bg-[hsl(var(--success-highlight))] text-[hsl(var(--success))]' },
    salido: { label: '⚪ Ha salido', cls: 'bg-[hsl(var(--surface-offset))] text-muted-foreground' },
    no_fichado: { label: '🔴 No ha fichado', cls: 'bg-[hsl(var(--error-highlight))] text-[hsl(var(--error))]' },
    ausente: { label: '🟡 Ausente', cls: 'bg-[hsl(var(--warning-highlight))] text-[hsl(var(--warning))]' },
    libre: { label: '⚪ Libre', cls: 'bg-[hsl(var(--surface-offset))] text-muted-foreground' },
  };

  const puntualidad = (entrada: string | null, planificado: string | null) => {
    if (!entrada || !planificado) return '';
    const diff = (entrada.split(':').map(Number)[0] * 60 + entrada.split(':').map(Number)[1]) - (planificado.split(':').map(Number)[0] * 60 + planificado.split(':').map(Number)[1]);
    if (Math.abs(diff) <= 5) return 'text-[hsl(var(--success))]';
    if (Math.abs(diff) <= 15) return 'text-[hsl(var(--warning))]';
    return 'text-[hsl(var(--error))]';
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Fichaje" description={format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in-up">
        <div className="panel-card"><div className="panel-card-header"><span>Coste personal hoy</span></div><div className="panel-card-value text-2xl tabular-nums">{fmt(costeHoy)}</div></div>
        <div className="panel-card"><div className="panel-card-header"><span>Horas trabajadas hoy</span></div><div className="panel-card-value text-2xl tabular-nums">{horasHoy.toFixed(1)}h</div></div>
        <div className="panel-card"><div className="panel-card-header"><span>Empleados fichados</span></div><div className="panel-card-value text-2xl">{fichajes.filter(f => f.hora_entrada).length} / {empleados.length}</div></div>
      </div>

      <div className="bg-card border rounded-lg overflow-hidden animate-fade-in-up animate-delay-1">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[hsl(var(--surface-offset))]">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Empleado</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Turno planificado</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Entrada real</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Salida real</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Horas</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Estado</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground w-36">Acción</th>
              </tr>
            </thead>
            <tbody>
              {empleados.map(emp => {
                const { estado, fichaje } = getEstado(emp.id);
                const turno = turnosHoy.find(t => t.empleado_id === emp.id);
                const badge = estadoBadge[estado];
                const horas = fichaje ? (fichaje.hora_salida ? Number(fichaje.horas_trabajadas) || 0 : calcHours(fichaje.hora_entrada, null)) : 0;

                return (
                  <tr key={emp.id} className="border-t border-[hsl(var(--divider))] hover:bg-[hsl(var(--surface-offset))] transition-colors">
                    <td className="px-4 py-3 font-medium">
                      <div>{emp.nombre}</div>
                      <div className="text-[10px] text-muted-foreground">{(emp as any).puesto || ''}</div>
                    </td>
                    <td className="px-4 py-3 text-center text-muted-foreground tabular-nums">{turno ? `${turno.hora_inicio} - ${turno.hora_fin}` : '—'}</td>
                    <td className={`px-4 py-3 text-center font-semibold tabular-nums ${puntualidad(fichaje?.hora_entrada, turno?.hora_inicio)}`}>
                      {fichaje?.hora_entrada || '—'}
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums">{fichaje?.hora_salida || '—'}</td>
                    <td className="px-4 py-3 text-center font-semibold tabular-nums">
                      {horas > 0 ? `${horas.toFixed(1)}h` : '—'}
                      {estado === 'trabajando' && <span className="text-[10px] text-muted-foreground ml-1">(en curso)</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${badge.cls}`}>{badge.label}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-1.5">
                        {estado === 'libre' || estado === 'no_fichado' ? (
                          <Button size="sm" onClick={() => ficharEntrada.mutate(emp.id)} disabled={ficharEntrada.isPending} className="gap-1.5 h-10 px-4 text-sm active:scale-95">
                            <LogIn className="h-4 w-4" /> Entrada
                          </Button>
                        ) : estado === 'trabajando' && fichaje ? (
                          <Button size="sm" variant="outline" onClick={() => ficharSalida.mutate(fichaje.id)} disabled={ficharSalida.isPending} className="gap-1.5 h-10 px-4 text-sm active:scale-95">
                            <LogOut className="h-4 w-4" /> Salida
                          </Button>
                        ) : null}
                        {fichaje && (
                          <button onClick={() => {
                            setEditFichaje(fichaje);
                            setEditForm({ hora_entrada: fichaje.hora_entrada || '', hora_salida: fichaje.hora_salida || '', notas: fichaje.notas || '' });
                            setEditDialog(true);
                          }} className="p-2 rounded-md text-muted-foreground hover:bg-[hsl(var(--surface-offset))] hover:text-foreground transition-colors">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Editar Fichaje</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-sm font-semibold">Entrada</Label><Input type="time" value={editForm.hora_entrada} onChange={e => setEditForm(f => ({ ...f, hora_entrada: e.target.value }))} className="mt-1.5 bg-background" /></div>
              <div><Label className="text-sm font-semibold">Salida</Label><Input type="time" value={editForm.hora_salida} onChange={e => setEditForm(f => ({ ...f, hora_salida: e.target.value }))} className="mt-1.5 bg-background" /></div>
            </div>
            <div><Label className="text-sm font-semibold">Notas</Label><Input value={editForm.notas} onChange={e => setEditForm(f => ({ ...f, notas: e.target.value }))} className="mt-1.5 bg-background" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(false)}>Cancelar</Button>
            <Button onClick={() => editMut.mutate()} disabled={editMut.isPending}>{editMut.isPending ? 'Guardando...' : 'Guardar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
