import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { fetchFamilias } from '@/lib/queries';
import { Plus, Pencil } from 'lucide-react';

export default function FamiliasPage() {
  const { data: familias = [], isLoading } = useQuery({ queryKey: ['familias'], queryFn: fetchFamilias });

  return (
    <div className="space-y-5">
      <PageHeader title="Familias (Ventas)" description="Familias de venta para clasificar platos y elaboraciones">
        <Button className="gap-2 active:scale-95"><Plus className="h-4 w-4" /> Nueva Familia</Button>
      </PageHeader>

      {isLoading ? (
        <div className="text-sm text-muted-foreground p-8 text-center">Cargando familias...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in-up">
          {familias.map(f => (
            <div key={f.id} className="panel-card group cursor-pointer active:scale-[0.98]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{f.icon}</span>
                  <div>
                    <h3 className="font-semibold">{f.nombre}</h3>
                  </div>
                </div>
                <button className="p-1.5 rounded-md text-muted-foreground hover:bg-[hsl(var(--surface-offset))] hover:text-foreground opacity-0 group-hover:opacity-100 transition-all">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
