import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Upload, FileText } from 'lucide-react';

export default function FacturacionPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Facturación" description="Gestión y conciliación de facturas de proveedores">
        <Button className="gap-2 active:scale-95"><Upload className="h-4 w-4" /> Subir Factura</Button>
      </PageHeader>

      <div className="panel-card flex flex-col items-center text-center py-12 animate-fade-in-up">
        <div className="w-16 h-16 rounded-full bg-[hsl(var(--surface-offset))] flex items-center justify-center mb-4">
          <FileText className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold mb-1">Sin facturas registradas</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Sube tus facturas de proveedores para compararlas automáticamente con los albaranes registrados.
        </p>
        <Button className="mt-4 gap-2 active:scale-95"><Upload className="h-4 w-4" /> Subir primera factura</Button>
      </div>
    </div>
  );
}
