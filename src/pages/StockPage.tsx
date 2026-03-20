import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { mockProductos, fmt } from '@/lib/mock-data';
import { Package, AlertTriangle } from 'lucide-react';

export default function StockPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PageHeader title="Stock" description="Control de inventario y existencias" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Package className="h-4 w-4" />
            <span className="text-xs font-medium uppercase">Total referencias</span>
          </div>
          <p className="text-2xl font-bold">{mockProductos.length}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-xs font-medium uppercase">Stock bajo</span>
          </div>
          <p className="text-2xl font-bold text-amber-600">3</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Package className="h-4 w-4" />
            <span className="text-xs font-medium uppercase">Valor estimado</span>
          </div>
          <p className="text-2xl font-bold tabular-nums">{fmt(4280)}</p>
        </Card>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead className="text-right">Precio/ud</TableHead>
              <TableHead className="text-center">Unidad</TableHead>
              <TableHead className="text-right">Última compra</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockProductos.map(p => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.nombre}</TableCell>
                <TableCell className="text-sm">{p.categoria_icon} {p.categoria_nombre}</TableCell>
                <TableCell className="text-right tabular-nums font-semibold">{fmt(p.precio_actual)}</TableCell>
                <TableCell className="text-center text-sm text-muted-foreground">{p.unidad}</TableCell>
                <TableCell className="text-right tabular-nums">{p.ultima_compra}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
