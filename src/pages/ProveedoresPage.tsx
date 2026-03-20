import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { mockProveedores, fmt } from '@/lib/mock-data';
import { Plus, Search, Phone, Mail, FileText, Pencil } from 'lucide-react';

const tipoLabels: Record<string, string> = {
  alimentacion: 'Alimentación', bebida: 'Bebida', limpieza: 'Limpieza', menaje: 'Menaje', otros: 'Otros',
};

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function ProveedoresPage() {
  const [search, setSearch] = useState('');
  const filtered = mockProveedores.filter(p => !search || p.nombre.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-5">
      <PageHeader title="Proveedores" description="Gestión de proveedores y contactos">
        <Button className="gap-2 active:scale-95"><Plus className="h-4 w-4" /> Nuevo Proveedor</Button>
      </PageHeader>

      <div className="relative max-w-md animate-fade-in-up">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar proveedor..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-card" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in-up animate-delay-1">
        {filtered.map(p => (
          <div key={p.id} className="panel-card group cursor-pointer hover:border-[hsl(var(--primary))]">
            <div className="flex items-start gap-3 mb-3">
              <div className="prov-avatar">{getInitials(p.nombre)}</div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm truncate">{p.nombre}</h3>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {p.tipos.map(t => (
                    <span key={t} className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[hsl(var(--surface-offset))] text-muted-foreground">
                      {tipoLabels[t] || t}
                    </span>
                  ))}
                </div>
              </div>
              <button className="p-1.5 rounded-md text-muted-foreground hover:bg-[hsl(var(--surface-offset))] hover:text-foreground opacity-0 group-hover:opacity-100 transition-all">
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              {p.contacto && <p>{p.contacto}</p>}
              {p.telefono && <p className="flex items-center gap-1"><Phone className="h-3 w-3" /> {p.telefono}</p>}
              {p.email && <p className="flex items-center gap-1"><Mail className="h-3 w-3" /> {p.email}</p>}
            </div>
            <div className="grid grid-cols-4 gap-3 mt-3 pt-3 border-t border-[hsl(var(--divider))]">
              <div>
                <p className="text-[10px] text-muted-foreground">CIF</p>
                <p className="text-xs font-medium tabular-nums">{p.cif}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Albaranes</p>
                <p className="text-xs font-semibold tabular-nums">{p.num_albaranes}</p>
              </div>
              <div className="col-span-2 text-right">
                <p className="text-[10px] text-muted-foreground">Total compras</p>
                <p className="text-sm font-bold tabular-nums">{fmt(p.total_compras)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
