import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { fetchAjustes } from '@/lib/queries';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function AjustesPage() {
  const queryClient = useQueryClient();
  const { data: ajustes = [] } = useQuery({ queryKey: ['ajustes'], queryFn: fetchAjustes });

  const getVal = (clave: string) => ajustes.find(a => a.clave === clave)?.valor || '';

  const [nombre, setNombre] = useState('');
  const [cif, setCif] = useState('');
  const [direccion, setDireccion] = useState('');

  useEffect(() => {
    setNombre(getVal('nombre_restaurante'));
    setCif(getVal('cif'));
    setDireccion(getVal('direccion'));
  }, [ajustes]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const entries = [
        { clave: 'nombre_restaurante', valor: nombre },
        { clave: 'cif', valor: cif },
        { clave: 'direccion', valor: direccion },
      ];
      for (const entry of entries) {
        const { error } = await supabase
          .from('ajustes')
          .upsert(
            { clave: entry.clave, valor: entry.valor },
            { onConflict: 'clave' }
          );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ajustes'] });
      toast.success('Ajustes guardados correctamente');
    },
    onError: () => toast.error('Error guardando ajustes'),
  });

  return (
    <div className="space-y-5">
      <PageHeader title="Ajustes" description="Configuración del restaurante" />

      <div className="panel-card max-w-xl animate-fade-in-up">
        <h3 className="font-semibold mb-4">Datos del Establecimiento</h3>
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-semibold">Nombre del restaurante</Label>
            <Input value={nombre} onChange={e => setNombre(e.target.value)} className="mt-1.5 bg-background" />
          </div>
          <div>
            <Label className="text-sm font-semibold">CIF / NIF</Label>
            <Input value={cif} onChange={e => setCif(e.target.value)} className="mt-1.5 bg-background" />
          </div>
          <div>
            <Label className="text-sm font-semibold">Dirección</Label>
            <Input value={direccion} onChange={e => setDireccion(e.target.value)} className="mt-1.5 bg-background" />
          </div>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="active:scale-95">
            {saveMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </div>
      </div>
    </div>
  );
}
