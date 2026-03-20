import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export default function AjustesPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PageHeader title="Ajustes" description="Configuración del restaurante" />

      <Card className="p-6 max-w-xl">
        <h3 className="font-semibold mb-4">Datos del Establecimiento</h3>
        <div className="space-y-4">
          <div>
            <Label>Nombre del restaurante</Label>
            <Input defaultValue="Mi Restaurante" className="mt-1" />
          </div>
          <div>
            <Label>CIF / NIF</Label>
            <Input defaultValue="B12345678" className="mt-1" />
          </div>
          <div>
            <Label>Dirección</Label>
            <Input defaultValue="Calle Mayor 12, Madrid" className="mt-1" />
          </div>
          <Button className="active:scale-95">Guardar cambios</Button>
        </div>
      </Card>
    </div>
  );
}
