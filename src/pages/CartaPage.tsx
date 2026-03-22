import { useState, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DeleteDialog } from '@/components/DeleteDialog';
import { fetchPlatos, fetchFamilias, fetchProductos, fmt } from '@/lib/queries';
import { upsertPlato, deletePlato, upsertProducto } from '@/lib/mutations';
import { supabase } from '@/integrations/supabase/client';
import { calcIngredienteCoste, calcPlatoMetrics } from '@/lib/escandallo';
import { Plus, ChefHat, Search, Pencil, Trash2, Camera, Loader2, Check, ArrowLeft, Package, Percent, X, Copy, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const emptyForm = { nombre: '', familia_id: '', pvp: 0, descripcion: '', iva_porcentaje: 10 };

interface ScannedPlato { nombre: string; pvp: number; familia: string; selected: boolean; }

export default function CartaPage() {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [scanDialogOpen, setScanDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [scanning, setScanning] = useState(false);
  const [scannedPlatos, setScannedPlatos] = useState<ScannedPlato[]>([]);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Escandallo detail view
  const [detailPlatoId, setDetailPlatoId] = useState<string | null>(null);
  const [ingDialogOpen, setIngDialogOpen] = useState(false);
  const [ingForm, setIngForm] = useState({ producto_id: '', cantidad: 0, unidad: 'kg', merma_porcentaje: 0, notas: '' });
  const [editIngId, setEditIngId] = useState<string | null>(null);
  const [deleteIngOpen, setDeleteIngOpen] = useState(false);
  const [deleteIngId, setDeleteIngId] = useState<string | null>(null);
  const [ingSearch, setIngSearch] = useState('');
  const [ingStep, setIngStep] = useState<'pick' | 'details'>('pick');
  const [needsContenidoNeto, setNeedsContenidoNeto] = useState(false);
  const [contenidoNetoForm, setContenidoNetoForm] = useState({ contenido_neto: 0, contenido_unidad: 'kg' });
  const qc = useQueryClient();
  const { data: platos = [], isLoading } = useQuery({ queryKey: ['platos'], queryFn: fetchPlatos });
  const { data: familias = [] } = useQuery({ queryKey: ['familias'], queryFn: fetchFamilias });
  const { data: productos = [] } = useQuery({ queryKey: ['productos'], queryFn: fetchProductos });

  const familiaMap = Object.fromEntries(familias.map(f => [f.id, f]));
  const familiaByName = Object.fromEntries(familias.map(f => [f.nombre.toLowerCase(), f.id]));
  const productoMap = Object.fromEntries(productos.map(p => [p.id, p]));

  // ── Calculate costs for all platos ──
  const platosWithCosts = useMemo(() => {
    return platos.map(p => {
      const ings = (p as any).plato_ingredientes || [];
      let costeTotal = 0;
      const ingredientesCalc = ings.map((ing: any) => {
        const prod = ing.producto_id ? productoMap[ing.producto_id] : null;
        const calc = calcIngredienteCoste(
          { cantidad: ing.cantidad, unidad: ing.unidad, merma_porcentaje: ing.merma_porcentaje ?? 0 },
          prod ? { precio_actual: prod.precio_actual, unidad: prod.unidad, contenido_neto: prod.contenido_neto, contenido_unidad: prod.contenido_unidad } : null
        );
        costeTotal += calc.coste;
        return { ...ing, ...calc, producto: prod };
      });
      costeTotal = Math.round(costeTotal * 100) / 100;
      const pvp = Number(p.pvp) || 0;
      const ivaPct = (p as any).iva_porcentaje ?? 10;
      const metrics = calcPlatoMetrics(pvp, costeTotal, ivaPct);
      return { ...p, costeTotal, ingredientesCalc, metrics, iva_porcentaje: ivaPct };
    });
  }, [platos, productoMap]);

  const filtered = platosWithCosts.filter(p =>
    !search || p.nombre.toLowerCase().includes(search.toLowerCase())
  );

  const detailPlato = detailPlatoId ? platosWithCosts.find(p => p.id === detailPlatoId) : null;

  // ── Mutations ──
  const saveMut = useMutation({
    mutationFn: async () => {
      const pvpConIva = Number(form.pvp) || 0;
      const ivaPct = Number(form.iva_porcentaje) || 10;
      // El usuario siempre introduce PVP con IVA → convertir a sin IVA para almacenar
      const pvpSinIva = Math.round((pvpConIva / (1 + ivaPct / 100)) * 100) / 100;
      const payload: any = {
        id: editId || undefined,
        nombre: form.nombre,
        familia_id: form.familia_id || undefined,
        pvp: pvpSinIva,
        descripcion: form.descripcion,
        iva_porcentaje: ivaPct,
      };
      await upsertPlato(payload);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['platos'] }); setDialogOpen(false); toast.success(editId ? 'Plato actualizado' : 'Plato creado'); },
    onError: () => toast.error('Error guardando plato'),
  });

  const delMut = useMutation({
    mutationFn: () => deletePlato(deleteId!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['platos'] }); setDeleteOpen(false); setDetailPlatoId(null); toast.success('Plato eliminado'); },
    onError: () => toast.error('Error eliminando plato'),
  });

  // Ingrediente mutations
  const saveIngMut = useMutation({
    mutationFn: async () => {
      if (!detailPlatoId || !ingForm.producto_id) return;
      const prod = productoMap[ingForm.producto_id];
      const payload: any = {
        plato_id: detailPlatoId,
        producto_id: ingForm.producto_id,
        producto_nombre: prod?.nombre || '',
        cantidad: ingForm.cantidad,
        unidad: ingForm.unidad,
        merma_porcentaje: ingForm.merma_porcentaje,
        notas: ingForm.notas,
        coste: 0, // will be recalculated on display
      };
      if (editIngId) {
        const { error } = await supabase.from('plato_ingredientes').update(payload).eq('id', editIngId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('plato_ingredientes').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['platos'] }); setIngDialogOpen(false); toast.success(editIngId ? 'Ingrediente actualizado' : 'Ingrediente añadido'); },
    onError: () => toast.error('Error guardando ingrediente'),
  });

  const delIngMut = useMutation({
    mutationFn: async () => {
      if (!deleteIngId) return;
      const { error } = await supabase.from('plato_ingredientes').delete().eq('id', deleteIngId);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['platos'] }); setDeleteIngOpen(false); toast.success('Ingrediente eliminado'); },
    onError: () => toast.error('Error eliminando ingrediente'),
  });

  // Duplicate plato
  const duplicateMut = useMutation({
    mutationFn: async (platoId: string) => {
      const orig = platosWithCosts.find(p => p.id === platoId);
      if (!orig) return;
      const { data: newPlato, error } = await supabase.from('platos').insert({
        nombre: orig.nombre + ' (copia)',
        familia_id: orig.familia_id,
        pvp: orig.pvp,
        coste: orig.costeTotal,
        margen_pct: orig.metrics.margenPct,
        descripcion: (orig as any).descripcion || '',
        iva_porcentaje: orig.iva_porcentaje,
      }).select('id').single();
      if (error) throw error;
      // Copy ingredients
      const ings = (orig as any).plato_ingredientes || [];
      if (ings.length > 0 && newPlato) {
        const { error: ingErr } = await supabase.from('plato_ingredientes').insert(
          ings.map((i: any) => ({
            plato_id: newPlato.id,
            producto_id: i.producto_id,
            producto_nombre: i.producto_nombre,
            cantidad: i.cantidad,
            unidad: i.unidad,
            coste: i.coste,
            merma_porcentaje: i.merma_porcentaje ?? 0,
            notas: i.notas ?? '',
          }))
        );
        if (ingErr) throw ingErr;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['platos'] }); toast.success('Plato duplicado'); },
    onError: () => toast.error('Error duplicando plato'),
  });

  const openNew = () => { setEditId(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (p: any) => {
    setEditId(p.id);
    const ivaPct = p.iva_porcentaje ?? 10;
    // Convertir PVP sin IVA almacenado → PVP con IVA para mostrar en el formulario
    const pvpConIva = Math.round(Number(p.pvp || 0) * (1 + ivaPct / 100) * 100) / 100;
    setForm({ nombre: p.nombre, familia_id: p.familia_id || '', pvp: pvpConIva, descripcion: p.descripcion || '', iva_porcentaje: ivaPct });
    setDialogOpen(true);
  };
  const openDelete = (id: string) => { setDeleteId(id); setDeleteOpen(true); };

  const openAddIng = () => {
    setEditIngId(null);
    setIngForm({ producto_id: '', cantidad: 0, unidad: 'kg', merma_porcentaje: 0, notas: '' });
    setIngSearch('');
    setIngStep('pick');
    setNeedsContenidoNeto(false);
    setIngDialogOpen(true);
  };
  const openEditIng = (ing: any) => {
    setEditIngId(ing.id);
    setIngForm({ producto_id: ing.producto_id || '', cantidad: Number(ing.cantidad) || 0, unidad: ing.unidad || 'kg', merma_porcentaje: Number(ing.merma_porcentaje) || 0, notas: ing.notas || '' });
    setIngStep('details');
    setNeedsContenidoNeto(false);
    setIngDialogOpen(true);
  };

  const handlePickProduct = (prod: any) => {
    setIngForm(f => ({ ...f, producto_id: prod.id }));
    setIngSearch(prod.nombre);
    if (!prod.contenido_neto && prod.unidad !== 'ud') {
      setNeedsContenidoNeto(true);
      setContenidoNetoForm({ contenido_neto: 0, contenido_unidad: prod.unidad || 'kg' });
    } else {
      setNeedsContenidoNeto(false);
    }
    setIngStep('details');
  };

  const saveContenidoNeto = async () => {
    if (!ingForm.producto_id || contenidoNetoForm.contenido_neto <= 0) return;
    const prod = productoMap[ingForm.producto_id];
    if (!prod) return;
    try {
      await upsertProducto({
        id: ingForm.producto_id,
        nombre: prod.nombre,
        contenido_neto: contenidoNetoForm.contenido_neto,
        contenido_unidad: contenidoNetoForm.contenido_unidad,
      });
      qc.invalidateQueries({ queryKey: ['productos'] });
      setNeedsContenidoNeto(false);
      toast.success('Contenido neto guardado');
    } catch {
      toast.error('Error guardando contenido neto');
    }
  };

  // Preview cost in ingredient dialog
  const ingPreviewProd = ingForm.producto_id ? productoMap[ingForm.producto_id] : null;
  const ingPreviewCalc = ingPreviewProd ? calcIngredienteCoste(
    { cantidad: ingForm.cantidad, unidad: ingForm.unidad, merma_porcentaje: ingForm.merma_porcentaje },
    { precio_actual: ingPreviewProd.precio_actual, unidad: ingPreviewProd.unidad, contenido_neto: ingPreviewProd.contenido_neto, contenido_unidad: ingPreviewProd.contenido_unidad }
  ) : null;

  // Filtered productos for ingredient selector
  const filteredProds = productos.filter(p =>
    !ingSearch || p.nombre.toLowerCase().includes(ingSearch.toLowerCase()) || (p.referencia || '').toLowerCase().includes(ingSearch.toLowerCase())
  ).slice(0, 50);

  // ── Scan carta ──
  const handleScanFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanning(true); setScanDialogOpen(true); setScannedPlatos([]);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
      });
      const { data, error } = await supabase.functions.invoke('process-carta', {
        body: { image_base64: base64, familias_conocidas: familias.map(f => f.nombre) },
      });
      if (error) throw error;
      if (data.platos && Array.isArray(data.platos)) {
        setScannedPlatos(data.platos.map((p: any) => ({ nombre: p.nombre || '', pvp: Number(p.pvp) || 0, familia: p.familia || '', selected: true })));
        toast.success(`${data.platos.length} platos detectados`);
      } else {
        toast.error('No se encontraron platos en la imagen');
      }
    } catch (err) {
      console.error('Scan error:', err);
      toast.error('Error interpretando la carta');
    } finally {
      setScanning(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const toggleScanned = (idx: number) => {
    setScannedPlatos(prev => prev.map((p, i) => i === idx ? { ...p, selected: !p.selected } : p));
  };

  const importScanned = async () => {
    const toImport = scannedPlatos.filter(p => p.selected && p.nombre.trim());
    if (toImport.length === 0) return;
    setImporting(true);
    try {
      const defaultIva = 10;
      for (const p of toImport) {
        // Los precios escaneados vienen con IVA incluido → convertir a sin IVA
        const pvpSinIva = Math.round((p.pvp / (1 + defaultIva / 100)) * 100) / 100;
        await upsertPlato({ nombre: p.nombre, pvp: pvpSinIva, coste: 0, margen_pct: 100, iva_porcentaje: defaultIva, familia_id: familiaByName[p.familia.toLowerCase()] || undefined });
      }
      qc.invalidateQueries({ queryKey: ['platos'] });
      setScanDialogOpen(false);
      toast.success(`${toImport.length} platos importados`);
    } catch { toast.error('Error importando platos'); }
    finally { setImporting(false); }
  };

  // ── KPI summary ──
  const avgFoodCost = platosWithCosts.length > 0
    ? Math.round(platosWithCosts.reduce((s, p) => s + p.metrics.foodCost, 0) / platosWithCosts.length * 10) / 10
    : 0;
  const totalPlatos = platosWithCosts.length;

  // ══════════════════════════════════════
  //  DETAIL VIEW — escandallo of a plato
  // ══════════════════════════════════════
  if (detailPlato) {
    const { metrics, ingredientesCalc, costeTotal } = detailPlato;
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={() => setDetailPlatoId(null)} className="p-2 rounded-lg hover:bg-muted transition-colors active:scale-95">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">{detailPlato.nombre}</h1>
            <p className="text-sm text-muted-foreground">{detailPlato.familia_id ? (familiaMap[detailPlato.familia_id]?.icon || '') + ' ' + (familiaMap[detailPlato.familia_id]?.nombre || '') : 'Sin familia'}</p>
          </div>
          <div className="flex gap-1.5">
            <Button variant="outline" size="sm" className="gap-1.5 active:scale-95" onClick={() => duplicateMut.mutate(detailPlato.id)}>
              <Copy className="h-3.5 w-3.5" /> Duplicar
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 active:scale-95" onClick={() => openEdit(detailPlato)}>
              <Pencil className="h-3.5 w-3.5" /> Editar
            </Button>
          </div>
        </div>

        {/* Metrics cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 animate-fade-in-up">
          {[
            { label: 'PVP (sin IVA)', value: fmt(Number(detailPlato.pvp)), color: '' },
            { label: 'PVP con IVA', value: fmt(metrics.pvpConIva), color: '' },
            { label: 'Coste', value: fmt(costeTotal), color: '' },
            { label: 'Margen', value: `${metrics.margenPct}%`, color: metrics.margenPct >= 65 ? 'text-[hsl(var(--success))]' : metrics.margenPct >= 50 ? 'text-[hsl(var(--warning))]' : 'text-[hsl(var(--error))]' },
            { label: 'Food Cost', value: `${metrics.foodCost}%`, color: metrics.foodCost <= 33 ? 'text-[hsl(var(--success))]' : metrics.foodCost <= 40 ? 'text-[hsl(var(--warning))]' : 'text-[hsl(var(--error))]' },
          ].map(m => (
            <div key={m.label} className="panel-card text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{m.label}</p>
              <p className={`text-lg font-bold tabular-nums ${m.color}`}>{m.value}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
          <span>Multiplicador: <strong className="text-foreground">{metrics.multiplicador}×</strong></span>
          <span>·</span>
          <span>IVA: {detailPlato.iva_porcentaje}%</span>
          <span>·</span>
          <span>{ingredientesCalc.length} ingredientes</span>
        </div>

        {/* Ingredientes table */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Escandallo — Ingredientes</h2>
          <Button size="sm" className="gap-1.5 active:scale-95" onClick={openAddIng}>
            <Plus className="h-3.5 w-3.5" /> Añadir ingrediente
          </Button>
        </div>

        {ingredientesCalc.length === 0 ? (
          <div className="bg-card border rounded-lg p-8 text-center text-sm text-muted-foreground">
            Sin ingredientes. Añade productos del inventario para calcular el coste.
          </div>
        ) : (
          <div className="bg-card border rounded-lg overflow-hidden animate-fade-in-up">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[hsl(var(--surface-offset))]">
                    {['Producto', 'Cantidad', 'Merma %', 'Cant. real', 'Precio ud.', 'Coste'].map(h => (
                      <th key={h} className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap ${
                        ['Cantidad', 'Merma %', 'Cant. real', 'Precio ud.', 'Coste'].includes(h) ? 'text-right' : 'text-left'
                      }`}>{h}</th>
                    ))}
                    <th className="px-4 py-2.5 w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {ingredientesCalc.map((ing: any) => (
                    <tr key={ing.id} className="border-t border-[hsl(var(--divider))] hover:bg-[hsl(var(--surface-offset))] transition-colors group">
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-sm">{ing.producto_nombre || '—'}</p>
                        {ing.notas && <p className="text-[10px] text-muted-foreground">{ing.notas}</p>}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{Number(ing.cantidad).toFixed(3)} {ing.unidad}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{(Number(ing.merma_porcentaje) || 0) > 0 ? `${ing.merma_porcentaje}%` : '—'}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{ing.cantidad_con_merma.toFixed(3)} {ing.unidad_calculo}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{fmt(ing.precio_unitario)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-semibold">{fmt(ing.coste)}</td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEditIng(ing)} className="p-1.5 rounded-md text-muted-foreground hover:text-primary transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                          <button onClick={() => { setDeleteIngId(ing.id); setDeleteIngOpen(true); }} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-[hsl(var(--divider))] bg-[hsl(var(--surface-offset))]">
                    <td colSpan={5} className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider">Total coste</td>
                    <td className="px-4 py-2.5 text-right font-bold tabular-nums">{fmt(costeTotal)}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Ingredient add/edit dialog */}
        <Dialog open={ingDialogOpen} onOpenChange={setIngDialogOpen}>
          <DialogContent className={ingStep === 'pick' ? 'sm:max-w-2xl max-h-[85vh] flex flex-col' : 'sm:max-w-md'}>
            <DialogHeader>
              <DialogTitle>{editIngId ? 'Editar Ingrediente' : ingStep === 'pick' ? 'Seleccionar Producto' : 'Detalles del Ingrediente'}</DialogTitle>
            </DialogHeader>

            {/* STEP 1: Visual product grid picker */}
            {ingStep === 'pick' && (
              <div className="flex flex-col gap-3 flex-1 min-h-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar producto por nombre o referencia..."
                    value={ingSearch}
                    onChange={e => setIngSearch(e.target.value)}
                    className="pl-9 bg-background"
                    autoFocus
                  />
                </div>
                <div className="flex-1 overflow-y-auto min-h-0">
                  {filteredProds.length === 0 ? (
                    <div className="text-sm text-muted-foreground text-center py-12">No se encontraron productos.</div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pb-2">
                      {filteredProds.map(p => {
                        const hasContenido = p.contenido_neto && Number(p.contenido_neto) > 0;
                        const precioReal = hasContenido
                          ? (Number(p.precio_actual) / Number(p.contenido_neto))
                          : null;
                        return (
                          <button
                            key={p.id}
                            onClick={() => handlePickProduct(p)}
                            className="flex flex-col items-center gap-1.5 p-3 rounded-xl border bg-card hover:border-primary hover:bg-primary/5 transition-all active:scale-95 text-center group"
                          >
                            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                              <Package className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                            </div>
                            <p className="text-xs font-semibold leading-tight line-clamp-2 min-h-[2rem]">{p.nombre}</p>
                            <p className="text-sm font-bold tabular-nums text-primary">{fmt(Number(p.precio_actual))}<span className="text-[10px] text-muted-foreground font-normal">/{p.unidad || 'ud'}</span></p>
                            {precioReal !== null ? (
                              <p className="text-[10px] text-muted-foreground tabular-nums">
                                Real: {fmt(precioReal)}/{p.contenido_unidad}
                              </p>
                            ) : p.unidad !== 'ud' ? (
                              <p className="text-[10px] text-[hsl(var(--warning))] font-medium flex items-center gap-0.5">
                                <AlertTriangle className="h-2.5 w-2.5" /> Sin contenido neto
                              </p>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIngDialogOpen(false)}>Cancelar</Button>
                </DialogFooter>
              </div>
            )}

            {/* STEP 2: Ingredient details */}
            {ingStep === 'details' && (
              <div className="space-y-4 py-2">
                {/* Selected product badge */}
                {ingForm.producto_id && ingPreviewProd && (
                  <div className="flex items-center gap-2 bg-primary/5 px-3 py-2 rounded-lg border border-primary/20">
                    <Package className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm font-semibold truncate">{ingPreviewProd.nombre}</span>
                    <span className="text-xs text-muted-foreground tabular-nums ml-auto">{fmt(Number(ingPreviewProd.precio_actual))}/{ingPreviewProd.unidad || 'ud'}</span>
                    {!editIngId && (
                      <button onClick={() => { setIngForm(f => ({ ...f, producto_id: '' })); setIngSearch(''); setIngStep('pick'); setNeedsContenidoNeto(false); }}
                        className="p-0.5 rounded hover:bg-muted"><X className="h-3.5 w-3.5" /></button>
                    )}
                  </div>
                )}

                {/* Contenido neto warning & form */}
                {needsContenidoNeto && (
                  <div className="border-2 border-[hsl(var(--warning))] rounded-lg p-4 space-y-3 bg-[hsl(var(--warning))]/5">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-[hsl(var(--warning))] shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold">Contenido neto obligatorio</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Este producto no tiene el contenido neto definido. Indícalo para calcular el coste real.
                          Ej: una bolsa de lechuga de 2€ contiene 0.5 kg → precio real = 4€/kg.
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs font-semibold">Cantidad neta</Label>
                        <Input type="number" step="0.001" value={contenidoNetoForm.contenido_neto || ''}
                          onChange={e => setContenidoNetoForm(f => ({ ...f, contenido_neto: parseFloat(e.target.value) || 0 }))}
                          className="mt-1 bg-background" placeholder="Ej: 0.5" autoFocus />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold">Unidad</Label>
                        <Select value={contenidoNetoForm.contenido_unidad} onValueChange={v => setContenidoNetoForm(f => ({ ...f, contenido_unidad: v }))}>
                          <SelectTrigger className="mt-1 bg-background"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {['kg', 'g', 'l', 'ml'].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {contenidoNetoForm.contenido_neto > 0 && ingPreviewProd && (
                      <p className="text-xs font-medium text-center">
                        Precio real: <strong>{fmt(Number(ingPreviewProd.precio_actual) / contenidoNetoForm.contenido_neto)}/{contenidoNetoForm.contenido_unidad}</strong>
                      </p>
                    )}
                    <Button size="sm" className="w-full active:scale-95" onClick={saveContenidoNeto}
                      disabled={contenidoNetoForm.contenido_neto <= 0}>
                      Guardar contenido neto
                    </Button>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-sm font-semibold">Cantidad</Label>
                    <Input type="number" step="0.001" value={ingForm.cantidad} onChange={e => setIngForm(f => ({ ...f, cantidad: parseFloat(e.target.value) || 0 }))} className="mt-1.5 bg-background" />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">Unidad</Label>
                    <Select value={ingForm.unidad} onValueChange={v => setIngForm(f => ({ ...f, unidad: v }))}>
                      <SelectTrigger className="mt-1.5 bg-background"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['kg', 'g', 'mg', 'l', 'ml', 'ud'].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">Merma %</Label>
                    <Input type="number" step="1" value={ingForm.merma_porcentaje} onChange={e => setIngForm(f => ({ ...f, merma_porcentaje: parseFloat(e.target.value) || 0 }))} className="mt-1.5 bg-background" />
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Notas</Label>
                  <Input value={ingForm.notas} onChange={e => setIngForm(f => ({ ...f, notas: e.target.value }))} className="mt-1.5 bg-background" placeholder="Ej: pelado, fileteado..." />
                </div>
                {ingPreviewCalc && !needsContenidoNeto && (
                  <div className="bg-[hsl(var(--surface-offset))] rounded-lg p-3 text-center space-y-1">
                    <p className="text-xs text-muted-foreground">Coste estimado de este ingrediente</p>
                    <p className="text-lg font-bold tabular-nums">{fmt(ingPreviewCalc.coste)}</p>
                    {ingPreviewCalc.contenido_neto && (
                      <p className="text-[10px] text-muted-foreground">
                        Precio real: {fmt(ingPreviewCalc.precio_unitario)}/{ingPreviewCalc.unidad_calculo} (contenido neto: {ingPreviewCalc.contenido_neto} {ingPreviewCalc.unidad_calculo})
                      </p>
                    )}
                  </div>
                )}
                <DialogFooter>
                  {!editIngId && (
                    <Button variant="outline" onClick={() => { setIngForm(f => ({ ...f, producto_id: '' })); setIngSearch(''); setIngStep('pick'); setNeedsContenidoNeto(false); }}>
                      ← Cambiar producto
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => setIngDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={() => saveIngMut.mutate()}
                    disabled={!ingForm.producto_id || needsContenidoNeto || saveIngMut.isPending}
                    className="active:scale-95">
                    {saveIngMut.isPending ? 'Guardando...' : 'Guardar'}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <DeleteDialog open={deleteIngOpen} onOpenChange={setDeleteIngOpen} onConfirm={() => delIngMut.mutate()} isPending={delIngMut.isPending} title="¿Eliminar ingrediente?" description="Se eliminará este ingrediente del escandallo." />
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Editar Plato</DialogTitle></DialogHeader>
            <PlatoForm form={form} setForm={setForm} familias={familias} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={() => saveMut.mutate()} disabled={!form.nombre.trim() || saveMut.isPending} className="active:scale-95">
                {saveMut.isPending ? 'Guardando...' : 'Guardar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ══════════════════════════════════════
  //  LIST VIEW — all platos
  // ══════════════════════════════════════
  return (
    <div className="space-y-5">
      <PageHeader title="Carta" description="Elaboraciones y escandallos — controla el food cost de cada plato">
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 active:scale-95" onClick={() => fileRef.current?.click()}>
            <Camera className="h-4 w-4" /> Escanear Carta
          </Button>
          <Button className="gap-2 active:scale-95" onClick={openNew}><Plus className="h-4 w-4" /> Nueva Elaboración</Button>
        </div>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleScanFile} />
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in-up">
        <div className="panel-card">
          <div className="panel-card-header"><ChefHat className="h-4 w-4" /><span>Total Platos</span></div>
          <div className="panel-card-value text-2xl">{totalPlatos}</div>
        </div>
        <div className="panel-card">
          <div className="panel-card-header"><Percent className="h-4 w-4" /><span>Food Cost Medio</span></div>
          <div className={`panel-card-value text-2xl font-bold ${avgFoodCost <= 33 ? 'text-[hsl(var(--success))]' : avgFoodCost <= 40 ? 'text-[hsl(var(--warning))]' : 'text-[hsl(var(--error))]'}`}>{avgFoodCost}%</div>
        </div>
        <div className="panel-card">
          <div className="panel-card-header"><Package className="h-4 w-4" /><span>Sin escandallo</span></div>
          <div className="panel-card-value text-2xl text-amber-500 font-bold">{platosWithCosts.filter(p => p.ingredientesCalc.length === 0).length}</div>
        </div>
      </div>

      <div className="relative max-w-md animate-fade-in-up animate-delay-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar plato..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-card" />
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground p-8 text-center">Cargando carta...</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-muted-foreground p-8 text-center">No hay platos. Crea el primero o escanea una carta.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in-up animate-delay-2">
          {filtered.map(p => (
            <div key={p.id} className="panel-card cursor-pointer group active:scale-[0.98]" onClick={() => setDetailPlatoId(p.id)}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <ChefHat className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm truncate">{p.nombre}</h3>
                  <p className="text-xs text-muted-foreground">{p.familia_id ? (familiaMap[p.familia_id]?.icon || '') + ' ' + (familiaMap[p.familia_id]?.nombre || '') : 'Sin familia'}</p>
                </div>
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                  <button onClick={() => openEdit(p)} className="p-1.5 rounded-md text-muted-foreground hover:text-primary transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => openDelete(p.id)} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t border-[hsl(var(--divider))]">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">PVP</p>
                  <p className="font-semibold tabular-nums text-sm">{fmt(Number(p.pvp))}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Coste</p>
                  <p className="font-semibold tabular-nums text-sm">{fmt(p.costeTotal)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Margen</p>
                  <p className={`font-bold tabular-nums text-sm ${
                    p.metrics.margenPct >= 65 ? 'text-[hsl(var(--success))]' : p.metrics.margenPct >= 50 ? 'text-[hsl(var(--warning))]' : 'text-[hsl(var(--error))]'
                  }`}>{p.metrics.margenPct}%</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Food C.</p>
                  <p className={`font-bold tabular-nums text-sm ${
                    p.metrics.foodCost <= 33 ? 'text-[hsl(var(--success))]' : p.metrics.foodCost <= 40 ? 'text-[hsl(var(--warning))]' : 'text-[hsl(var(--error))]'
                  }`}>{p.metrics.foodCost}%</p>
                </div>
              </div>
              {p.ingredientesCalc.length === 0 && (
                <p className="text-[10px] text-amber-500 font-semibold mt-2">⚠ Sin ingredientes — pulsa para añadir</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* New/Edit plato dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? 'Editar Plato' : 'Nueva Elaboración'}</DialogTitle>
          </DialogHeader>
          <PlatoForm form={form} setForm={setForm} familias={familias} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => saveMut.mutate()} disabled={!form.nombre.trim() || saveMut.isPending} className="active:scale-95">
              {saveMut.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Scan results dialog */}
      <Dialog open={scanDialogOpen} onOpenChange={setScanDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Platos detectados en la carta</DialogTitle></DialogHeader>
          {scanning ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Interpretando carta con IA...</p>
            </div>
          ) : scannedPlatos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No se encontraron platos.</p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">Selecciona los platos que quieres importar. Se encontraron <strong>{scannedPlatos.length}</strong> platos.</p>
              <div className="space-y-1.5 max-h-[50vh] overflow-y-auto">
                {scannedPlatos.map((p, idx) => (
                  <div key={idx} onClick={() => toggleScanned(idx)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                      p.selected ? 'bg-primary/5 border border-primary/20' : 'bg-[hsl(var(--surface-offset))] border border-transparent opacity-50'
                    }`}>
                    <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${
                      p.selected ? 'bg-primary text-primary-foreground' : 'border border-muted-foreground/30'
                    }`}>{p.selected && <Check className="h-3 w-3" />}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.nombre}</p>
                      <p className="text-xs text-muted-foreground">{p.familia || 'Sin familia'}</p>
                    </div>
                    <p className="text-sm font-semibold tabular-nums shrink-0">{fmt(p.pvp)}</p>
                  </div>
                ))}
              </div>
            </>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setScanDialogOpen(false)}>Cancelar</Button>
            <Button onClick={importScanned} disabled={importing || scannedPlatos.filter(p => p.selected).length === 0} className="active:scale-95 gap-2">
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {importing ? 'Importando...' : `Importar ${scannedPlatos.filter(p => p.selected).length} platos`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteDialog open={deleteOpen} onOpenChange={setDeleteOpen} onConfirm={() => delMut.mutate()} isPending={delMut.isPending} title="¿Eliminar plato?" description="Se eliminará el plato y sus ingredientes." />
    </div>
  );
}

// ── Extracted plato form component ──
function PlatoForm({ form, setForm, familias }: { form: any; setForm: any; familias: any[] }) {
  return (
    <div className="space-y-4 py-2">
      <div>
        <Label className="text-sm font-semibold">Nombre *</Label>
        <Input value={form.nombre} onChange={e => setForm((f: any) => ({ ...f, nombre: e.target.value }))} className="mt-1.5 bg-background" />
      </div>
      <div>
        <Label className="text-sm font-semibold">Familia</Label>
        <Select value={form.familia_id || 'none'} onValueChange={v => setForm((f: any) => ({ ...f, familia_id: v === 'none' ? '' : v }))}>
          <SelectTrigger className="mt-1.5 bg-background"><SelectValue placeholder="Selecciona familia" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sin familia</SelectItem>
            {familias.map((f: any) => <SelectItem key={f.id} value={f.id}>{f.icon} {f.nombre}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-sm font-semibold">PVP con IVA (€)</Label>
          <Input type="number" step="0.01" value={form.pvp} onChange={e => setForm((f: any) => ({ ...f, pvp: parseFloat(e.target.value) || 0 }))} className="mt-1.5 bg-background" />
          {form.pvp > 0 && (
            <p className="text-[10px] text-muted-foreground mt-1 tabular-nums">
              Sin IVA: {(form.pvp / (1 + (form.iva_porcentaje || 10) / 100)).toFixed(2)} €
            </p>
          )}
        </div>
        <div>
          <Label className="text-sm font-semibold">% IVA</Label>
          <Input type="number" step="1" value={form.iva_porcentaje} onChange={e => setForm((f: any) => ({ ...f, iva_porcentaje: parseFloat(e.target.value) || 10 }))} className="mt-1.5 bg-background" />
        </div>
      </div>
      <div>
        <Label className="text-sm font-semibold">Descripción</Label>
        <Input value={form.descripcion} onChange={e => setForm((f: any) => ({ ...f, descripcion: e.target.value }))} className="mt-1.5 bg-background" placeholder="Descripción del plato..." />
      </div>
    </div>
  );
}
