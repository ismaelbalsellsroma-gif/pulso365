import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { KpiCard } from '@/components/KpiCard';
import { Card } from '@/components/ui/card';
import { mockDashboard, fmt } from '@/lib/mock-data';
import {
  DollarSign, ShoppingCart, Users, Home, CreditCard, Zap, TrendingUp, TrendingDown, Clock,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const d = mockDashboard;

const comprasBreakdown = [
  { name: 'Bebida', value: d.compras.bebida, color: 'hsl(200, 70%, 50%)' },
  { name: 'Comida', value: d.compras.comida, color: 'hsl(100, 56%, 40%)' },
  { name: 'Otros', value: d.compras.otros, color: 'hsl(40, 20%, 55%)' },
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
    <div className="space-y-6 animate-in fade-in duration-500">
      <PageHeader title="Panel de Control" description="Resumen del período seleccionado" />

      {d.prorrateado && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
          <Clock className="h-3.5 w-3.5" />
          Costes fijos proporcionales a día {d.dia_actual} de {d.dias_mes}
        </div>
      )}

      {/* Row 1: Ventas + Compras */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <KpiCard
          title="Ventas"
          value={fmt(d.ventas)}
          subtitle="sin IVA"
          icon={<DollarSign className="h-4 w-4" />}
        />
        <KpiCard
          title="Compras"
          value={fmt(d.compras.total)}
          subtitle={`${d.compras.pct}% sobre ventas · sin IVA`}
          icon={<ShoppingCart className="h-4 w-4" />}
        >
          <div className="mt-3 space-y-1.5">
            {comprasBreakdown.map(item => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{item.name}</span>
                <span className="font-medium tabular-nums">{fmt(item.value)}</span>
              </div>
            ))}
          </div>
        </KpiCard>
      </div>

      {/* Row 2: Fixed costs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Personal" value={fmt(d.personal.total)} subtitle={`${d.personal.pct}% sobre ventas`}
          icon={<Users className="h-4 w-4" />} onClick={() => nav('/personal')} />
        <KpiCard title="Alquiler" value={fmt(d.alquiler.total)} subtitle={`${d.alquiler.pct}% sobre ventas`}
          icon={<Home className="h-4 w-4" />} onClick={() => nav('/alquiler')} />
        <KpiCard title="Bancos" value={fmt(d.bancos.total)} subtitle={`${d.bancos.pct}% sobre ventas`}
          icon={<CreditCard className="h-4 w-4" />} onClick={() => nav('/bancos')} />
        <KpiCard title="Suministros" value={fmt(d.suministros.total)} subtitle={`${d.suministros.pct}% sobre ventas`}
          icon={<Zap className="h-4 w-4" />} onClick={() => nav('/suministros')} />
      </div>

      {/* Resultado */}
      <Card className={`p-5 border-2 ${positivo ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {positivo ? <TrendingUp className="h-6 w-6 text-green-600" /> : <TrendingDown className="h-6 w-6 text-red-500" />}
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Resultado</p>
              <p className={`text-3xl font-bold tabular-nums ${positivo ? 'text-green-600' : 'text-red-500'}`}>
                {fmt(d.resultado)}
              </p>
            </div>
          </div>
          <div className={`text-right ${positivo ? 'text-green-600' : 'text-red-500'}`}>
            <p className="text-2xl font-bold tabular-nums">{d.resultado_pct}%</p>
            <p className="text-xs text-muted-foreground">margen</p>
          </div>
        </div>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="text-sm font-medium mb-3">Estructura de Costes</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={costStructure} layout="vertical" margin={{ left: 80 }}>
                <XAxis type="number" tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} fontSize={11} />
                <YAxis type="category" dataKey="name" fontSize={11} width={70} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm font-medium mb-3">Desglose Compras</h3>
          <div className="h-56 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={comprasBreakdown} cx="50%" cy="50%" outerRadius={80} innerRadius={40} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} fontSize={11}>
                  {comprasBreakdown.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => fmt(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
