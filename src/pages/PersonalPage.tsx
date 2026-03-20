import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, UserCircle } from 'lucide-react';
import { fmt } from '@/lib/mock-data';

const empleados = [
  { id: 1, nombre: 'Ana García', puesto: 'Jefa de sala', salario: 1850, ss: 520 },
  { id: 2, nombre: 'Carlos Ruiz', puesto: 'Cocinero', salario: 1700, ss: 480 },
  { id: 3, nombre: 'María López', puesto: 'Camarera', salario: 1400, ss: 395 },
  { id: 4, nombre: 'Pedro Martín', puesto: 'Ayudante cocina', salario: 1300, ss: 367 },
];

export default function PersonalPage() {
  const totalSalarios = empleados.reduce((s, e) => s + e.salario, 0);
  const totalSS = empleados.reduce((s, e) => s + e.ss, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PageHeader title="Personal" description="Gestión de empleados y costes de personal">
        <Button className="gap-2 active:scale-95"><Plus className="h-4 w-4" /> Añadir Empleado</Button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase">Empleados</p>
          <p className="text-2xl font-bold">{empleados.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase">Total Salarios</p>
          <p className="text-2xl font-bold tabular-nums">{fmt(totalSalarios)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase">Total SS Empresa</p>
          <p className="text-2xl font-bold tabular-nums">{fmt(totalSS)}</p>
        </Card>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empleado</TableHead>
              <TableHead>Puesto</TableHead>
              <TableHead className="text-right">Salario</TableHead>
              <TableHead className="text-right">SS Empresa</TableHead>
              <TableHead className="text-right">Coste Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {empleados.map(e => (
              <TableRow key={e.id}>
                <TableCell className="font-medium flex items-center gap-2">
                  <UserCircle className="h-4 w-4 text-muted-foreground" /> {e.nombre}
                </TableCell>
                <TableCell>{e.puesto}</TableCell>
                <TableCell className="text-right tabular-nums">{fmt(e.salario)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmt(e.ss)}</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">{fmt(e.salario + e.ss)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
