import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { fetchAlbaranes, fetchPersonal, fetchAlquiler, fetchBancos, fetchSuministros, fetchArqueos, fmt } from '@/lib/queries';
import { supabase } from '@/integrations/supabase/client';
import {
  DollarSign, ShoppingCart, Users, Home, CreditCard, Zap, TrendingUp, TrendingDown,
  Coffee, UtensilsCrossed, Plus, Star, AlertTriangle, Eye,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function DashboardPage() {
  const nav = useNavigate();
  const { data: albaranes = [] } = useQuery({ queryKey: ['albaranes'], queryFn: fetchAlbaranes });
  const { data: personal = [] } = useQuery({ queryKey: ['personal'], queryFn: fetchPersonal });
  const { data: alquiler = [] } = useQuery({ queryKey: ['alquiler'], queryFn: fetchAlquiler });
  const { data: bancos = [] } = useQuery({ queryKey: ['bancos'], queryFn: fetchBancos });
  const { data: suministros = [] } = useQuery({ queryKey: ['suministros'], queryFn: () => fetchSuministros() });
  const { data: arqueos = [] } = useQuery({ queryKey: ['arqueos'], queryFn: fetchArqueos });
  const { data: pedidos = [] } = useQuery({ queryKey: ['pedidos-dash'], queryFn: async () => {
    const { data } = await supabase.from('pedidos_sugeridos').select('*').eq('estado', 'borrador');
    return data || [];
  }});
  const { data: ingenieria = [] } = useQuery({ queryKey: ['ingenieria-dash'], queryFn: async () => {
    const { data } = await supabase.from('ingenieria_menu').select('*').order('created_at', { ascending: false }).limit(50);
    return data || [];
  }});
  const { data: mermas = [] } = useQuery({ queryKey: ['mermas-dash'], queryFn: async () => {
    const mesActual = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const { data } = await supabase.from('mermas_registradas').select('*').gte('fecha', `${mesActual}-01`);
    return data || [];
  }});

  // Proporción del día actual del mes (ej: día 15 de 30 = 0.5)
  const now = new Date();
  const diaActual = now.getDate();
  const diasDelMes = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const proporcionMes = diaActual / diasDelMes;

  const ventas = arqueos.reduce((s, a) => s + Number(a.total_sin_iva || 0), 0);
  const comprasTotal = albaranes.reduce((s, a) => s + Number(a.importe || 0), 0);

  // Gastos fijos mensuales prorrateados al día actual
  const personalMensual = personal.filter(e => e.activo).reduce((s, e) => s + Number(e.coste_mensual || 0), 0);
  const alquilerMensual = alquiler.filter(a => a.activo).reduce((s, a) => s + Number(a.importe_mensual || 0), 0);
  const bancosMensual = bancos.filter(b => b.activo).reduce((s, b) => s + Number(b.importe_mensual || 0), 0);
  const suministrosMensual = suministros.reduce((s, x) => s + Number(x.importe || 0), 0);

  const personalTotal = Math.round(personalMensual * proporcionMes * 100) / 100;
  const alquilerTotal = Math.round(alquilerMensual * proporcionMes * 100) / 100;
  const bancosTotal = Math.round(bancosMensual * proporcionMes * 100) / 100;
  const suministrosTotal = Math.round(suministrosMensual * proporcionMes * 100) / 100;

  const resultado = ventas - comprasTotal - personalTotal - alquilerTotal - bancosTotal - suministrosTotal;

  const pct = (v: number) => ventas > 0 ? Math.round(v / ventas * 100) : 0;
  const positivo = resultado >= 0;

  const costStructure = [
    { name: 'Compras', value: comprasTotal },
    { name: 'Personal', value: personalTotal },
    { name: 'Alquiler', value: alquilerTotal },
    { name: 'Bancos', value: bancosTotal },
    { name: 'Suministros', value: suministrosTotal },
    { name: 'Resultado', value: Math.max(resultado, 0) },
  ];

  const comprasBreakdown = [
    { name: 'Compras', value: comprasTotal, color: 'hsl(200, 70%, 50%)' },
  ];

  return (
    <div className="space-y-4 md:space-y-5">
      <PageHeader title="Panel de Control" description={`Día ${diaActual} de ${diasDelMes} — gastos fijos prorrateados al ${Math.round(proporcionMes * 100)}%`} />

      {/* Row 1: Ventas + Compras */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 animate-fade-in-up animate-delay-1">
        <div className="panel-card panel-ventas">
          <div className="panel-card-header"><DollarSign className="h-4 w-4 md:h-5 md:w-5" /><span>Ventas</span></div>
          <div className="panel-card-value text-xl md:text-3xl">{fmt(ventas)}</div>
          <div className="panel-card-sub">sin IVA · {arqueos.length} arqueos</div>
        </div>
        <div className="panel-card panel-compras">
          <div className="panel-card-header"><ShoppingCart className="h-4 w-4 md:h-5 md:w-5" /><span>Compras</span></div>
          <div className="panel-card-value text-xl md:text-3xl">{fmt(comprasTotal)}</div>
          <div className="panel-card-sub">{pct(comprasTotal)}% sobre ventas · {albaranes.length} albaranes</div>
        </div>
      </div>

      {/* Row 2: Fixed costs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 animate-fade-in-up animate-delay-2">
        <div className="panel-card cursor-pointer active:scale-[0.98]" onClick={() => nav('/personal')}>
          <div className="panel-card-header"><Users className="h-4 w-4" /><span className="truncate">Personal</span></div>
          <div className="panel-card-value text-lg md:text-2xl">{fmt(personalTotal)}</div>
          <div className="panel-card-sub">{pct(personalTotal)}%</div>
        </div>
        <div className="panel-card cursor-pointer active:scale-[0.98]" onClick={() => nav('/alquiler')}>
          <div className="panel-card-header"><Home className="h-4 w-4" /><span className="truncate">Alquiler</span></div>
          <div className="panel-card-value text-lg md:text-2xl">{fmt(alquilerTotal)}</div>
          <div className="panel-card-sub">{pct(alquilerTotal)}%</div>
        </div>
        <div className="panel-card cursor-pointer active:scale-[0.98]" onClick={() => nav('/bancos')}>
          <div className="panel-card-header"><CreditCard className="h-4 w-4" /><span className="truncate">Bancos</span></div>
          <div className="panel-card-value text-lg md:text-2xl">{fmt(bancosTotal)}</div>
          <div className="panel-card-sub">{pct(bancosTotal)}%</div>
        </div>
        <div className="panel-card cursor-pointer active:scale-[0.98]" onClick={() => nav('/suministros')}>
          <div className="panel-card-header"><Zap className="h-4 w-4" /><span className="truncate">Suministros</span></div>
          <div className="panel-card-value text-lg md:text-2xl">{fmt(suministrosTotal)}</div>
          <div className="panel-card-sub">{pct(suministrosTotal)}%</div>
        </div>
      </div>

      {/* Resultado */}
      <div className={`panel-resultado ${positivo ? 'positivo' : 'negativo'} animate-fade-in-up animate-delay-3`}>
        <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
          {positivo ? <TrendingUp className="h-4 w-4 md:h-5 md:w-5" /> : <TrendingDown className="h-4 w-4 md:h-5 md:w-5" />}
          Resultado
        </div>
        <p className={`text-2xl md:text-4xl font-extrabold tabular-nums tracking-tight ${positivo ? 'text-[hsl(var(--success))]' : 'text-red-500'}`}>
          {fmt(resultado)}
        </p>
        <p className="text-xs text-muted-foreground mt-1">{pct(resultado)}% margen sobre ventas</p>
      </div>

      {/* Intelligence blocks */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 animate-fade-in-up animate-delay-4">
        <div className="panel-card cursor-pointer active:scale-[0.98]" onClick={() => nav('/prediccion')}>
          <div className="panel-card-header"><Eye className="h-4 w-4" /><span>🔮 Previsión semana</span></div>
          <div className="panel-card-value text-lg md:text-xl">{pedidos.length} pedidos</div>
          <div className="panel-card-sub">pendientes de enviar</div>
        </div>
        <div className="panel-card cursor-pointer active:scale-[0.98]" onClick={() => nav('/ingenieria-menu')}>
          <div className="panel-card-header"><Star className="h-4 w-4" /><span>📊 Ing. Menú</span></div>
          <div className="panel-card-value text-lg md:text-xl">
            ⭐{ingenieria.filter(i => i.clasificacion === 'estrella').length} 🐴{ingenieria.filter(i => i.clasificacion === 'caballo').length} 🧩{ingenieria.filter(i => i.clasificacion === 'puzzle').length} 🐕{ingenieria.filter(i => i.clasificacion === 'perro').length}
          </div>
          <div className="panel-card-sub">
            {ingenieria.length > 0 ? `Margen medio: ${(ingenieria.reduce((s, i) => s + (100 - Number(i.food_cost_pct || 0)), 0) / ingenieria.length).toFixed(1)}%` : 'Sin análisis'}
          </div>
        </div>
        <div className="panel-card cursor-pointer active:scale-[0.98]" onClick={() => nav('/mermas')}>
          <div className="panel-card-header"><AlertTriangle className="h-4 w-4" /><span>💸 Mermas del mes</span></div>
          <div className="panel-card-value text-lg md:text-xl">{fmt(mermas.reduce((s: number, m: any) => s + Number(m.coste_estimado || 0), 0))}</div>
          <div className="panel-card-sub">
            {comprasTotal > 0 ? `${(mermas.reduce((s: number, m: any) => s + Number(m.coste_estimado || 0), 0) / comprasTotal * 100).toFixed(1)}% sobre compras` : 'Sin compras'}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 animate-fade-in-up animate-delay-4">
        <div className="panel-card">
          <h3 className="text-sm font-semibold mb-4">Estructura de Costes</h3>
          <div className="h-48 md:h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={costStructure} layout="vertical" margin={{ left: 60, right: 8 }}>
                <XAxis type="number" tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} fontSize={10} stroke="hsl(var(--muted-foreground))" />
                <YAxis type="category" dataKey="name" fontSize={10} width={55} stroke="hsl(var(--muted-foreground))" />
                <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem', fontSize: '11px' }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="panel-card">
          <h3 className="text-sm font-semibold mb-4">Resumen</h3>
          <div className="space-y-2.5 text-xs md:text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Ventas</span><span className="font-semibold tabular-nums">{fmt(ventas)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">− Compras</span><span className="font-semibold tabular-nums">{fmt(comprasTotal)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">− Personal</span><span className="font-semibold tabular-nums">{fmt(personalTotal)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">− Alquiler</span><span className="font-semibold tabular-nums">{fmt(alquilerTotal)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">− Bancos</span><span className="font-semibold tabular-nums">{fmt(bancosTotal)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">− Suministros</span><span className="font-semibold tabular-nums">{fmt(suministrosTotal)}</span></div>
            <div className="border-t pt-2 flex justify-between font-bold">
              <span>= Resultado</span>
              <span className={`tabular-nums ${positivo ? 'text-[hsl(var(--success))]' : 'text-red-500'}`}>{fmt(resultado)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
