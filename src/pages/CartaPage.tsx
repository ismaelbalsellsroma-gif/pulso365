import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Plus, ChefHat } from 'lucide-react';

const mockPlatos = [
  { id: 1, nombre: 'Ensalada César', familia: 'Entrantes', pvp: 12.50, coste: 3.20, margen: 74.4 },
  { id: 2, nombre: 'Solomillo a la brasa', familia: 'Carnes', pvp: 22.00, coste: 8.50, margen: 61.4 },
  { id: 3, nombre: 'Lubina al horno', familia: 'Pescados', pvp: 19.50, coste: 7.20, margen: 63.1 },
  { id: 4, nombre: 'Tiramisú casero', familia: 'Postres', pvp: 7.50, coste: 1.80, margen: 76.0 },
  { id: 5, nombre: 'Croquetas de jamón (6 ud)', familia: 'Entrantes', pvp: 9.00, coste: 2.40, margen: 73.3 },
  { id: 6, nombre: 'Entrecot de ternera', familia: 'Carnes', pvp: 24.00, coste: 10.20, margen: 57.5 },
];

export default function CartaPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Carta" description="Elaboraciones y escandallos — controla el food cost de cada plato">
        <Button className="gap-2 active:scale-95"><Plus className="h-4 w-4" /> Nueva Elaboración</Button>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in-up">
        {mockPlatos.map(p => (
          <div key={p.id} className="panel-card cursor-pointer group active:scale-[0.98]">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-[hsl(var(--primary)/0.1)] flex items-center justify-center shrink-0">
                <ChefHat className="h-5 w-5 text-[hsl(var(--primary))]" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm truncate">{p.nombre}</h3>
                <p className="text-xs text-muted-foreground">{p.familia}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-[hsl(var(--divider))]">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">PVP</p>
                <p className="font-semibold tabular-nums text-sm">{p.pvp.toFixed(2)} €</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Coste</p>
                <p className="font-semibold tabular-nums text-sm">{p.coste.toFixed(2)} €</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Margen</p>
                <p className={`font-bold tabular-nums text-sm ${
                  p.margen >= 65 ? 'text-[hsl(var(--success))]' : p.margen >= 50 ? 'text-[hsl(var(--warning))]' : 'text-[hsl(var(--error))]'
                }`}>
                  {p.margen.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
