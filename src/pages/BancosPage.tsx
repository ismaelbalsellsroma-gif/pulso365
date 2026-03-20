import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { fetchBancos, fmt } from '@/lib/queries';
import { Plus } from 'lucide-react';

export default function BancosPage() {
  const { data: bancos = [], isLoading } = useQuery({ queryKey: ['bancos'], queryFn: fetchBancos });
  const total = bancos.filter(b => b.activo).reduce((s, b) => s + Number(b.importe_mensual || 0), 0);

  return (
    <div className="space-y-5">
      <PageHeader title="Bancos / Créditos" description="Gestión de comisiones bancarias y préstamos">
        <Button className="gap-2 active:scale-95"><Plus className="h-4 w-4" /> Añadir</Button>
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
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Concepto</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Importe mensual</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Estado</th>
                </tr>
              </thead>
              <tbody>
                {bancos.map(b => (
                  <tr key={b.id} className="border-t border-[hsl(var(--divider))] hover:bg-[hsl(var(--surface-offset))] transition-colors">
                    <td className="px-4 py-3 font-medium">{b.concepto}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold">{fmt(Number(b.importe_mensual))}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${b.activo ? 'bg-[hsl(var(--success-highlight))] text-[hsl(var(--success))]' : 'bg-[hsl(var(--surface-offset))] text-muted-foreground'}`}>
                        {b.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
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
