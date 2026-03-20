import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { mockArqueos, fmt } from '@/lib/mock-data';
import { Upload } from 'lucide-react';

export default function ArqueoZPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PageHeader title="Arqueo Z" description="Registro diario de ventas por familia — tiquets Z">
        <Button className="gap-2 active:scale-95"><Upload className="h-4 w-4" /> Escanear Tiquet Z</Button>
      </PageHeader>

      <div className="space-y-4">
        {mockArqueos.map(arq => (
          <Card key={arq.id} className="overflow-hidden">
            <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm">{arq.fecha}</h3>
                <p className="text-xs text-muted-foreground">Arqueo Z</p>
              </div>
              <p className="text-lg font-bold tabular-nums">{fmt(arq.total_sin_iva)}</p>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Familia</TableHead>
                  <TableHead className="text-center">Unidades</TableHead>
                  <TableHead className="text-right">Importe</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {arq.familias.map(f => (
                  <TableRow key={f.nombre}>
                    <TableCell className="font-medium">{f.nombre}</TableCell>
                    <TableCell className="text-center tabular-nums">{f.unidades}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{fmt(f.importe)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        ))}
      </div>
    </div>
  );
}
