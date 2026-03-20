import { PageHeader } from '@/components/PageHeader';
import { CheckCircle, AlertCircle, Clock } from 'lucide-react';

export default function ConciliacionPage() {
  const meses = [
    { mes: 'Marzo 2026', estado: 'en_curso', albaranes: 6, facturas: 2, diferencia: 234.50 },
    { mes: 'Febrero 2026', estado: 'ok', albaranes: 24, facturas: 24, diferencia: 0 },
    { mes: 'Enero 2026', estado: 'error', albaranes: 22, facturas: 20, diferencia: -456.80 },
  ];

  const statusIcon = (estado: string) => {
    if (estado === 'ok') return <div className="w-8 h-8 rounded-full bg-[hsl(var(--success-highlight))] flex items-center justify-center"><CheckCircle className="h-4 w-4 text-[hsl(var(--success))]" /></div>;
    if (estado === 'error') return <div className="w-8 h-8 rounded-full bg-[hsl(var(--error-highlight))] flex items-center justify-center"><AlertCircle className="h-4 w-4 text-[hsl(var(--error))]" /></div>;
    return <div className="w-8 h-8 rounded-full bg-[hsl(var(--warning-highlight))] flex items-center justify-center"><Clock className="h-4 w-4 text-[hsl(var(--warning))]" /></div>;
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Conciliación Mensual" description="Compara albaranes vs facturas por mes" />

      <div className="space-y-3 animate-fade-in-up">
        {meses.map(m => (
          <div key={m.mes} className="panel-card flex items-center gap-4 cursor-pointer active:scale-[0.99]">
            {statusIcon(m.estado)}
            <div className="flex-1">
              <h3 className="font-semibold text-sm">{m.mes}</h3>
              <p className="text-xs text-muted-foreground">{m.albaranes} albaranes · {m.facturas} facturas</p>
            </div>
            {m.diferencia !== 0 && (
              <span className={`font-bold tabular-nums text-sm ${m.diferencia > 0 ? 'text-[hsl(var(--warning))]' : 'text-[hsl(var(--error))]'}`}>
                {m.diferencia > 0 ? '+' : ''}{m.diferencia.toFixed(2)} €
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
