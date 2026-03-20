import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus } from 'lucide-react';
import { fmt } from '@/lib/mock-data';

const suministros = [
  { id: 1, tipo: 'Electricidad', proveedor: 'Iberdrola', importe_mes: 680.00 },
  { id: 2, tipo: 'Gas', proveedor: 'Naturgy', importe_mes: 420.00 },
  { id: 3, tipo: 'Agua', proveedor: 'Canal Isabel II', importe_mes: 145.00 },
  { id: 4, tipo: 'Internet / Teléfono', proveedor: 'Movistar', importe_mes: 89.00 },
];

export default function SuministrosPage() {
  const total = suministros.reduce((s, x) => s + x.importe_mes, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PageHeader title="Suministros" description="Costes de luz, gas, agua y telecomunicaciones">
        <Button className="gap-2 active:scale-95"><Plus className="h-4 w-4" /> Añadir Suministro</Button>
      </PageHeader>

      <Card className="p-4 max-w-xs">
        <p className="text-xs text-muted-foreground uppercase">Total mensual</p>
        <p className="text-2xl font-bold tabular-nums">{fmt(total)}</p>
      </Card>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Suministro</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead className="text-right">Importe mensual</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suministros.map(s => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.tipo}</TableCell>
                <TableCell>{s.proveedor}</TableCell>
                <TableCell className="text-right tabular-nums font-semibold">{fmt(s.importe_mes)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
