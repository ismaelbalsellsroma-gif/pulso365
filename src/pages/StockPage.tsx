import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { Input } from '@/components/ui/input';
import { fetchProductos, fmt } from '@/lib/queries';
import { Package, AlertTriangle, Search, TrendingDown, TrendingUp } from 'lucide-react';

export default function StockPage() {
  const [search, setSearch] = useState('');
  const { data: productos = [], isLoading } = useQuery({ queryKey: ['productos'], queryFn: fetchProductos });

  const filtered = productos.filter(p =>
    !search || p.nombre.toLowerCase().includes(search.toLowerCase()) || (p.proveedor_nombre || '').toLowerCase().includes(search.toLowerCase())
  );

  const valorTotal = productos.reduce((sum, p) => sum + (Number(p.precio_actual) || 0), 0);
  const conSubida = productos.filter(p => {
    const act = Number(p.precio_actual);
    const ant = Number(p.precio_anterior);
    return ant > 0 && act > ant;
  }).length;
  const conBajada = productos.filter(p => {
    const act = Number(p.precio_actual);
    const ant = Number(p.precio_anterior);
    return ant > 0 && act < ant;
  }).length;

  return (
    <div className="space-y-5">
      <PageHeader title="Stock" description="Control de inventario — precios actuales y variaciones" />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-fade-in-up">
        <div className="panel-card">
          <div className="panel-card-header"><Package className="h-4 w-4" /><span>Referencias</span></div>
          <div className="panel-card-value text-2xl">{productos.length}</div>
        </div>
        <div className="panel-card">
          <div className="panel-card-header"><TrendingUp className="h-4 w-4" /><span>Subida precio</span></div>
          <div className="panel-card-value text-2xl" style={{ color: 'hsl(var(--error))' }}>{conSubida}</div>
        </div>
        <div className="panel-card">
          <div className="panel-card-header"><TrendingDown className="h-4 w-4" /><span>Bajada precio</span></div>
          <div className="panel-card-value text-2xl" style={{ color: 'hsl(var(--success))' }}>{conBajada}</div>
        </div>
        <div className="panel-card">
          <div className="panel-card-header"><Package className="h-4 w-4" /><span>Valor catálogo</span></div>
          <div className="panel-card-value text-lg tabular-nums">{fmt(valorTotal)}</div>
        </div>
      </div>

      <div className="relative max-w-md animate-fade-in-up animate-delay-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por producto o proveedor..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-card" />
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground p-8 text-center">Cargando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-muted-foreground p-8 text-center">No hay productos.</div>
      ) : (
        <div className="bg-card border rounded-lg overflow-hidden animate-fade-in-up animate-delay-2">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[hsl(var(--surface-offset))]">
                  {['Ref', 'Producto', 'Proveedor', 'Unidad', 'Precio', 'Anterior', 'Var.', 'Última compra', 'Compras'].map(h => (
                    <th key={h} className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap ${
                      ['Precio', 'Anterior', 'Var.'].includes(h) ? 'text-right' : h === 'Compras' ? 'text-center' : 'text-left'
                    }`}>{h}</th>
                  ))}
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
                    <tr key={p.id} className="border-t border-[hsl(var(--divider))] hover:bg-[hsl(var(--surface-offset))] transition-colors">
                      <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">{p.referencia || '—'}</td>
                      <td className="px-4 py-3 font-medium">{p.nombre}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.proveedor_nombre || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.unidad}</td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">{fmt(actual)}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">{anterior > 0 ? fmt(anterior) : '—'}</td>
                      <td className={`px-4 py-3 text-right tabular-nums ${varClass}`}>{variacion}</td>
                      <td className="px-4 py-3 tabular-nums whitespace-nowrap">{p.ultima_compra || '—'}</td>
                      <td className="px-4 py-3 text-center tabular-nums">{p.num_compras}</td>
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
