import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function AlquilerPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Alquiler" description="Coste mensual de alquiler del local" />
      <div className="panel-card max-w-xl animate-fade-in-up">
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-semibold">Alquiler mensual</Label>
            <Input type="number" defaultValue="3000" className="mt-1.5 bg-background" />
          </div>
          <div>
            <Label className="text-sm font-semibold">Propietario</Label>
            <Input defaultValue="Inmobiliaria Centro S.L." className="mt-1.5 bg-background" />
          </div>
          <Button className="active:scale-95">Guardar</Button>
        </div>
      </div>
    </div>
  );
}
