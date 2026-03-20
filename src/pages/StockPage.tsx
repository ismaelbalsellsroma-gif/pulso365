import { PageHeader } from '@/components/PageHeader';
import { mockProductos, fmt } from '@/lib/mock-data';
import { Package, AlertTriangle } from 'lucide-react';

export default function StockPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Stock" description="Control de inventario y existencias" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in-up">
        <div className="panel-card">
          <div className="panel-card-header"><Package className="h-4 w-4" /><span>Total referencias</span></div>
          <div className="panel-card-value text-2xl">{mockProductos.length}</div>
        </div>
        <div className="panel-card">
          <div className="panel-card-header"><AlertTriangle className="h-4 w-4" /><span>Stock bajo</span></div>
          <div className="panel-card-value text-2xl" style={{ color: 'hsl(var(--warning))' }}>3</div>
        </div>
        <div className="panel-card">
          <div className="panel-card-header"><Package className="h-4 w-4" /><span>Valor estimado</span></div>
          <div className="panel-card-value text-2xl tabular-nums">{fmt(4280)}</div>
        </div>
      </div>

      <div className="bg-card border rounded-lg overflow-hidden animate-fade-in-up animate-delay-1">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[hsl(var(--surface-offset))]">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Producto</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Categoría</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Precio/ud</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Unidad</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Última compra</th>
              </tr>
            </thead>
            <tbody>
              {mockProductos.map(p => (
                <tr key={p.id} className="border-t border-[hsl(var(--divider))] hover:bg-[hsl(var(--surface-offset))] transition-colors">
                  <td className="px-4 py-3 font-medium">{p.nombre}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.categoria_icon} {p.categoria_nombre}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold">{fmt(p.precio_actual)}</td>
                  <td className="px-4 py-3 text-center text-muted-foreground">{p.unidad}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{p.ultima_compra}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
