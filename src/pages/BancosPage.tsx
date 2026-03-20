import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { fmt } from '@/lib/mock-data';

const bancos = [
  { id: 1, entidad: 'BBVA', tipo: 'TPV', cuota: 45.00, comision: 0.4 },
  { id: 2, entidad: 'Santander', tipo: 'Préstamo', cuota: 812.00, comision: 0 },
];

export default function BancosPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Bancos / Créditos" description="Gestión de comisiones bancarias y préstamos">
        <Button className="gap-2 active:scale-95"><Plus className="h-4 w-4" /> Añadir</Button>
      </PageHeader>

      <div className="bg-card border rounded-lg overflow-hidden animate-fade-in-up">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[hsl(var(--surface-offset))]">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Entidad</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tipo</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cuota mensual</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Comisión %</th>
              </tr>
            </thead>
            <tbody>
              {bancos.map(b => (
                <tr key={b.id} className="border-t border-[hsl(var(--divider))] hover:bg-[hsl(var(--surface-offset))] transition-colors">
                  <td className="px-4 py-3 font-medium">{b.entidad}</td>
                  <td className="px-4 py-3 text-muted-foreground">{b.tipo}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold">{fmt(b.cuota)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{b.comision > 0 ? b.comision + '%' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
