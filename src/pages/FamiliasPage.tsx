import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { mockFamilias, fmt } from '@/lib/mock-data';
import { Plus, Pencil } from 'lucide-react';

export default function FamiliasPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Familias (Ventas)" description="Familias de venta para clasificar platos y elaboraciones">
        <Button className="gap-2 active:scale-95"><Plus className="h-4 w-4" /> Nueva Familia</Button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in-up">
        {mockFamilias.map(f => (
          <div key={f.id} className="panel-card group cursor-pointer active:scale-[0.98]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{f.icon}</span>
                <div>
                  <h3 className="font-semibold">{f.nombre}</h3>
                  <p className="text-xs text-muted-foreground">{f.num_platos} platos</p>
                </div>
              </div>
              <button className="p-1.5 rounded-md text-muted-foreground hover:bg-[hsl(var(--surface-offset))] hover:text-foreground opacity-0 group-hover:opacity-100 transition-all">
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="mt-4 pt-3 border-t border-[hsl(var(--divider))] flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Ventas del mes</span>
              <span className="font-bold tabular-nums text-sm">{fmt(f.ventas_mes)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
