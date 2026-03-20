import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { fetchAlquiler, fmt } from '@/lib/queries';

export default function AlquilerPage() {
  const { data: alquiler = [], isLoading } = useQuery({ queryKey: ['alquiler'], queryFn: fetchAlquiler });
  const total = alquiler.filter(a => a.activo).reduce((s, a) => s + Number(a.importe_mensual || 0), 0);

  return (
    <div className="space-y-5">
      <PageHeader title="Alquiler" description="Coste mensual de alquiler del local" />

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
                {alquiler.map(a => (
                  <tr key={a.id} className="border-t border-[hsl(var(--divider))] hover:bg-[hsl(var(--surface-offset))] transition-colors">
                    <td className="px-4 py-3 font-medium">{a.concepto}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold">{fmt(Number(a.importe_mensual))}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${a.activo ? 'bg-[hsl(var(--success-highlight))] text-[hsl(var(--success))]' : 'bg-[hsl(var(--surface-offset))] text-muted-foreground'}`}>
                        {a.activo ? 'Activo' : 'Inactivo'}
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
