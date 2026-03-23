import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { fmt } from '@/lib/queries';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { AlertTriangle, TrendingDown, TrendingUp, Plus, DollarSign, Percent, Trash2 } from 'lucide-react';

async function fetchMermas() {
  const { data, error } = await supabase.from('mermas_registradas').select('*').order('fecha', { ascending: false });
  if (error) throw error;
  return data;
}
async function fetchProductos() {
  const { data, error } = await supabase.from('productos').select('*').order('nombre');
  if (error) throw error;
  return data;
}
async function fetchAlbaranes() {
  const { data, error } = await supabase.from('albaranes').select('*');
  if (error) throw error;
  return data;
}
async function fetchDesviaciones() {
  const { data, error } = await supabase.from('stock_desviaciones').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

const MOTIVOS = [
  { value: 'caducado', label: 'Caducado' },
  { value: 'roto', label: 'Roto / Dañado' },
  { value: 'quemado', label: 'Quemado' },
  { value: 'sobrante', label: 'Sobrante' },
  { value: 'devolucion', label: 'Devolución' },
  { value: 'otro', label: 'Otro' },
];

const MOTIVO_COLORS = ['hsl(320,56%,41%)', 'hsl(24,70%,34%)', 'hsl(0,60%,50%)', 'hsl(200,100%,29%)', 'hsl(183,97%,22%)', 'hsl(40,3%,47%)'];

export default function MermasPage() {
  const qc = useQueryClient();
  const { data: mermas = [] } = useQuery({ queryKey: ['mermas'], queryFn: fetchMermas });
  const { data: productos = [] } = useQuery({ queryKey: ['productos'], queryFn: fetchProductos });
  const { data: albaranes = [] } = useQuery({ queryKey: ['albaranes'], queryFn: fetchAlbaranes });
  const { data: desviaciones = [] } = useQuery({ queryKey: ['desviaciones'], queryFn: fetchDesviaciones });

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ producto_id: '', cantidad: '', motivo: 'caducado', registrado_por: '', notas: '' });
  const [search, setSearch] = useState('');

  // ─── Filter by current month ───
  const now = new Date();
  const mesActual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const mermasMes = mermas.filter(m => m.fecha.startsWith(mesActual));
  const mesAnterior = now.getMonth() === 0
    ? `${now.getFullYear() - 1}-12`
    : `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`;
  const mermasMesAnt = mermas.filter(m => m.fecha.startsWith(mesAnterior));

  // ─── KPIs ───
  const perdidasMes = mermasMes.reduce((s, m) => s + Number(m.coste_estimado || 0), 0);
  const perdidasMesAnt = mermasMesAnt.reduce((s, m) => s + Number(m.coste_estimado || 0), 0);
  const comprasMes = albaranes.filter(a => a.fecha.startsWith(mesActual)).reduce((s, a) => s + Number(a.importe || 0), 0);
  const pctMerma = comprasMes > 0 ? (perdidasMes / comprasMes) * 100 : 0;
  const tendencia = perdidasMes < perdidasMesAnt ? 'mejorando' : perdidasMes > perdidasMesAnt ? 'empeorando' : 'estable';

  // Include desviaciones in ranking
  const productLosses = useMemo(() => {
    const map: Record<string, { nombre: string; euros: number; kg: number }> = {};
    // From registered mermas
    for (const m of mermasMes) {
      if (!map[m.producto_id]) {
        const prod = productos.find(p => p.id === m.producto_id);
        map[m.producto_id] = { nombre: prod?.nombre || m.producto_nombre || '', euros: 0, kg: 0 };
      }
      map[m.producto_id].euros += Number(m.coste_estimado || 0);
      map[m.producto_id].kg += Number(m.cantidad || 0);
    }
    // From desviaciones (positive = loss)
    for (const d of desviaciones) {
      if (Number(d.desviacion_euros || 0) > 0) {
        if (!map[d.producto_id]) {
          const prod = productos.find(p => p.id === d.producto_id);
          map[d.producto_id] = { nombre: prod?.nombre || '', euros: 0, kg: 0 };
        }
        map[d.producto_id].euros += Number(d.desviacion_euros || 0);
        map[d.producto_id].kg += Number(d.desviacion || 0);
      }
    }
    return Object.entries(map)
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.euros - a.euros)
      .slice(0, 10);
  }, [mermasMes, desviaciones, productos]);

  // Donut by motivo
  const porMotivo = useMemo(() => {
    const map: Record<string, number> = {};
    for (const m of mermasMes) {
      const mot = m.motivo || 'otro';
      map[mot] = (map[mot] || 0) + Number(m.coste_estimado || 0);
    }
    return Object.entries(map).map(([name, value]) => ({ name: MOTIVOS.find(m => m.value === name)?.label || name, value }));
  }, [mermasMes]);

  // Weekly evolution (last 12 weeks)
  const evolucionSemanal = useMemo(() => {
    const weeks: { semana: string; euros: number }[] = [];
    for (let w = 11; w >= 0; w--) {
      const start = new Date();
      start.setDate(start.getDate() - (w + 1) * 7);
      const end = new Date();
      end.setDate(end.getDate() - w * 7);
      const startStr = start.toISOString().split('T')[0];
      const endStr = end.toISOString().split('T')[0];
      const total = mermas
        .filter(m => m.fecha >= startStr && m.fecha < endStr)
        .reduce((s, m) => s + Number(m.coste_estimado || 0), 0);
      weeks.push({ semana: `S${12 - w}`, euros: total });
    }
    return weeks;
  }, [mermas]);

  // ─── Submit merma ───
  const submit = async () => {
    if (!form.producto_id || !form.cantidad) { toast.error('Producto y cantidad son obligatorios'); return; }
    const prod = productos.find(p => p.id === form.producto_id);
    const coste = Number(form.cantidad) * Number(prod?.precio_actual || 0);
    const { error } = await supabase.from('mermas_registradas').insert({
      producto_id: form.producto_id,
      producto_nombre: prod?.nombre || '',
      cantidad: Number(form.cantidad),
      unidad: prod?.unidad || 'ud',
      motivo: form.motivo,
      coste_estimado: Math.round(coste * 100) / 100,
      registrado_por: form.registrado_por,
      notas: form.notas,
    });
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ['mermas'] });
    setShowForm(false);
    setForm({ producto_id: '', cantidad: '', motivo: 'caducado', registrado_por: '', notas: '' });
    toast.success('Merma registrada');
  };

  const deleteMerma = async (id: string) => {
    await supabase.from('mermas_registradas').delete().eq('id', id);
    qc.invalidateQueries({ queryKey: ['mermas'] });
    toast.success('Eliminada');
  };

  const pctColor = pctMerma < 3 ? 'text-[hsl(var(--success))]' : pctMerma < 5 ? 'text-[hsl(var(--warning))]' : 'text-destructive';

  const filteredProducts = search
    ? productos.filter(p => p.nombre.toLowerCase().includes(search.toLowerCase()))
    : productos;

  return (
    <div className="space-y-4 md:space-y-5">
      <PageHeader title="Control de Mermas" description="Desperdicio, pérdidas y alertas" />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><DollarSign className="h-4 w-4" /> Pérdidas este mes</div>
          <p className={`text-lg md:text-xl font-bold tabular-nums ${perdidasMes > 0 ? 'text-destructive' : ''}`}>{fmt(perdidasMes)}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><Percent className="h-4 w-4" /> % sobre compras</div>
          <p className={`text-lg md:text-xl font-bold tabular-nums ${pctColor}`}>{pctMerma.toFixed(1)}%</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><AlertTriangle className="h-4 w-4" /> Productos afectados</div>
          <p className="text-lg md:text-xl font-bold tabular-nums">{productLosses.length}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            {tendencia === 'mejorando' ? <TrendingDown className="h-4 w-4 text-[hsl(var(--success))]" /> : <TrendingUp className="h-4 w-4 text-destructive" />}
            Tendencia
          </div>
          <p className={`text-lg md:text-xl font-bold ${tendencia === 'mejorando' ? 'text-[hsl(var(--success))]' : tendencia === 'empeorando' ? 'text-destructive' : ''}`}>
            {tendencia === 'mejorando' ? '↘️ Mejorando' : tendencia === 'empeorando' ? '↗️ Empeorando' : '→ Estable'}
          </p>
        </Card>
      </div>

      <Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-2" /> Registrar merma</Button>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Donut by motivo */}
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3">Por motivo</h3>
          {porMotivo.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">Sin datos este mes</p>
          ) : (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={porMotivo} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2}>
                    {porMotivo.map((_, i) => <Cell key={i} fill={MOTIVO_COLORS[i % MOTIVO_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem', fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="flex flex-wrap gap-2 mt-1 justify-center">
            {porMotivo.map((m, i) => (
              <div key={m.name} className="flex items-center gap-1 text-[10px]">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: MOTIVO_COLORS[i % MOTIVO_COLORS.length] }} />
                {m.name}: {fmt(m.value)}
              </div>
            ))}
          </div>
        </Card>

        {/* Weekly evolution */}
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3">Evolución semanal (12 semanas)</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={evolucionSemanal}>
                <XAxis dataKey="semana" fontSize={10} stroke="hsl(var(--muted-foreground))" />
                <YAxis fontSize={10} stroke="hsl(var(--muted-foreground))" tickFormatter={v => `${v}€`} />
                <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem', fontSize: '11px' }} />
                <Bar dataKey="euros" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* TOP 10 ranking */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-3">🏆 Top 10 productos con más pérdida</h3>
        {productLosses.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Sin pérdidas detectadas</p>
        ) : (
          <table className="w-full text-xs md:text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="text-left p-2">#</th>
                <th className="text-left p-2">Producto</th>
                <th className="text-right p-2">Desviación kg</th>
                <th className="text-right p-2">Desviación €</th>
              </tr>
            </thead>
            <tbody>
              {productLosses.map((p, i) => (
                <tr key={p.id} className="border-b border-border/50">
                  <td className="p-2 font-bold">{i + 1}</td>
                  <td className="p-2">{p.nombre}</td>
                  <td className="text-right p-2 tabular-nums text-destructive">+{p.kg.toFixed(1)}</td>
                  <td className="text-right p-2 tabular-nums font-medium text-destructive">{fmt(p.euros)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Recent mermas */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-3">Últimos registros de merma</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs md:text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="text-left p-2">Fecha</th>
                <th className="text-left p-2">Producto</th>
                <th className="text-right p-2">Cantidad</th>
                <th className="text-left p-2">Motivo</th>
                <th className="text-right p-2">Coste</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {mermas.slice(0, 20).map(m => (
                <tr key={m.id} className="border-b border-border/50">
                  <td className="p-2">{new Date(m.fecha).toLocaleDateString('es-ES')}</td>
                  <td className="p-2">{m.producto_nombre}</td>
                  <td className="text-right p-2 tabular-nums">{m.cantidad} {m.unidad}</td>
                  <td className="p-2"><Badge variant="outline" className="text-[10px]">{MOTIVOS.find(x => x.value === m.motivo)?.label || m.motivo}</Badge></td>
                  <td className="text-right p-2 tabular-nums text-destructive">{fmt(m.coste_estimado)}</td>
                  <td className="p-2">
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => deleteMerma(m.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </td>
                </tr>
              ))}
              {mermas.length === 0 && (
                <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">Sin registros de merma</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Dialog: register merma */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Registrar merma</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Producto</Label>
              <Input placeholder="Buscar producto..." value={search} onChange={e => setSearch(e.target.value)} className="mb-1" />
              <Select value={form.producto_id} onValueChange={v => setForm(f => ({ ...f, producto_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  {filteredProducts.slice(0, 50).map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.nombre} ({fmt(p.precio_actual)})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Cantidad</Label>
              <Input type="number" step="0.1" value={form.cantidad} onChange={e => setForm(f => ({ ...f, cantidad: e.target.value }))} />
            </div>
            <div>
              <Label>Motivo</Label>
              <Select value={form.motivo} onValueChange={v => setForm(f => ({ ...f, motivo: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MOTIVOS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Registrado por</Label>
              <Input value={form.registrado_por} onChange={e => setForm(f => ({ ...f, registrado_por: e.target.value }))} />
            </div>
            <div>
              <Label>Notas</Label>
              <Textarea value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} rows={2} />
            </div>
            <Button className="w-full" onClick={submit}>Registrar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
