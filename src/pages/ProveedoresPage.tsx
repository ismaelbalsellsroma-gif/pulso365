import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { mockProveedores, fmt } from '@/lib/mock-data';
import { Plus, Search, Phone, Mail, FileText, Pencil } from 'lucide-react';

const tipoLabels: Record<string, string> = {
  alimentacion: 'Alimentación', bebida: 'Bebida', limpieza: 'Limpieza', menaje: 'Menaje', otros: 'Otros',
};

export default function ProveedoresPage() {
  const [search, setSearch] = useState('');
  const filtered = mockProveedores.filter(p => !search || p.nombre.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PageHeader title="Proveedores" description="Gestión de proveedores y contactos">
        <Button className="gap-2 active:scale-95"><Plus className="h-4 w-4" /> Nuevo Proveedor</Button>
      </PageHeader>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar proveedor..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(p => (
          <Card key={p.id} className="p-4 hover:shadow-md transition-shadow group">
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-semibold text-sm">{p.nombre}</h3>
              <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity active:scale-95">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="flex gap-1 mb-3 flex-wrap">
              {p.tipos.map(t => (
                <Badge key={t} variant="secondary" className="text-[10px]">{tipoLabels[t] || t}</Badge>
              ))}
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              {p.contacto && <p>{p.contacto}</p>}
              {p.telefono && <p className="flex items-center gap-1"><Phone className="h-3 w-3" /> {p.telefono}</p>}
              {p.email && <p className="flex items-center gap-1"><Mail className="h-3 w-3" /> {p.email}</p>}
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t text-xs">
              <span className="flex items-center gap-1 text-muted-foreground"><FileText className="h-3 w-3" /> {p.num_albaranes} albaranes</span>
              <span className="font-semibold tabular-nums">{fmt(p.total_compras)}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
