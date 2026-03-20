import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { mockCategorias } from '@/lib/mock-data';
import { Plus, Pencil, Trash2 } from 'lucide-react';

const tipoColors: Record<string, string> = {
  comida: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  bebida: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  otro: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

export default function CategoriasPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PageHeader title="Categorías (Compras)" description="Organiza los productos por categoría de compra">
        <Button className="gap-2 active:scale-95"><Plus className="h-4 w-4" /> Nueva Categoría</Button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {mockCategorias.map(cat => (
          <Card key={cat.id} className="p-4 hover:shadow-md transition-shadow group">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{cat.icon}</span>
                <div>
                  <h3 className="font-semibold text-sm">{cat.nombre}</h3>
                  <span className={`inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded-full ${tipoColors[cat.tipo] || tipoColors.otro}`}>
                    {cat.tipo === 'comida' ? 'Comida' : cat.tipo === 'bebida' ? 'Bebida' : 'Otro'}
                  </span>
                </div>
              </div>
              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-7 w-7 active:scale-95"><Pencil className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive active:scale-95"><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1">
              {cat.subcategorias.map(sub => (
                <Badge key={sub.id} variant="outline" className="text-[10px]">{sub.nombre}</Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">{cat.total_productos} productos</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
