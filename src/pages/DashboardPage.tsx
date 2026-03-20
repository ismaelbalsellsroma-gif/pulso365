import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/ui/card';
import { mockDashboard, fmt } from '@/lib/mock-data';
import {
  DollarSign, ShoppingCart, Users, Home, CreditCard, Zap, TrendingUp, TrendingDown, Clock,
  Coffee, UtensilsCrossed, Plus,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const d = mockDashboard;

const comprasBreakdown = [
  { name: 'Bebida', value: d.compras.bebida, pct: d.compras.bebida_pct, color: 'hsl(200, 70%, 50%)' },
  { name: 'Comida', value: d.compras.comida, pct: d.compras.comida_pct, color: 'hsl(100, 56%, 40%)' },
  { name: 'Otros', value: d.compras.otros, pct: d.compras.otros_pct, color: 'hsl(40, 20%, 55%)' },
];

const costStructure = [
  { name: 'Compras', value: d.compras.total },
  { name: 'Personal', value: d.personal.total },
  { name: 'Alquiler', value: d.alquiler.total },
  { name: 'Bancos', value: d.bancos.total },
  { name: 'Suministros', value: d.suministros.total },
  { name: 'Resultado', value: d.resultado },
];

export default function DashboardPage() {
  const nav = useNavigate();
  const positivo = d.resultado >= 0;

  return (
    <div className="space-y-5">
      <PageHeader title="Panel de Control" description="Resumen del período seleccionado" />

      {d.prorrateado && (
        <div className="panel-proration-banner animate-fade-in-up">
          <Clock className="h-4 w-4 shrink-0" />
          Costes fijos proporcionales a día {d.dia_actual} de {d.dias_mes}
        </div>
      )}

      {/* Row 1: Ventas + Compras */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in-up animate-delay-1">
        {/* VENTAS */}
        <div className="panel-card panel-ventas">
          <div className="panel-card-header">
            <DollarSign className="h-5 w-5" />
            <span>Ventas</span>
          </div>
          <div className="panel-card-value">{fmt(d.ventas)}</div>
          <div className="panel-card-sub">sin IVA</div>
        </div>

        {/* COMPRAS */}
        <div className="panel-card panel-compras">
          <div className="panel-card-header">
            <ShoppingCart className="h-5 w-5" />
            <span>Compras</span>
          </div>
          <div className="panel-card-value">{fmt(d.compras.total)}</div>
          <div className="panel-card-sub">{d.compras.pct}% sobre ventas · sin IVA</div>
          <div className="mt-4 pt-3 border-t space-y-2">
            {comprasBreakdown.map(item => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  {item.name === 'Bebida' && <Coffee className="h-3.5 w-3.5 opacity-50" />}
                  {item.name === 'Comida' && <UtensilsCrossed className="h-3.5 w-3.5 opacity-50" />}
                  {item.name === 'Otros' && <Plus className="h-3.5 w-3.5 opacity-50" />}
                  {item.name}
                </span>
                <span className="font-semibold tabular-nums">
                  {fmt(item.value)} <small className="font-normal text-muted-foreground ml-1">{item.pct}%</small>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2: Fixed costs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in-up animate-delay-2">
        <div className="panel-card cursor-pointer active:scale-[0.98]" onClick={() => nav('/personal')}>
          <div className="panel-card-header">
            <Users className="h-5 w-5" />
            <span>Personal</span>
          </div>
          <div className="panel-card-value text-xl md:text-2xl">{fmt(d.personal.total)}</div>
          <div className="panel-card-sub">{d.personal.pct}% sobre ventas</div>
        </div>
        <div className="panel-card cursor-pointer active:scale-[0.98]" onClick={() => nav('/alquiler')}>
          <div className="panel-card-header">
            <Home className="h-5 w-5" />
            <span>Alquiler</span>
          </div>
          <div className="panel-card-value text-xl md:text-2xl">{fmt(d.alquiler.total)}</div>
          <div className="panel-card-sub">{d.alquiler.pct}% sobre ventas</div>
        </div>
        <div className="panel-card cursor-pointer active:scale-[0.98]" onClick={() => nav('/bancos')}>
          <div className="panel-card-header">
            <CreditCard className="h-5 w-5" />
            <span>Bancos</span>
          </div>
          <div className="panel-card-value text-xl md:text-2xl">{fmt(d.bancos.total)}</div>
          <div className="panel-card-sub">{d.bancos.pct}% sobre ventas</div>
        </div>
        <div className="panel-card cursor-pointer active:scale-[0.98]" onClick={() => nav('/suministros')}>
          <div className="panel-card-header">
            <Zap className="h-5 w-5" />
            <span>Suministros</span>
          </div>
          <div className="panel-card-value text-xl md:text-2xl">{fmt(d.suministros.total)}</div>
          <div className="panel-card-sub">{d.suministros.pct}% sobre ventas</div>
        </div>
      </div>

      {/* Resultado */}
      <div className={`panel-resultado ${positivo ? 'positivo' : 'negativo'} animate-fade-in-up animate-delay-3`}>
        <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
          {positivo ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
          Resultado
        </div>
        <p className={`text-4xl font-extrabold tabular-nums tracking-tight ${positivo ? 'text-[hsl(var(--success))]' : 'text-red-500'}`}>
          {fmt(d.resultado)}
        </p>
        <p className="text-xs text-muted-foreground mt-1">{d.resultado_pct}% margen sobre ventas</p>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in-up animate-delay-4">
        <div className="panel-card">
          <h3 className="text-sm font-semibold mb-4">Estructura de Costes</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={costStructure} layout="vertical" margin={{ left: 80 }}>
                <XAxis type="number" tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} fontSize={11} stroke="hsl(var(--muted-foreground))" />
                <YAxis type="category" dataKey="name" fontSize={11} width={70} stroke="hsl(var(--muted-foreground))" />
                <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem', fontSize: '12px' }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="panel-card">
          <h3 className="text-sm font-semibold mb-4">Desglose Compras</h3>
          <div className="h-56 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={comprasBreakdown} cx="50%" cy="50%" outerRadius={80} innerRadius={40} dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} fontSize={11}>
                  {comprasBreakdown.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
