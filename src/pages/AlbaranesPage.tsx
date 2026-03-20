import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { mockAlbaranes, fmt } from '@/lib/mock-data';
import { Upload, Search, Eye, Pencil, Trash2, Image, CheckSquare } from 'lucide-react';

const statusMap: Record<string, { label: string; className: string }> = {
  procesado: { label: 'Procesado', className: 'status-procesado' },
  pendiente: { label: 'Pendiente', className: 'status-pendiente' },
  pendiente_verificacion: { label: 'Verificar', className: 'status-verificar' },
  procesando: { label: 'Procesando…', className: 'status-pendiente' },
  rechazado: { label: 'Rechazado', className: 'status-error' },
  revisar: { label: 'Revisar', className: 'status-error' },
  error: { label: 'Error', className: 'status-error' },
};

export default function AlbaranesPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');

  const filtered = mockAlbaranes.filter(a => {
    const matchSearch = !search || a.proveedor_nombre.toLowerCase().includes(search.toLowerCase()) || (a.numero || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'todos' || a.estado === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-5">
      <PageHeader title="Albaranes" description="Gestión de albaranes y notas de entrega">
        <Button className="gap-2 active:scale-95">
          <Upload className="h-4 w-4" /> <span className="hidden sm:inline">Escanear Albarán</span>
        </Button>
      </PageHeader>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 animate-fade-in-up">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por proveedor o número..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-card" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px] bg-card">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="procesado">Procesado</SelectItem>
            <SelectItem value="pendiente">Pendiente</SelectItem>
            <SelectItem value="pendiente_verificacion">Verificar</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-card border rounded-lg overflow-hidden animate-fade-in-up animate-delay-1">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[hsl(var(--surface-offset))]">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fecha</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Número</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Proveedor</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Categorías</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Importe</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Estado</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground">No se encontraron albaranes</td>
                </tr>
              ) : filtered.map(a => {
                const st = statusMap[a.estado] || { label: a.estado, className: 'status-pendiente' };
                return (
                  <tr key={a.id} className="border-t border-[hsl(var(--divider))] hover:bg-[hsl(var(--surface-offset))] transition-colors group">
                    <td className="px-4 py-3 tabular-nums whitespace-nowrap">{a.fecha}</td>
                    <td className="px-4 py-3 font-medium whitespace-nowrap">{a.numero || '—'}</td>
                    <td className="px-4 py-3">{a.proveedor_nombre}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {a.categorias.map(c => (
                          <span key={c} className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[hsl(var(--surface-offset))] text-muted-foreground">
                            {c}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums whitespace-nowrap">{fmt(a.importe)}</td>
                    <td className="px-4 py-3"><span className={st.className}>{st.label}</span></td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {a.tiene_imagen && (
                          <button className="p-1.5 rounded-md text-muted-foreground hover:bg-[hsl(var(--surface-offset))] hover:text-foreground transition-colors">
                            <Image className="h-4 w-4" />
                          </button>
                        )}
                        {(a.estado === 'pendiente_verificacion' || a.estado === 'revisar') ? (
                          <button className="p-1.5 rounded-md text-muted-foreground hover:bg-[hsl(var(--surface-offset))] hover:text-foreground transition-colors">
                            <CheckSquare className="h-4 w-4" />
                          </button>
                        ) : (
                          <button className="p-1.5 rounded-md text-muted-foreground hover:bg-[hsl(var(--surface-offset))] hover:text-foreground transition-colors">
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                        <button className="p-1.5 rounded-md text-muted-foreground hover:bg-[hsl(var(--surface-offset))] hover:text-foreground transition-colors">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button className="p-1.5 rounded-md text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
