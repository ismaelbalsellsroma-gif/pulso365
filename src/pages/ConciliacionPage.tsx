import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/ui/card';
import { Activity, CheckCircle, AlertCircle, Clock } from 'lucide-react';

export default function ConciliacionPage() {
  const meses = [
    { mes: 'Marzo 2026', estado: 'en_curso', albaranes: 6, facturas: 2, diferencia: 234.50 },
    { mes: 'Febrero 2026', estado: 'ok', albaranes: 24, facturas: 24, diferencia: 0 },
    { mes: 'Enero 2026', estado: 'error', albaranes: 22, facturas: 20, diferencia: -456.80 },
  ];

  const statusIcon = (estado: string) => {
    if (estado === 'ok') return <CheckCircle className="h-5 w-5 text-green-600" />;
    if (estado === 'error') return <AlertCircle className="h-5 w-5 text-red-500" />;
    return <Clock className="h-5 w-5 text-amber-500" />;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PageHeader title="Conciliación Mensual" description="Compara albaranes vs facturas por mes" />

      <div className="space-y-3">
        {meses.map(m => (
          <Card key={m.mes} className="p-4 flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer active:scale-[0.99]">
            {statusIcon(m.estado)}
            <div className="flex-1">
              <h3 className="font-semibold text-sm">{m.mes}</h3>
              <p className="text-xs text-muted-foreground">{m.albaranes} albaranes · {m.facturas} facturas</p>
            </div>
            {m.diferencia !== 0 && (
              <span className={`font-bold tabular-nums text-sm ${m.diferencia > 0 ? 'text-amber-600' : 'text-red-500'}`}>
                {m.diferencia > 0 ? '+' : ''}{m.diferencia.toFixed(2)} €
              </span>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
