import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { fetchAlbaranes, fmt } from '@/lib/queries';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, AlertCircle, Clock } from 'lucide-react';

async function fetchFacturas() {
  const { data, error } = await supabase.from('facturas_email').select('*').order('fecha_factura', { ascending: false });
  if (error) throw error;
  return data;
}

export default function ConciliacionPage() {
  const { data: albaranes = [] } = useQuery({ queryKey: ['albaranes'], queryFn: fetchAlbaranes });
  const { data: facturas = [] } = useQuery({ queryKey: ['facturas'], queryFn: fetchFacturas });

  // Group by month
  const mesesMap = new Map<string, { albaranes: number; importeAlb: number; facturas: number; importeFact: number }>();

  for (const a of albaranes) {
    const mes = a.fecha?.slice(0, 7) || 'sin-fecha';
    const entry = mesesMap.get(mes) || { albaranes: 0, importeAlb: 0, facturas: 0, importeFact: 0 };
    entry.albaranes += 1;
    entry.importeAlb += Number(a.importe) || 0;
    mesesMap.set(mes, entry);
  }

  for (const f of facturas) {
    const mes = f.fecha_factura?.slice(0, 7) || f.email_date?.slice(0, 7) || 'sin-fecha';
    const entry = mesesMap.get(mes) || { albaranes: 0, importeAlb: 0, facturas: 0, importeFact: 0 };
    entry.facturas += 1;
    entry.importeFact += Number(f.total) || 0;
    mesesMap.set(mes, entry);
  }

  const meses = [...mesesMap.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([mes, data]) => {
      const diferencia = data.importeAlb - data.importeFact;
      const estado = data.facturas === 0 ? 'en_curso' : Math.abs(diferencia) < 0.01 ? 'ok' : 'error';
      return { mes, ...data, diferencia, estado };
    });

  const mesLabel = (m: string) => {
    if (m === 'sin-fecha') return 'Sin fecha';
    const [y, mo] = m.split('-');
    const names = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    return `${names[parseInt(mo) - 1] || mo} ${y}`;
  };

  const statusIcon = (estado: string) => {
    if (estado === 'ok') return <div className="w-8 h-8 rounded-full bg-[hsl(var(--success-highlight))] flex items-center justify-center"><CheckCircle className="h-4 w-4 text-[hsl(var(--success))]" /></div>;
    if (estado === 'error') return <div className="w-8 h-8 rounded-full bg-[hsl(var(--error-highlight))] flex items-center justify-center"><AlertCircle className="h-4 w-4 text-[hsl(var(--error))]" /></div>;
    return <div className="w-8 h-8 rounded-full bg-[hsl(var(--warning-highlight))] flex items-center justify-center"><Clock className="h-4 w-4 text-[hsl(var(--warning))]" /></div>;
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Conciliación Mensual" description="Compara albaranes vs facturas por mes" />

      {meses.length === 0 ? (
        <div className="text-sm text-muted-foreground p-8 text-center">No hay datos para conciliar. Registra albaranes o facturas primero.</div>
      ) : (
        <div className="space-y-3 animate-fade-in-up">
          {meses.map(m => (
            <div key={m.mes} className="panel-card flex items-center gap-4">
              {statusIcon(m.estado)}
              <div className="flex-1">
                <h3 className="font-semibold text-sm">{mesLabel(m.mes)}</h3>
                <p className="text-xs text-muted-foreground">{m.albaranes} albaranes ({fmt(m.importeAlb)}) · {m.facturas} facturas ({fmt(m.importeFact)})</p>
              </div>
              {Math.abs(m.diferencia) > 0.01 && (
                <span className={`font-bold tabular-nums text-sm ${m.diferencia > 0 ? 'text-[hsl(var(--warning))]' : 'text-[hsl(var(--error))]'}`}>
                  {m.diferencia > 0 ? '+' : ''}{m.diferencia.toFixed(2)} €
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
