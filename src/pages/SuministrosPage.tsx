import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { fmt } from '@/lib/mock-data';

const suministros = [
  { id: 1, tipo: 'Electricidad', proveedor: 'Iberdrola', importe_mes: 680.00 },
  { id: 2, tipo: 'Gas', proveedor: 'Naturgy', importe_mes: 420.00 },
  { id: 3, tipo: 'Agua', proveedor: 'Canal Isabel II', importe_mes: 145.00 },
  { id: 4, tipo: 'Internet / Teléfono', proveedor: 'Movistar', importe_mes: 89.00 },
];

export default function SuministrosPage() {
  const total = suministros.reduce((s, x) => s + x.importe_mes, 0);

  return (
    <div className="space-y-5">
      <PageHeader title="Suministros" description="Costes de luz, gas, agua y telecomunicaciones">
        <Button className="gap-2 active:scale-95"><Plus className="h-4 w-4" /> Añadir Suministro</Button>
      </PageHeader>

      <div className="panel-card max-w-xs animate-fade-in-up">
        <div className="panel-card-header"><span>Total mensual</span></div>
        <div className="panel-card-value text-2xl tabular-nums">{fmt(total)}</div>
      </div>

      <div className="bg-card border rounded-lg overflow-hidden animate-fade-in-up animate-delay-1">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[hsl(var(--surface-offset))]">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Suministro</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Proveedor</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Importe mensual</th>
              </tr>
            </thead>
            <tbody>
              {suministros.map(s => (
                <tr key={s.id} className="border-t border-[hsl(var(--divider))] hover:bg-[hsl(var(--surface-offset))] transition-colors">
                  <td className="px-4 py-3 font-medium">{s.tipo}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.proveedor}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold">{fmt(s.importe_mes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
