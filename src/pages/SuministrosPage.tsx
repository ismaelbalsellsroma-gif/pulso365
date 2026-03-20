import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { fetchSuministros, fmt } from '@/lib/queries';
import { Plus } from 'lucide-react';

export default function SuministrosPage() {
  const { data: suministros = [], isLoading } = useQuery({ queryKey: ['suministros'], queryFn: () => fetchSuministros() });
  const total = suministros.reduce((s, x) => s + Number(x.importe || 0), 0);

  return (
    <div className="space-y-5">
      <PageHeader title="Suministros" description="Costes de luz, gas, agua y telecomunicaciones">
        <Button className="gap-2 active:scale-95"><Plus className="h-4 w-4" /> Añadir Suministro</Button>
      </PageHeader>

      <div className="panel-card max-w-xs animate-fade-in-up">
        <div className="panel-card-header"><span>Total mensual</span></div>
        <div className="panel-card-value text-2xl tabular-nums">{fmt(total)}</div>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground p-8 text-center">Cargando...</div>
      ) : (
        <div className="bg-card border rounded-lg overflow-hidden animate-fade-in-up animate-delay-1">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[hsl(var(--surface-offset))]">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Suministro</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mes</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Importe</th>
                </tr>
              </thead>
              <tbody>
                {suministros.map(s => (
                  <tr key={s.id} className="border-t border-[hsl(var(--divider))] hover:bg-[hsl(var(--surface-offset))] transition-colors">
                    <td className="px-4 py-3 font-medium">{s.concepto}</td>
                    <td className="px-4 py-3 text-muted-foreground capitalize">{s.tipo}</td>
                    <td className="px-4 py-3 text-muted-foreground tabular-nums">{s.mes}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold">{fmt(Number(s.importe))}</td>
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
