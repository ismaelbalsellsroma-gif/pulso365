import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { fetchArqueos, fmt } from '@/lib/queries';
import { Upload } from 'lucide-react';

export default function ArqueoZPage() {
  const { data: arqueos = [], isLoading } = useQuery({ queryKey: ['arqueos'], queryFn: fetchArqueos });

  return (
    <div className="space-y-5">
      <PageHeader title="Arqueo Z" description="Registro diario de ventas por familia — tiquets Z">
        <Button className="gap-2 active:scale-95"><Upload className="h-4 w-4" /> Escanear Tiquet Z</Button>
      </PageHeader>

      {isLoading ? (
        <div className="text-sm text-muted-foreground p-8 text-center">Cargando arqueos...</div>
      ) : (
        <div className="space-y-4 animate-fade-in-up">
          {arqueos.map(arq => (
            <div key={arq.id} className="panel-card !p-0 overflow-hidden">
              <div className="px-5 py-4 bg-[hsl(var(--surface-offset))] flex items-center justify-between border-b border-[hsl(var(--divider))]">
                <div>
                  <h3 className="font-semibold text-sm">{arq.fecha}</h3>
                  <p className="text-xs text-muted-foreground">Arqueo Z</p>
                </div>
                <p className="text-lg font-bold tabular-nums">{fmt(Number(arq.total_sin_iva))}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[hsl(var(--surface-offset))]">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Familia</th>
                      <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Unidades</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Importe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(arq.arqueo_familias || []).map((f: any) => (
                      <tr key={f.id} className="border-t border-[hsl(var(--divider))]">
                        <td className="px-4 py-2.5 font-medium">{f.familia_nombre}</td>
                        <td className="px-4 py-2.5 text-center tabular-nums">{f.unidades}</td>
                        <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{fmt(Number(f.importe))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
