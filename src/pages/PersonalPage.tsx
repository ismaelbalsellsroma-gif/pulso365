import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { fetchPersonal, fmt } from '@/lib/queries';
import { Plus, UserCircle } from 'lucide-react';

export default function PersonalPage() {
  const { data: personal = [], isLoading } = useQuery({ queryKey: ['personal'], queryFn: fetchPersonal });
  const activos = personal.filter(e => e.activo);
  const totalCoste = activos.reduce((s, e) => s + Number(e.coste_mensual || 0), 0);

  return (
    <div className="space-y-5">
      <PageHeader title="Personal" description="Gestión de empleados y costes de personal">
        <Button className="gap-2 active:scale-95"><Plus className="h-4 w-4" /> Añadir Empleado</Button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in-up">
        <div className="panel-card">
          <div className="panel-card-header"><span>Empleados activos</span></div>
          <div className="panel-card-value text-2xl">{activos.length}</div>
        </div>
        <div className="panel-card">
          <div className="panel-card-header"><span>Coste mensual total</span></div>
          <div className="panel-card-value text-2xl tabular-nums">{fmt(totalCoste)}</div>
        </div>
        <div className="panel-card">
          <div className="panel-card-header"><span>Total plantilla</span></div>
          <div className="panel-card-value text-2xl">{personal.length}</div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground p-8 text-center">Cargando personal...</div>
      ) : (
        <div className="bg-card border rounded-lg overflow-hidden animate-fade-in-up animate-delay-1">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[hsl(var(--surface-offset))]">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Empleado</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">DNI</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Coste mensual</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Estado</th>
                </tr>
              </thead>
              <tbody>
                {personal.map(e => (
                  <tr key={e.id} className="border-t border-[hsl(var(--divider))] hover:bg-[hsl(var(--surface-offset))] transition-colors">
                    <td className="px-4 py-3 font-medium flex items-center gap-2">
                      <UserCircle className="h-4 w-4 text-muted-foreground" /> {e.nombre}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground tabular-nums">{e.dni || '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">{fmt(Number(e.coste_mensual))}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${e.activo ? 'bg-[hsl(var(--success-highlight))] text-[hsl(var(--success))]' : 'bg-[hsl(var(--surface-offset))] text-muted-foreground'}`}>
                        {e.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
