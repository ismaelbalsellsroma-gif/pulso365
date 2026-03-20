import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function AjustesPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Ajustes" description="Configuración del restaurante" />

      <div className="panel-card max-w-xl animate-fade-in-up">
        <h3 className="font-semibold mb-4">Datos del Establecimiento</h3>
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-semibold">Nombre del restaurante</Label>
            <Input defaultValue="Mi Restaurante" className="mt-1.5 bg-background" />
          </div>
          <div>
            <Label className="text-sm font-semibold">CIF / NIF</Label>
            <Input defaultValue="B12345678" className="mt-1.5 bg-background" />
          </div>
          <div>
            <Label className="text-sm font-semibold">Dirección</Label>
            <Input defaultValue="Calle Mayor 12, Madrid" className="mt-1.5 bg-background" />
          </div>
          <Button className="active:scale-95">Guardar cambios</Button>
        </div>
      </div>
    </div>
  );
}
