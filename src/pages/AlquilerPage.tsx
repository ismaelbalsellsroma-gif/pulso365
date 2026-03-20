import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { fmt } from '@/lib/mock-data';

export default function AlquilerPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PageHeader title="Alquiler" description="Coste mensual de alquiler del local" />
      <Card className="p-6 max-w-xl">
        <div className="space-y-4">
          <div>
            <Label>Alquiler mensual</Label>
            <Input type="number" defaultValue="3000" className="mt-1" />
          </div>
          <div>
            <Label>Propietario</Label>
            <Input defaultValue="Inmobiliaria Centro S.L." className="mt-1" />
          </div>
          <Button className="active:scale-95">Guardar</Button>
        </div>
      </Card>
    </div>
  );
}
