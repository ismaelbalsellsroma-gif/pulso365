import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DeleteDialog } from '@/components/DeleteDialog';
import { fetchBancos, fmt } from '@/lib/queries';
import { upsertBanco, deleteBanco } from '@/lib/mutations';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const emptyForm = { concepto: '', importe_mensual: 0, activo: true };

export default function BancosPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const qc = useQueryClient();
  const { data: bancos = [], isLoading } = useQuery({ queryKey: ['bancos'], queryFn: fetchBancos });
  const total = bancos.filter(b => b.activo).reduce((s, b) => s + Number(b.importe_mensual || 0), 0);

  const saveMut = useMutation({
    mutationFn: () => upsertBanco({ id: editId || undefined, ...form }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bancos'] }); setDialogOpen(false); toast.success(editId ? 'Actualizado' : 'Añadido'); },
    onError: () => toast.error('Error guardando'),
  });

  const delMut = useMutation({
    mutationFn: () => deleteBanco(deleteId!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bancos'] }); setDeleteOpen(false); toast.success('Eliminado'); },
    onError: () => toast.error('Error eliminando'),
  });

  const openNew = () => { setEditId(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (b: any) => {
    setEditId(b.id);
    setForm({ concepto: b.concepto, importe_mensual: Number(b.importe_mensual || 0), activo: b.activo ?? true });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Bancos / Créditos" description="Gestión de comisiones bancarias y préstamos">
        <Button className="gap-2 active:scale-95" onClick={openNew}><Plus className="h-4 w-4" /> Añadir</Button>
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
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Concepto</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Importe mensual</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Estado</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground w-20">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {bancos.map(b => (
                  <tr key={b.id} className="border-t border-[hsl(var(--divider))] hover:bg-[hsl(var(--surface-offset))] transition-colors">
                    <td className="px-4 py-3 font-medium">{b.concepto}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold">{fmt(Number(b.importe_mensual))}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${b.activo ? 'bg-[hsl(var(--success-highlight))] text-[hsl(var(--success))]' : 'bg-[hsl(var(--surface-offset))] text-muted-foreground'}`}>
                        {b.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-1">
                        <button onClick={() => openEdit(b)} className="p-1.5 rounded-md text-muted-foreground hover:bg-[hsl(var(--surface-offset))] hover:text-foreground transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                        <button onClick={() => { setDeleteId(b.id); setDeleteOpen(true); }} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
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
            <DialogTitle>{editId ? 'Editar' : 'Nuevo concepto'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm font-semibold">Concepto *</Label>
              <Input value={form.concepto} onChange={e => setForm(f => ({ ...f, concepto: e.target.value }))} className="mt-1.5 bg-background" maxLength={100} />
            </div>
            <div>
              <Label className="text-sm font-semibold">Importe mensual (€)</Label>
              <Input type="number" min={0} step={0.01} value={form.importe_mensual || ''} onChange={e => setForm(f => ({ ...f, importe_mensual: parseFloat(e.target.value) || 0 }))} className="mt-1.5 bg-background" />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.activo} onCheckedChange={v => setForm(f => ({ ...f, activo: v }))} />
              <Label className="text-sm">{form.activo ? 'Activo' : 'Inactivo'}</Label>
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
