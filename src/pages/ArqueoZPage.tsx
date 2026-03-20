import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { mockArqueos, fmt } from '@/lib/mock-data';
import { Upload } from 'lucide-react';

export default function ArqueoZPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Arqueo Z" description="Registro diario de ventas por familia — tiquets Z">
        <Button className="gap-2 active:scale-95"><Upload className="h-4 w-4" /> Escanear Tiquet Z</Button>
      </PageHeader>

      <div className="space-y-4 animate-fade-in-up">
        {mockArqueos.map(arq => (
          <div key={arq.id} className="panel-card !p-0 overflow-hidden">
            <div className="px-5 py-4 bg-[hsl(var(--surface-offset))] flex items-center justify-between border-b border-[hsl(var(--divider))]">
              <div>
                <h3 className="font-semibold text-sm">{arq.fecha}</h3>
                <p className="text-xs text-muted-foreground">Arqueo Z</p>
              </div>
              <p className="text-lg font-bold tabular-nums">{fmt(arq.total_sin_iva)}</p>
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
                  {arq.familias.map(f => (
                    <tr key={f.nombre} className="border-t border-[hsl(var(--divider))]">
                      <td className="px-4 py-2.5 font-medium">{f.nombre}</td>
                      <td className="px-4 py-2.5 text-center tabular-nums">{f.unidades}</td>
                      <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{fmt(f.importe)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
