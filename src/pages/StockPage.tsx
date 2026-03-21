import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { fmt } from '@/lib/queries';
import {
  Package, AlertTriangle, Search, TrendingDown, TrendingUp,
  ClipboardCheck, BarChart3, Layers, RefreshCw, Check, Loader2
} from 'lucide-react';
import { toast } from 'sonner';

const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;

async function callStockEngine(path: string, method = 'GET', body?: unknown) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const res = await fetch(
    `https://${projectId}.supabase.co/functions/v1/stock-engine/${path}`,
    {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error en stock-engine');
  }
  return res.json();
}

// ─── CONTEO SEMANAL TAB ───
function ConteoSemanal() {
  const qc = useQueryClient();
  const [cantidades, setCantidades] = useState<Record<string, string>>({});

  const { data: semanaData, isLoading } = useQuery({
    queryKey: ['stock-semana'],
    queryFn: () => callStockEngine('semana-actual'),
  });

  const conteoMut = useMutation({
    mutationFn: (params: { producto_id: string; cantidad: number; unidad: string }) =>
      callStockEngine('conteo', 'POST', params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock-semana'] });
      toast.success('Conteo registrado');
    },
    onError: () => toast.error('Error al registrar conteo'),
  });

  const regenerarMut = useMutation({
    mutationFn: () => callStockEngine('generar-semana', 'POST'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock-semana'] });
      toast.success('Semana regenerada');
    },
  });

  const productos = semanaData?.productos || [];
  const completados = productos.filter((p: any) => p.completado).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">
            Semana {semanaData?.semana || '—'} / {semanaData?.anyo || '—'}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {completados} de {productos.length} productos contados
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => regenerarMut.mutate()}
          disabled={regenerarMut.isPending}
          className="gap-1.5 active:scale-95"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${regenerarMut.isPending ? 'animate-spin' : ''}`} />
          Regenerar
        </Button>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-[hsl(var(--surface-offset))] rounded-full overflow-hidden">
        <div
          className="h-full bg-[hsl(var(--success))] transition-all duration-500"
          style={{ width: productos.length ? `${(completados / productos.length) * 100}%` : '0%' }}
        />
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground p-8 text-center">Cargando selección semanal...</div>
      ) : productos.length === 0 ? (
        <div className="text-sm text-muted-foreground p-8 text-center">
          No hay productos con movimiento suficiente para generar conteo esta semana.
          <br />Necesitas albaranes procesados en los últimos 60 días.
        </div>
      ) : (
        <div className="space-y-2">
          {productos.map((sol: any) => {
            const prod = sol.productos;
            const isCompleted = sol.completado;
            const conteoValue = cantidades[sol.producto_id] ?? '';

            return (
              <div
                key={sol.id}
                className={`panel-card flex items-center gap-4 transition-all ${
                  isCompleted ? 'opacity-60' : ''
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  isCompleted
                    ? 'bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]'
                    : 'bg-[hsl(var(--surface-offset))] text-muted-foreground'
                }`}>
                  {isCompleted ? <Check className="h-4 w-4" /> : <Package className="h-4 w-4" />}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{prod?.nombre || '—'}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {prod?.proveedor_nombre || 'Sin proveedor'} · {prod?.unidad || 'ud'} · {fmt(Number(prod?.precio_actual) || 0)}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Cantidad"
                    value={conteoValue}
                    onChange={(e) =>
                      setCantidades((prev) => ({ ...prev, [sol.producto_id]: e.target.value }))
                    }
                    className="w-24 h-8 text-sm bg-background tabular-nums"
                    disabled={isCompleted}
                  />
                  <span className="text-xs text-muted-foreground w-6">{prod?.unidad || 'ud'}</span>
                  <Button
                    size="sm"
                    variant={isCompleted ? 'ghost' : 'default'}
                    className="h-8 px-3 active:scale-95"
                    disabled={isCompleted || !conteoValue || conteoMut.isPending}
                    onClick={() =>
                      conteoMut.mutate({
                        producto_id: sol.producto_id,
                        cantidad: parseFloat(conteoValue),
                        unidad: prod?.unidad || 'ud',
                      })
                    }
                  >
                    {conteoMut.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : isCompleted ? (
                      'Hecho'
                    ) : (
                      'Contar'
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── DESVIACIONES TAB ───
function Desviaciones() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const today = now.toISOString().split('T')[0];
  const [desde, setDesde] = useState(firstDay);
  const [hasta, setHasta] = useState(today);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['stock-desviaciones', desde, hasta],
    queryFn: () => callStockEngine(`desviaciones?desde=${desde}&hasta=${hasta}`),
    enabled: false,
  });

  const kpis = data?.kpis;
  const desviaciones = data?.desviaciones || [];

  function getSemaforo(pct: number) {
    const abs = Math.abs(pct);
    if (abs <= 5) return { color: 'hsl(var(--success))', label: 'OK' };
    if (abs <= 10) return { color: 'hsl(var(--warning, 45 93% 47%))', label: 'Vigilar' };
    return { color: 'hsl(var(--error))', label: 'ALERTA' };
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs font-semibold text-muted-foreground">Desde</label>
          <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="w-40 h-8 text-sm bg-card mt-1" />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground">Hasta</label>
          <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="w-40 h-8 text-sm bg-card mt-1" />
        </div>
        <Button size="sm" onClick={() => refetch()} disabled={isLoading} className="h-8 gap-1.5 active:scale-95">
          {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BarChart3 className="h-3.5 w-3.5" />}
          Calcular
        </Button>
      </div>

      {kpis && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="panel-card">
            <div className="panel-card-header"><TrendingDown className="h-4 w-4" /><span>Desviación total</span></div>
            <div className={`panel-card-value text-xl tabular-nums ${kpis.desviacion_total_euros > 0 ? 'text-[hsl(var(--error))]' : 'text-[hsl(var(--success))]'}`}>
              {fmt(kpis.desviacion_total_euros)}
            </div>
          </div>
          <div className="panel-card">
            <div className="panel-card-header"><BarChart3 className="h-4 w-4" /><span>Desviación media</span></div>
            <div className="panel-card-value text-xl tabular-nums">{kpis.desviacion_media_pct}%</div>
          </div>
          <div className="panel-card">
            <div className="panel-card-header"><Package className="h-4 w-4" /><span>Vigilados</span></div>
            <div className="panel-card-value text-xl">{kpis.productos_vigilados}</div>
          </div>
          <div className="panel-card">
            <div className="panel-card-header"><AlertTriangle className="h-4 w-4" /><span>Alertas</span></div>
            <div className="panel-card-value text-xl text-[hsl(var(--error))]">{kpis.alertas_activas}</div>
          </div>
        </div>
      )}

      {desviaciones.length > 0 && (
        <div className="bg-card border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[hsl(var(--surface-offset))]">
                  {['Producto', 'Stock ini.', 'Compras', 'Stock fin.', 'C. Real', 'C. Teórico', 'Desv.', 'Desv. %', '€', 'Estado'].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {desviaciones.map((d: any) => {
                  const sem = getSemaforo(d.desviacion_porcentaje);
                  return (
                    <tr key={d.producto_id} className="border-t border-[hsl(var(--divider))] hover:bg-[hsl(var(--surface-offset))] transition-colors">
                      <td className="px-3 py-2.5 font-medium">{d.nombre}</td>
                      <td className="px-3 py-2.5 tabular-nums text-muted-foreground">{d.stock_inicial}</td>
                      <td className="px-3 py-2.5 tabular-nums text-muted-foreground">{d.compras_periodo}</td>
                      <td className="px-3 py-2.5 tabular-nums text-muted-foreground">{d.stock_final}</td>
                      <td className="px-3 py-2.5 tabular-nums font-medium">{d.consumo_real}</td>
                      <td className="px-3 py-2.5 tabular-nums text-muted-foreground">{d.consumo_teorico}</td>
                      <td className="px-3 py-2.5 tabular-nums font-medium">{d.desviacion > 0 ? '+' : ''}{d.desviacion}</td>
                      <td className="px-3 py-2.5 tabular-nums font-semibold" style={{ color: sem.color }}>
                        {d.desviacion_porcentaje > 0 ? '+' : ''}{d.desviacion_porcentaje}%
                      </td>
                      <td className="px-3 py-2.5 tabular-nums">{fmt(d.desviacion_euros)}</td>
                      <td className="px-3 py-2.5">
                        <span
                          className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
                          style={{ backgroundColor: sem.color + '20', color: sem.color }}
                        >
                          {sem.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!data && !isLoading && (
        <div className="text-sm text-muted-foreground p-8 text-center">
          Selecciona un periodo y pulsa "Calcular" para ver las desviaciones.
          <br />Necesitas conteos registrados en ambos extremos del periodo.
        </div>
      )}
    </div>
  );
}

// ─── CLASIFICACIÓN ABC TAB ───
function ClasificacionABC() {
  const [search, setSearch] = useState('');
  const { data: abc = [], isLoading } = useQuery({
    queryKey: ['stock-abc'],
    queryFn: () => callStockEngine('clasificacion-abc'),
  });

  const filtered = abc.filter((p: any) =>
    !search || p.nombre.toLowerCase().includes(search.toLowerCase())
  );

  const countA = abc.filter((p: any) => p.clase === 'A').length;
  const countB = abc.filter((p: any) => p.clase === 'B').length;
  const countC = abc.filter((p: any) => p.clase === 'C').length;
  const totalGasto = abc.reduce((s: number, p: any) => s + p.gasto_90d, 0);

  const claseColors: Record<string, string> = {
    A: 'hsl(var(--error))',
    B: 'hsl(var(--warning, 45 93% 47%))',
    C: 'hsl(var(--success))',
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="panel-card">
          <div className="panel-card-header"><Layers className="h-4 w-4" /><span>Total productos</span></div>
          <div className="panel-card-value text-xl">{abc.length}</div>
        </div>
        <div className="panel-card">
          <div className="panel-card-header text-[hsl(var(--error))]"><span className="font-bold">A</span><span>80% gasto</span></div>
          <div className="panel-card-value text-xl">{countA}</div>
        </div>
        <div className="panel-card">
          <div className="panel-card-header" style={{ color: 'hsl(var(--warning, 45 93% 47%))' }}><span className="font-bold">B</span><span>15% gasto</span></div>
          <div className="panel-card-value text-xl">{countB}</div>
        </div>
        <div className="panel-card">
          <div className="panel-card-header text-[hsl(var(--success))]"><span className="font-bold">C</span><span>5% gasto</span></div>
          <div className="panel-card-value text-xl">{countC}</div>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar producto..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-card" />
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground p-8 text-center">Calculando clasificación ABC...</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-muted-foreground p-8 text-center">
          No hay productos con compras en los últimos 90 días.
        </div>
      ) : (
        <div className="bg-card border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[hsl(var(--surface-offset))]">
                  {['Clase', 'Producto', 'Proveedor', 'Gasto 90d', '% del total', 'Precio', 'Unidad'].map((h) => (
                    <th key={h} className={`px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap ${
                      ['Gasto 90d', '% del total', 'Precio'].includes(h) ? 'text-right' : 'text-left'
                    }`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p: any) => (
                  <tr key={p.producto_id} className="border-t border-[hsl(var(--divider))] hover:bg-[hsl(var(--surface-offset))] transition-colors">
                    <td className="px-3 py-2.5">
                      <span
                        className="inline-flex w-7 h-7 items-center justify-center rounded-lg text-xs font-bold"
                        style={{ backgroundColor: claseColors[p.clase] + '20', color: claseColors[p.clase] }}
                      >
                        {p.clase}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-medium">{p.nombre}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{p.proveedor || '—'}</td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{fmt(p.gasto_90d)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                      {totalGasto > 0 ? ((p.gasto_90d / totalGasto) * 100).toFixed(1) : 0}%
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{fmt(Number(p.precio) || 0)}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{p.unidad}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN PAGE ───
export default function StockPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Stock" description="Inventario rotativo — conteo semanal, desviaciones y clasificación ABC" />

      <Tabs defaultValue="conteo" className="animate-fade-in-up">
        <TabsList className="bg-card border">
          <TabsTrigger value="conteo" className="gap-1.5 data-[state=active]:bg-[hsl(var(--surface-offset))]">
            <ClipboardCheck className="h-3.5 w-3.5" /> Conteo semanal
          </TabsTrigger>
          <TabsTrigger value="desviaciones" className="gap-1.5 data-[state=active]:bg-[hsl(var(--surface-offset))]">
            <BarChart3 className="h-3.5 w-3.5" /> Desviaciones
          </TabsTrigger>
          <TabsTrigger value="abc" className="gap-1.5 data-[state=active]:bg-[hsl(var(--surface-offset))]">
            <Layers className="h-3.5 w-3.5" /> Clasificación ABC
          </TabsTrigger>
        </TabsList>

        <TabsContent value="conteo" className="mt-4">
          <ConteoSemanal />
        </TabsContent>

        <TabsContent value="desviaciones" className="mt-4">
          <Desviaciones />
        </TabsContent>

        <TabsContent value="abc" className="mt-4">
          <ClasificacionABC />
        </TabsContent>
      </Tabs>
    </div>
  );
}
