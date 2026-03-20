import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { mockFamilias, fmt } from '@/lib/mock-data';
import { Plus, Pencil } from 'lucide-react';

export default function FamiliasPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PageHeader title="Familias (Ventas)" description="Familias de venta para clasificar platos y elaboraciones">
        <Button className="gap-2 active:scale-95"><Plus className="h-4 w-4" /> Nueva Familia</Button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {mockFamilias.map(f => (
          <Card key={f.id} className="p-5 hover:shadow-md transition-shadow group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{f.icon}</span>
                <div>
                  <h3 className="font-semibold">{f.nombre}</h3>
                  <p className="text-xs text-muted-foreground">{f.num_platos} platos</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity active:scale-95">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="mt-4 pt-3 border-t flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Ventas del mes</span>
              <span className="font-bold tabular-nums text-sm">{fmt(f.ventas_mes)}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
