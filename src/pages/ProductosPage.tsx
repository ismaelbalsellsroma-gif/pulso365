import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { Input } from '@/components/ui/input';
import { fetchProductos, fmt } from '@/lib/queries';
import { Search, Package, AlertTriangle, TrendingUp, Pencil, Trash2 } from 'lucide-react';

export default function ProductosPage() {
  const [search, setSearch] = useState('');
  const { data: productos = [], isLoading } = useQuery({ queryKey: ['productos'], queryFn: fetchProductos });
  const filtered = productos.filter(p =>
    !search || p.nombre.toLowerCase().includes(search.toLowerCase()) || (p.referencia || '').toLowerCase().includes(search.toLowerCase())
  );

  const conCambio = productos.filter(p => p.precio_anterior && Math.abs(Number(p.precio_actual) - Number(p.precio_anterior)) > 0.001).length;

  return (
    <div className="space-y-5">
      <PageHeader title="Productos" description="Catálogo de productos creados automáticamente desde albaranes" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in-up">
        <div className="panel-card">
          <div className="panel-card-header"><Package className="h-4 w-4" /><span>Total Productos</span></div>
          <div className="panel-card-value text-2xl">{productos.length}</div>
        </div>
        <div className="panel-card">
          <div className="panel-card-header"><TrendingUp className="h-4 w-4" /><span>Con cambio precio</span></div>
          <div className="panel-card-value text-2xl">{conCambio}</div>
        </div>
        <div className="panel-card">
          <div className="panel-card-header"><AlertTriangle className="h-4 w-4" /><span>Alertas pendientes</span></div>
          <div className="panel-card-value text-2xl" style={{ color: 'hsl(var(--warning))' }}>0</div>
        </div>
      </div>

      <div className="relative max-w-md animate-fade-in-up animate-delay-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar producto o referencia..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-card" />
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground p-8 text-center">Cargando productos...</div>
      ) : (
        <div className="bg-card border rounded-lg overflow-hidden animate-fade-in-up animate-delay-2">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[hsl(var(--surface-offset))]">
                  {['Ref', 'Producto', 'Proveedor', 'Precio', 'Anterior', 'Var.', 'Última compra', 'Nº'].map(h => (
                    <th key={h} className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap ${
                      ['Precio', 'Anterior', 'Var.'].includes(h) ? 'text-right' : h === 'Nº' ? 'text-center' : 'text-left'
                    }`}>{h}</th>
                  ))}
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const actual = Number(p.precio_actual);
                  const anterior = Number(p.precio_anterior);
                  let variacion = '—';
                  let varClass = '';
                  if (anterior > 0 && Math.abs(actual - anterior) > 0.001) {
                    const pct = ((actual - anterior) / anterior * 100);
                    variacion = (pct > 0 ? '+' : '') + pct.toFixed(1) + '%';
                    varClass = pct > 0 ? 'text-[hsl(var(--error))] font-semibold' : 'text-[hsl(var(--success))] font-semibold';
                  }
                  return (
                    <tr key={p.id} className="border-t border-[hsl(var(--divider))] hover:bg-[hsl(var(--surface-offset))] transition-colors group cursor-pointer">
                      <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">{p.referencia || '—'}</td>
                      <td className="px-4 py-3 font-medium">{p.nombre}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.proveedor_nombre}</td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">{fmt(actual)}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">{anterior > 0 ? fmt(anterior) : '—'}</td>
                      <td className={`px-4 py-3 text-right tabular-nums ${varClass}`}>{variacion}</td>
                      <td className="px-4 py-3 tabular-nums whitespace-nowrap">{p.ultima_compra || '—'}</td>
                      <td className="px-4 py-3 text-center tabular-nums">{p.num_compras}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-1.5 rounded-md text-muted-foreground hover:text-primary transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                          <button className="p-1.5 rounded-md text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
