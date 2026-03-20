import { Badge } from '@/components/ui/badge';

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  procesado: { label: 'Procesado', variant: 'default' },
  pendiente: { label: 'Pendiente', variant: 'secondary' },
  pendiente_verificacion: { label: 'Verificar', variant: 'outline' },
  procesando: { label: 'Procesando…', variant: 'secondary' },
  rechazado: { label: 'Rechazado', variant: 'destructive' },
  revisar: { label: 'Revisar', variant: 'outline' },
  error: { label: 'Error', variant: 'destructive' },
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || { label: status, variant: 'secondary' as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
