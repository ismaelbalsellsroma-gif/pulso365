import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { fmt } from '@/lib/mock-data';
import { Plus, UserCircle } from 'lucide-react';

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
    <div className="space-y-5">
      <PageHeader title="Personal" description="Gestión de empleados y costes de personal">
        <Button className="gap-2 active:scale-95"><Plus className="h-4 w-4" /> Añadir Empleado</Button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in-up">
        <div className="panel-card">
          <div className="panel-card-header"><span>Empleados</span></div>
          <div className="panel-card-value text-2xl">{empleados.length}</div>
        </div>
        <div className="panel-card">
          <div className="panel-card-header"><span>Total Salarios</span></div>
          <div className="panel-card-value text-2xl tabular-nums">{fmt(totalSalarios)}</div>
        </div>
        <div className="panel-card">
          <div className="panel-card-header"><span>Total SS Empresa</span></div>
          <div className="panel-card-value text-2xl tabular-nums">{fmt(totalSS)}</div>
        </div>
      </div>

      <div className="bg-card border rounded-lg overflow-hidden animate-fade-in-up animate-delay-1">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[hsl(var(--surface-offset))]">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Empleado</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Puesto</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Salario</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">SS Empresa</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Coste Total</th>
              </tr>
            </thead>
            <tbody>
              {empleados.map(e => (
                <tr key={e.id} className="border-t border-[hsl(var(--divider))] hover:bg-[hsl(var(--surface-offset))] transition-colors">
                  <td className="px-4 py-3 font-medium flex items-center gap-2">
                    <UserCircle className="h-4 w-4 text-muted-foreground" /> {e.nombre}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{e.puesto}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{fmt(e.salario)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{fmt(e.ss)}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">{fmt(e.salario + e.ss)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
