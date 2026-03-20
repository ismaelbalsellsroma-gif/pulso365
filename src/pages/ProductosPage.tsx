import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { KpiCard } from '@/components/KpiCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { mockProductos, fmt } from '@/lib/mock-data';
import { Search, Package, AlertTriangle, TrendingUp } from 'lucide-react';

export default function ProductosPage() {
  const [search, setSearch] = useState('');
  const filtered = mockProductos.filter(p =>
    !search || p.nombre.toLowerCase().includes(search.toLowerCase()) || p.referencia.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PageHeader title="Productos" description="Catálogo de productos creados automáticamente desde albaranes" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard title="Total Productos" value={String(mockProductos.length)} icon={<Package className="h-4 w-4" />} />
        <KpiCard title="Con cambio precio" value="3" icon={<TrendingUp className="h-4 w-4" />} />
        <KpiCard title="Alertas pendientes" value="2" icon={<AlertTriangle className="h-4 w-4" />} className="text-amber-600" />
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar producto o referencia..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ref</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead className="text-right">Precio</TableHead>
              <TableHead className="text-right">Anterior</TableHead>
              <TableHead className="text-right">Variación</TableHead>
              <TableHead>Última compra</TableHead>
              <TableHead className="text-center">Nº</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(p => {
              let variacion = '—';
              let varClass = '';
              if (p.precio_anterior > 0 && Math.abs(p.precio_actual - p.precio_anterior) > 0.001) {
                const pct = ((p.precio_actual - p.precio_anterior) / p.precio_anterior * 100);
                variacion = (pct > 0 ? '+' : '') + pct.toFixed(1) + '%';
                varClass = pct > 0 ? 'text-red-500' : 'text-green-600';
              }
              return (
                <TableRow key={p.id} className="group cursor-pointer hover:bg-muted/50">
                  <TableCell className="text-xs text-muted-foreground tabular-nums">{p.referencia || '—'}</TableCell>
                  <TableCell className="font-medium">{p.nombre}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[10px]">{p.categoria_icon} {p.categoria_nombre}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">{p.proveedor_nombre}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{fmt(p.precio_actual)}</TableCell>
                  <TableCell className="text-right text-muted-foreground tabular-nums">{p.precio_anterior > 0 ? fmt(p.precio_anterior) : '—'}</TableCell>
                  <TableCell className={`text-right font-medium tabular-nums ${varClass}`}>{variacion}</TableCell>
                  <TableCell className="tabular-nums">{p.ultima_compra}</TableCell>
                  <TableCell className="text-center tabular-nums">{p.num_compras}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
