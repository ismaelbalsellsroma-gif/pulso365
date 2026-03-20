import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus } from 'lucide-react';
import { fmt } from '@/lib/mock-data';

const bancos = [
  { id: 1, entidad: 'BBVA', tipo: 'TPV', cuota: 45.00, comision: 0.4 },
  { id: 2, entidad: 'Santander', tipo: 'Préstamo', cuota: 812.00, comision: 0 },
];

export default function BancosPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PageHeader title="Bancos / Créditos" description="Gestión de comisiones bancarias y préstamos">
        <Button className="gap-2 active:scale-95"><Plus className="h-4 w-4" /> Añadir</Button>
      </PageHeader>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Entidad</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Cuota mensual</TableHead>
              <TableHead className="text-right">Comisión %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bancos.map(b => (
              <TableRow key={b.id}>
                <TableCell className="font-medium">{b.entidad}</TableCell>
                <TableCell>{b.tipo}</TableCell>
                <TableCell className="text-right tabular-nums font-semibold">{fmt(b.cuota)}</TableCell>
                <TableCell className="text-right tabular-nums">{b.comision > 0 ? b.comision + '%' : '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
