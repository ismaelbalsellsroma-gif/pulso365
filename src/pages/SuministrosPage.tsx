import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DeleteDialog } from '@/components/DeleteDialog';
import { fetchSuministros, fmt } from '@/lib/queries';
import { upsertSuministro, deleteSuministro } from '@/lib/mutations';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const TIPOS_SUMINISTRO = ['Luz', 'Gas', 'Agua', 'Internet', 'Telefono', 'Otro'];

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const emptyForm = { concepto: '', tipo: 'Otro', mes: currentMonth(), importe: 0 };

export default function SuministrosPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const qc = useQueryClient();
  const { data: suministros = [], isLoading } = useQuery({ queryKey: ['suministros'], queryFn: () => fetchSuministros() });
  const total = suministros.reduce((s, x) => s + Number(x.importe || 0), 0);

  const saveMut = useMutation({
    mutationFn: () => upsertSuministro({ id: editId || undefined, ...form }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['suministros'] }); setDialogOpen(false); toast.success(editId ? 'Actualizado' : 'Suministro añadido'); },
    onError: () => toast.error('Error guardando'),
  });

  const delMut = useMutation({
    mutationFn: () => deleteSuministro(deleteId!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['suministros'] }); setDeleteOpen(false); toast.success('Eliminado'); },
    onError: () => toast.error('Error eliminando'),
  });

  const openNew = () => { setEditId(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (s: any) => {
    setEditId(s.id);
    setForm({ concepto: s.concepto, tipo: s.tipo || 'Otro', mes: s.mes, importe: Number(s.importe || 0) });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Suministros" description="Costes de luz, gas, agua y telecomunicaciones">
        <Button className="gap-2 active:scale-95" onClick={openNew}><Plus className="h-4 w-4" /> Añadir Suministro</Button>
      </PageHeader>

      <div className="panel-card max-w-xs animate-fade-in-up">
        <div className="panel-card-header"><span>Total mensual</span></div>
        <div className="panel-card-value text-2xl tabular-nums">{fmt(total)}</div>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground p-8 text-center">Cargando...</div>
      ) : (
        <div className="bg-card border rounded-lg overflow-hidden animate-fade-in-up animate-delay-1">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[hsl(var(--surface-offset))]">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Suministro</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mes</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Importe</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground w-20">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {suministros.map(s => (
                  <tr key={s.id} className="border-t border-[hsl(var(--divider))] hover:bg-[hsl(var(--surface-offset))] transition-colors">
                    <td className="px-4 py-3 font-medium">{s.concepto}</td>
                    <td className="px-4 py-3 text-muted-foreground capitalize">{s.tipo}</td>
                    <td className="px-4 py-3 text-muted-foreground tabular-nums">{s.mes}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold">{fmt(Number(s.importe))}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-1">
                        <button onClick={() => openEdit(s)} className="p-1.5 rounded-md text-muted-foreground hover:bg-[hsl(var(--surface-offset))] hover:text-foreground transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                        <button onClick={() => { setDeleteId(s.id); setDeleteOpen(true); }} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editId ? 'Editar Suministro' : 'Nuevo Suministro'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm font-semibold">Concepto *</Label>
              <Input value={form.concepto} onChange={e => setForm(f => ({ ...f, concepto: e.target.value }))} className="mt-1.5 bg-background" maxLength={100} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-semibold">Tipo</Label>
                <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
                  <SelectTrigger className="mt-1.5 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_SUMINISTRO.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-semibold">Mes</Label>
                <Input type="month" value={form.mes} onChange={e => setForm(f => ({ ...f, mes: e.target.value }))} className="mt-1.5 bg-background" />
              </div>
            </div>
            <div>
              <Label className="text-sm font-semibold">Importe (€)</Label>
              <Input type="number" min={0} step={0.01} value={form.importe} onChange={e => setForm(f => ({ ...f, importe: parseFloat(e.target.value) || 0 }))} className="mt-1.5 bg-background" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => saveMut.mutate()} disabled={!form.concepto.trim() || saveMut.isPending} className="active:scale-95">
              {saveMut.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteDialog open={deleteOpen} onOpenChange={setDeleteOpen} onConfirm={() => delMut.mutate()} isPending={delMut.isPending} />
    </div>
  );
}
