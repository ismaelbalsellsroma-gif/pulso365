import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { mockCategorias } from '@/lib/mock-data';
import { Plus, Pencil, Trash2 } from 'lucide-react';

export default function CategoriasPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Categorías (Compras)" description="Organiza los productos por categoría de compra">
        <Button className="gap-2 active:scale-95"><Plus className="h-4 w-4" /> Nueva Categoría</Button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-fade-in-up">
        {mockCategorias.map(cat => (
          <div key={cat.id} className="panel-card group">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-[hsl(var(--surface-offset))] flex items-center justify-center text-lg">
                  {cat.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-sm">{cat.nombre}</h3>
                  <span className={`inline-block mt-0.5 text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                    cat.tipo === 'comida' ? 'bg-[hsl(var(--success-highlight))] text-[hsl(var(--success))]'
                    : cat.tipo === 'bebida' ? 'bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))]'
                    : 'bg-[hsl(var(--surface-offset))] text-muted-foreground'
                  }`}>
                    {cat.tipo === 'comida' ? 'Comida' : cat.tipo === 'bebida' ? 'Bebida' : 'Otro'}
                  </span>
                </div>
              </div>
              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-1 rounded-md text-muted-foreground hover:bg-[hsl(var(--surface-offset))] hover:text-foreground transition-colors">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button className="p-1 rounded-md text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1">
              {cat.subcategorias.map(sub => (
                <span key={sub.id} className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border border-[hsl(var(--divider))] text-muted-foreground">
                  {sub.nombre}
                </span>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">{cat.total_productos} productos</p>
          </div>
        ))}
      </div>
    </div>
  );
}
