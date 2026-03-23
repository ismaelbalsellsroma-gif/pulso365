import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DeleteDialog } from '@/components/DeleteDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { fmt } from '@/lib/queries';
import {
  Building2, Upload, CheckCircle, Clock, XCircle, TrendingUp, TrendingDown,
  Plus, Pencil, Trash2, Search, FileSpreadsheet, Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

const TIPOS = [
  { value: 'pago_proveedor', label: '🏢 Proveedor', color: 'text-blue-600' },
  { value: 'cobro_tpv', label: '💳 Cobro TPV', color: 'text-[hsl(var(--success))]' },
  { value: 'nomina', label: '👤 Nómina', color: 'text-purple-600' },
  { value: 'alquiler', label: '🏠 Alquiler', color: 'text-orange-600' },
  { value: 'suministro', label: '⚡ Suministro', color: 'text-yellow-600' },
  { value: 'impuesto', label: '🏛️ Impuesto', color: 'text-red-600' },
  { value: 'otro', label: '📋 Otro', color: 'text-muted-foreground' },
];

function parseCSV(text: string): any[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const sep = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(sep).map(h => h.replace(/"/g, '').trim().toLowerCase());

  // Detect columns
  const fechaIdx = headers.findIndex(h => h.includes('fecha') && !h.includes('valor'));
  const fechaValorIdx = headers.findIndex(h => h.includes('valor') && h.includes('fecha'));
  const conceptoIdx = headers.findIndex(h => h.includes('concepto') || h.includes('descripci'));
  const importeIdx = headers.findIndex(h => h.includes('importe') || h.includes('cantidad') || h.includes('movimiento'));
  const saldoIdx = headers.findIndex(h => h.includes('saldo'));

  if (fechaIdx === -1 || importeIdx === -1) return [];

  return lines.slice(1).filter(l => l.trim()).map(line => {
    const cols = line.split(sep).map(c => c.replace(/"/g, '').trim());
    const fechaRaw = cols[fechaIdx] || '';
    let fecha = fechaRaw;
    // Parse dd/mm/yyyy
    const dmyMatch = fechaRaw.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (dmyMatch) fecha = `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`;

    const importeStr = (cols[importeIdx] || '0').replace(/\./g, '').replace(',', '.');
    const saldoStr = saldoIdx >= 0 ? (cols[saldoIdx] || '').replace(/\./g, '').replace(',', '.') : '';

    return {
      fecha,
      fecha_valor: fechaValorIdx >= 0 ? cols[fechaValorIdx] : null,
      concepto: cols[conceptoIdx] || '',
      importe: parseFloat(importeStr) || 0,
      saldo: saldoStr ? parseFloat(saldoStr) : null,
    };
  }).filter(m => m.fecha && m.importe !== 0);
}

function autoMatchMovimiento(concepto: string, proveedores: any[]): { tipo: string; entidad_nombre: string; confianza: number } {
  const c = concepto.toUpperCase();
  // Patterns
  if (c.includes('NOMINA') || c.includes('SALARIO')) return { tipo: 'nomina', entidad_nombre: '', confianza: 80 };
  if (c.includes('ALQUILER') || c.includes('ARRENDAMIENTO')) return { tipo: 'alquiler', entidad_nombre: '', confianza: 80 };
  if (c.includes('ENDESA') || c.includes('IBERDROLA') || c.includes('NATURGY') || c.includes('AGUAS')) return { tipo: 'suministro', entidad_nombre: '', confianza: 80 };
  if (c.includes('HACIENDA') || c.includes('AEAT') || c.includes('TGSS') || c.includes('SEG SOCIAL')) return { tipo: 'impuesto', entidad_nombre: '', confianza: 80 };
  if (c.includes('TPV') || c.includes('DATAFONO') || c.includes('REDSYS') || c.includes('ADDON')) return { tipo: 'cobro_tpv', entidad_nombre: '', confianza: 85 };

  // Fuzzy match proveedores
  for (const prov of proveedores) {
    const nombre = prov.nombre.toUpperCase();
    const words = nombre.split(/\s+/).filter((w: string) => w.length > 3);
    const match = words.some((w: string) => c.includes(w));
    if (match) return { tipo: 'pago_proveedor', entidad_nombre: prov.nombre, confianza: 85 };
  }

  return { tipo: '', entidad_nombre: '', confianza: 0 };
}

export default function BancaPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [cuentaDialog, setCuentaDialog] = useState(false);
  const [importDialog, setImportDialog] = useState(false);
  const [conciliarDialog, setConciliarDialog] = useState<any>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [cuentaForm, setCuentaForm] = useState({ nombre: '', iban: '', banco: '' });
  const [editCuentaId, setEditCuentaId] = useState<string | null>(null);
  const [selectedCuenta, setSelectedCuenta] = useState<string>('todas');
  const [filtroEstado, setFiltroEstado] = useState('todas');
  const [preview, setPreview] = useState<any[]>([]);
  const [importCuentaId, setImportCuentaId] = useState('');
  const [conciliarTipo, setConciliarTipo] = useState('');
  const [conciliarEntidad, setConciliarEntidad] = useState('');

  const { data: cuentas = [] } = useQuery({
    queryKey: ['cuentas-bancarias'],
    queryFn: async () => {
      const { data, error } = await supabase.from('cuentas_bancarias').select('*').order('nombre');
      if (error) throw error;
      return data;
    },
  });

  const { data: movimientos = [], isLoading } = useQuery({
    queryKey: ['movimientos-bancarios', selectedCuenta],
    queryFn: async () => {
      let q = supabase.from('movimientos_bancarios').select('*').order('fecha', { ascending: false });
      if (selectedCuenta !== 'todas') q = q.eq('cuenta_id', selectedCuenta);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const { data: proveedores = [] } = useQuery({
    queryKey: ['proveedores'],
    queryFn: async () => {
      const { data } = await supabase.from('proveedores').select('*');
      return data || [];
    },
  });

  // Mutations
  const saveCuentaMut = useMutation({
    mutationFn: async () => {
      if (editCuentaId) {
        await supabase.from('cuentas_bancarias').update(cuentaForm).eq('id', editCuentaId);
      } else {
        await supabase.from('cuentas_bancarias').insert(cuentaForm);
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cuentas-bancarias'] }); setCuentaDialog(false); toast.success('Guardado'); },
  });

  const deleteCuentaMut = useMutation({
    mutationFn: async () => { await supabase.from('cuentas_bancarias').delete().eq('id', deleteId!); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cuentas-bancarias'] }); setDeleteOpen(false); toast.success('Eliminada'); },
  });

  const importMut = useMutation({
    mutationFn: async () => {
      if (!importCuentaId || preview.length === 0) throw new Error('Selecciona cuenta y archivo');
      const rows = preview.map(m => {
        const match = autoMatchMovimiento(m.concepto, proveedores);
        return {
          cuenta_id: importCuentaId,
          fecha: m.fecha,
          concepto: m.concepto,
          importe: m.importe,
          saldo: m.saldo,
          estado: match.confianza > 0 ? 'conciliado' : 'pendiente',
          tipo_detectado: match.tipo,
          entidad_nombre: match.entidad_nombre,
          confianza_match: match.confianza,
        };
      });
      const { error } = await supabase.from('movimientos_bancarios').insert(rows);
      if (error) throw error;
      // Update saldo
      const lastSaldo = preview.find(m => m.saldo != null)?.saldo;
      if (lastSaldo != null) {
        await supabase.from('cuentas_bancarias').update({ saldo_actual: lastSaldo, ultima_actualizacion: new Date().toISOString() }).eq('id', importCuentaId);
      }
      return { total: rows.length, conciliados: rows.filter(r => r.estado === 'conciliado').length };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['movimientos-bancarios'] });
      qc.invalidateQueries({ queryKey: ['cuentas-bancarias'] });
      setImportDialog(false);
      setPreview([]);
      toast.success(`Importados ${res.total} movimientos. ${res.conciliados} conciliados automáticamente.`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const conciliarMut = useMutation({
    mutationFn: async () => {
      if (!conciliarDialog) return;
      await supabase.from('movimientos_bancarios').update({
        estado: 'conciliado',
        tipo_detectado: conciliarTipo,
        entidad_nombre: conciliarEntidad,
        confianza_match: 100,
      }).eq('id', conciliarDialog.id);
      // Save rule
      if (conciliarDialog.concepto && conciliarTipo) {
        const patron = conciliarDialog.concepto.substring(0, 30);
        await supabase.from('reglas_conciliacion').insert({
          patron_concepto: patron,
          tipo: conciliarTipo,
          entidad_nombre: conciliarEntidad,
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['movimientos-bancarios'] });
      setConciliarDialog(null);
      toast.success('Conciliado');
    },
  });

  const ignorarMut = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('movimientos_bancarios').update({ estado: 'ignorado' }).eq('id', id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['movimientos-bancarios'] }); toast.success('Ignorado'); },
  });

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text);
      setPreview(parsed);
      if (parsed.length === 0) toast.error('No se pudo parsear el archivo');
    };
    reader.readAsText(file, 'utf-8');
  };

  // Stats
  const totalIngresos = movimientos.filter(m => Number(m.importe) > 0).reduce((s, m) => s + Number(m.importe), 0);
  const totalGastos = movimientos.filter(m => Number(m.importe) < 0).reduce((s, m) => s + Math.abs(Number(m.importe)), 0);
  const pendientes = movimientos.filter(m => m.estado === 'pendiente').length;
  const saldoTotal = cuentas.reduce((s, c) => s + Number(c.saldo_actual || 0), 0);
  const pctConciliacion = movimientos.length > 0 ? Math.round(movimientos.filter(m => m.estado === 'conciliado').length / movimientos.length * 100) : 0;

  const filtered = filtroEstado === 'todas' ? movimientos : movimientos.filter(m => m.estado === filtroEstado);

  // Desglose gastos
  const gastosPorTipo = TIPOS.map(t => ({
    name: t.label.replace(/^.+\s/, ''),
    value: Math.abs(movimientos.filter(m => m.tipo_detectado === t.value && Number(m.importe) < 0).reduce((s, m) => s + Number(m.importe), 0)),
  })).filter(g => g.value > 0);
  const COLORS = ['hsl(200,70%,50%)', 'hsl(270,60%,55%)', 'hsl(30,80%,55%)', 'hsl(50,70%,50%)', 'hsl(0,65%,55%)', 'hsl(150,60%,40%)', 'hsl(220,10%,50%)'];

  const getTipoLabel = (tipo: string) => TIPOS.find(t => t.value === tipo)?.label || tipo || '❓ Sin clasificar';

  return (
    <div className="space-y-5">
      <PageHeader title="Banca" description="Movimientos bancarios y conciliación automática">
        <Button variant="outline" className="gap-2 active:scale-95" onClick={() => { setEditCuentaId(null); setCuentaForm({ nombre: '', iban: '', banco: '' }); setCuentaDialog(true); }}>
          <Plus className="h-4 w-4" /> Cuenta
        </Button>
        <Button className="gap-2 active:scale-95" onClick={() => { setImportDialog(true); setPreview([]); setImportCuentaId(cuentas[0]?.id || ''); }}>
          <Upload className="h-4 w-4" /> Importar extracto
        </Button>
      </PageHeader>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 animate-fade-in-up">
        <div className="panel-card">
          <div className="panel-card-header"><Building2 className="h-4 w-4" /><span>Saldo total</span></div>
          <div className="panel-card-value text-lg tabular-nums">{fmt(saldoTotal)}</div>
        </div>
        <div className="panel-card">
          <div className="panel-card-header"><Clock className="h-4 w-4" /><span>Pendientes</span></div>
          <div className="panel-card-value text-lg">{pendientes}</div>
        </div>
        <div className="panel-card">
          <div className="panel-card-header"><TrendingUp className="h-4 w-4" /><span>Ingresos</span></div>
          <div className="panel-card-value text-lg text-[hsl(var(--success))] tabular-nums">{fmt(totalIngresos)}</div>
        </div>
        <div className="panel-card">
          <div className="panel-card-header"><TrendingDown className="h-4 w-4" /><span>Gastos</span></div>
          <div className="panel-card-value text-lg text-destructive tabular-nums">{fmt(totalGastos)}</div>
        </div>
        <div className="panel-card">
          <div className="panel-card-header"><CheckCircle className="h-4 w-4" /><span>Conciliación</span></div>
          <div className="panel-card-value text-lg">{pctConciliacion}%</div>
        </div>
      </div>

      {/* Cuentas bar */}
      {cuentas.length > 0 && (
        <div className="flex gap-2 flex-wrap animate-fade-in-up animate-delay-1">
          <Button variant={selectedCuenta === 'todas' ? 'default' : 'outline'} size="sm" onClick={() => setSelectedCuenta('todas')}>Todas</Button>
          {cuentas.map(c => (
            <Button key={c.id} variant={selectedCuenta === c.id ? 'default' : 'outline'} size="sm" onClick={() => setSelectedCuenta(c.id)} className="gap-1">
              {c.nombre} <span className="text-xs opacity-70 tabular-nums">{fmt(Number(c.saldo_actual))}</span>
            </Button>
          ))}
        </div>
      )}

      <Tabs defaultValue="movimientos">
        <TabsList>
          <TabsTrigger value="movimientos">Movimientos</TabsTrigger>
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="cuentas">Cuentas</TabsTrigger>
        </TabsList>

        <TabsContent value="movimientos" className="space-y-3 mt-4">
          <div className="flex gap-2 flex-wrap">
            {['todas', 'pendiente', 'conciliado', 'ignorado'].map(e => (
              <Button key={e} variant={filtroEstado === e ? 'default' : 'outline'} size="sm" onClick={() => setFiltroEstado(e)} className="capitalize">{e}</Button>
            ))}
          </div>

          {isLoading ? (
            <div className="text-sm text-muted-foreground p-8 text-center">Cargando...</div>
          ) : filtered.length === 0 ? (
            <div className="text-sm text-muted-foreground p-8 text-center">Sin movimientos. Importa un extracto bancario.</div>
          ) : (
            <div className="bg-card border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[hsl(var(--surface-offset))]">
                      <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fecha</th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Concepto</th>
                      <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Importe</th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tipo</th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Entidad</th>
                      <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Estado</th>
                      <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground w-20">Acc.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(m => (
                      <tr key={m.id} className="border-t border-[hsl(var(--divider))] hover:bg-[hsl(var(--surface-offset))] transition-colors">
                        <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{new Date(m.fecha).toLocaleDateString('es-ES')}</td>
                        <td className="px-3 py-2.5 max-w-[200px] truncate" title={m.concepto}>{m.concepto}</td>
                        <td className={`px-3 py-2.5 text-right tabular-nums font-semibold ${Number(m.importe) >= 0 ? 'text-[hsl(var(--success))]' : 'text-destructive'}`}>
                          {Number(m.importe) >= 0 ? '+' : ''}{fmt(Number(m.importe))}
                        </td>
                        <td className="px-3 py-2.5 text-xs">{getTipoLabel(m.tipo_detectado)}</td>
                        <td className="px-3 py-2.5 text-xs">{m.entidad_nombre || '—'}</td>
                        <td className="px-3 py-2.5 text-center">
                          <Badge variant={m.estado === 'conciliado' ? 'default' : m.estado === 'ignorado' ? 'secondary' : 'outline'} className="text-[10px]">
                            {m.estado === 'conciliado' ? '✅' : m.estado === 'ignorado' ? '⚪' : '⏳'} {m.estado}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {m.estado === 'pendiente' && (
                            <div className="flex justify-center gap-1">
                              <button onClick={() => { setConciliarDialog(m); setConciliarTipo(''); setConciliarEntidad(''); }} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--surface-offset))] transition-colors">
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => ignorarMut.mutate(m.id)} className="p-1.5 rounded-md text-muted-foreground hover:text-muted-foreground/60 transition-colors">
                                <XCircle className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="resumen" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="panel-card">
              <h3 className="text-sm font-semibold mb-4">Desglose de gastos</h3>
              <div className="h-56">
                {gastosPorTipo.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={gastosPorTipo} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} fontSize={10}>
                        {gastosPorTipo.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => fmt(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <div className="flex items-center justify-center h-full text-sm text-muted-foreground">Sin datos</div>}
              </div>
            </div>
            <div className="panel-card">
              <h3 className="text-sm font-semibold mb-4">Resumen</h3>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Ingresos</span><span className="font-semibold tabular-nums text-[hsl(var(--success))]">+{fmt(totalIngresos)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Gastos</span><span className="font-semibold tabular-nums text-destructive">-{fmt(totalGastos)}</span></div>
                <div className="border-t pt-2 flex justify-between font-bold">
                  <span>Neto</span>
                  <span className={`tabular-nums ${totalIngresos - totalGastos >= 0 ? 'text-[hsl(var(--success))]' : 'text-destructive'}`}>{fmt(totalIngresos - totalGastos)}</span>
                </div>
                <div className="flex justify-between pt-2"><span className="text-muted-foreground">Movimientos</span><span>{movimientos.length}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Conciliados</span><span>{pctConciliacion}%</span></div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="cuentas" className="mt-4">
          {cuentas.length === 0 ? (
            <div className="text-sm text-muted-foreground p-8 text-center">Añade tu primera cuenta bancaria</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {cuentas.map(c => (
                <div key={c.id} className="panel-card">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">{c.nombre}</h3>
                      <p className="text-xs text-muted-foreground">{c.banco}{c.iban ? ` · ${c.iban.substring(0, 4)}****${c.iban.slice(-4)}` : ''}</p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => { setEditCuentaId(c.id); setCuentaForm({ nombre: c.nombre, iban: c.iban || '', banco: c.banco || '' }); setCuentaDialog(true); }} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground transition-colors">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => { setDeleteId(c.id); setDeleteOpen(true); }} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="text-2xl font-bold tabular-nums">{fmt(Number(c.saldo_actual))}</div>
                  {c.ultima_actualizacion && <p className="text-xs text-muted-foreground mt-1">Actualizado: {new Date(c.ultima_actualizacion).toLocaleDateString('es-ES')}</p>}
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Cuenta Dialog */}
      <Dialog open={cuentaDialog} onOpenChange={setCuentaDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{editCuentaId ? 'Editar cuenta' : 'Nueva cuenta'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label className="text-sm font-semibold">Nombre *</Label><Input value={cuentaForm.nombre} onChange={e => setCuentaForm(f => ({ ...f, nombre: e.target.value }))} className="mt-1.5 bg-background" placeholder="CaixaBank principal" /></div>
            <div><Label className="text-sm font-semibold">Banco</Label><Input value={cuentaForm.banco} onChange={e => setCuentaForm(f => ({ ...f, banco: e.target.value }))} className="mt-1.5 bg-background" placeholder="CaixaBank" /></div>
            <div><Label className="text-sm font-semibold">IBAN</Label><Input value={cuentaForm.iban} onChange={e => setCuentaForm(f => ({ ...f, iban: e.target.value }))} className="mt-1.5 bg-background" placeholder="ES12 3456 7890 1234 5678" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCuentaDialog(false)}>Cancelar</Button>
            <Button onClick={() => saveCuentaMut.mutate()} disabled={!cuentaForm.nombre.trim()} className="active:scale-95">Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importDialog} onOpenChange={setImportDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Importar extracto bancario</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm font-semibold">Cuenta destino *</Label>
              <Select value={importCuentaId} onValueChange={setImportCuentaId}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Seleccionar cuenta" /></SelectTrigger>
                <SelectContent>
                  {cuentas.map(c => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-semibold">Archivo CSV</Label>
              <div
                className="mt-1.5 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                <FileSpreadsheet className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Arrastra o haz clic para seleccionar CSV</p>
                <p className="text-xs text-muted-foreground mt-1">CaixaBank, Sabadell, BBVA o formato genérico</p>
                <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFile} />
              </div>
            </div>
            {preview.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-2">{preview.length} movimientos detectados</p>
                <div className="max-h-40 overflow-auto border rounded text-xs">
                  <table className="w-full">
                    <thead><tr className="bg-[hsl(var(--surface-offset))]"><th className="px-2 py-1 text-left">Fecha</th><th className="px-2 py-1 text-left">Concepto</th><th className="px-2 py-1 text-right">Importe</th></tr></thead>
                    <tbody>
                      {preview.slice(0, 5).map((m, i) => (
                        <tr key={i} className="border-t"><td className="px-2 py-1">{m.fecha}</td><td className="px-2 py-1 max-w-[150px] truncate">{m.concepto}</td><td className={`px-2 py-1 text-right ${m.importe >= 0 ? 'text-[hsl(var(--success))]' : 'text-destructive'}`}>{m.importe.toFixed(2)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                  {preview.length > 5 && <p className="px-2 py-1 text-muted-foreground">...y {preview.length - 5} más</p>}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialog(false)}>Cancelar</Button>
            <Button onClick={() => importMut.mutate()} disabled={preview.length === 0 || !importCuentaId || importMut.isPending} className="active:scale-95 gap-2">
              <Upload className="h-4 w-4" /> {importMut.isPending ? 'Importando...' : `Importar ${preview.length}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Conciliar Dialog */}
      <Dialog open={!!conciliarDialog} onOpenChange={() => setConciliarDialog(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Conciliar movimiento</DialogTitle></DialogHeader>
          {conciliarDialog && (
            <div className="space-y-4 py-2">
              <div className="bg-[hsl(var(--surface-offset))] rounded-lg p-3">
                <p className="text-xs text-muted-foreground">{new Date(conciliarDialog.fecha).toLocaleDateString('es-ES')}</p>
                <p className="text-sm font-medium mt-1">{conciliarDialog.concepto}</p>
                <p className={`text-lg font-bold tabular-nums mt-1 ${Number(conciliarDialog.importe) >= 0 ? 'text-[hsl(var(--success))]' : 'text-destructive'}`}>
                  {fmt(Number(conciliarDialog.importe))}
                </p>
              </div>
              <div>
                <Label className="text-sm font-semibold">Tipo</Label>
                <Select value={conciliarTipo} onValueChange={setConciliarTipo}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Seleccionar tipo" /></SelectTrigger>
                  <SelectContent>
                    {TIPOS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {conciliarTipo === 'pago_proveedor' && (
                <div>
                  <Label className="text-sm font-semibold">Proveedor</Label>
                  <Select value={conciliarEntidad} onValueChange={setConciliarEntidad}>
                    <SelectTrigger className="mt-1.5"><SelectValue placeholder="Seleccionar proveedor" /></SelectTrigger>
                    <SelectContent>
                      {proveedores.map((p: any) => <SelectItem key={p.id} value={p.nombre}>{p.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConciliarDialog(null)}>Cancelar</Button>
            <Button onClick={() => conciliarMut.mutate()} disabled={!conciliarTipo} className="active:scale-95">Conciliar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteDialog open={deleteOpen} onOpenChange={setDeleteOpen} onConfirm={() => deleteCuentaMut.mutate()} isPending={deleteCuentaMut.isPending} />
    </div>
  );
}
