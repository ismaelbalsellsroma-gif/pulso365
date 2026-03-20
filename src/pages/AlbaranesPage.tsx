import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { mockAlbaranes, fmt } from '@/lib/mock-data';
import { Upload, Search, Eye, Pencil, Trash2 } from 'lucide-react';

export default function AlbaranesPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');

  const filtered = mockAlbaranes.filter(a => {
    const matchSearch = !search || a.proveedor_nombre.toLowerCase().includes(search.toLowerCase()) || (a.numero || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'todos' || a.estado === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PageHeader title="Albaranes" description="Gestión de albaranes y notas de entrega">
        <Button className="gap-2 active:scale-95">
          <Upload className="h-4 w-4" /> Escanear Albarán
        </Button>
      </PageHeader>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por proveedor o número..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
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

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Número</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead>Categorías</TableHead>
              <TableHead className="text-right">Importe</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  No se encontraron albaranes
                </TableCell>
              </TableRow>
            ) : filtered.map(a => (
              <TableRow key={a.id} className="group">
                <TableCell className="tabular-nums">{a.fecha}</TableCell>
                <TableCell className="font-medium">{a.numero || '—'}</TableCell>
                <TableCell>{a.proveedor_nombre}</TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {a.categorias.map(c => <Badge key={c} variant="secondary" className="text-[10px]">{c}</Badge>)}
                  </div>
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">{fmt(a.importe)}</TableCell>
                <TableCell><StatusBadge status={a.estado} /></TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-7 w-7 active:scale-95"><Eye className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 active:scale-95"><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive active:scale-95"><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
