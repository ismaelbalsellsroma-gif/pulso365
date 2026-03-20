import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Upload, FileText } from 'lucide-react';

export default function FacturacionPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PageHeader title="Facturación" description="Gestión y conciliación de facturas de proveedores">
        <Button className="gap-2 active:scale-95"><Upload className="h-4 w-4" /> Subir Factura</Button>
      </PageHeader>

      <Card className="p-12 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <FileText className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold mb-1">Sin facturas registradas</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Sube tus facturas de proveedores para compararlas automáticamente con los albaranes registrados.
        </p>
        <Button className="mt-4 gap-2 active:scale-95"><Upload className="h-4 w-4" /> Subir primera factura</Button>
      </Card>
    </div>
  );
}
