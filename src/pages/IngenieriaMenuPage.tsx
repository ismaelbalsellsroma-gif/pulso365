import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { fmt } from '@/lib/queries';
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ZAxis } from 'recharts';
import { Star, Loader2 } from 'lucide-react';

async function fetchPlatos() {
  const { data, error } = await supabase.from('platos').select('*, plato_ingredientes(*)').order('nombre');
  if (error) throw error;
  return data;
}
async function fetchArqueos() {
  const { data, error } = await supabase.from('arqueos_z').select('*, arqueo_familias(*)').order('fecha', { ascending: false });
  if (error) throw error;
  return data;
}
async function fetchFamilias() {
  const { data, error } = await supabase.from('familias').select('*');
  if (error) throw error;
  return data;
}

type Clasificacion = 'estrella' | 'caballo' | 'puzzle' | 'perro';

const CLASIF_COLORS: Record<Clasificacion, string> = {
  estrella: 'hsl(100, 56%, 31%)',
  caballo: 'hsl(200, 100%, 29%)',
  puzzle: 'hsl(24, 70%, 34%)',
  perro: 'hsl(320, 56%, 41%)',
};
const CLASIF_EMOJI: Record<Clasificacion, string> = {
  estrella: '⭐',
  caballo: '🐴',
  puzzle: '🧩',
  perro: '🐕',
};
const CLASIF_LABELS: Record<Clasificacion, string> = {
  estrella: 'Estrella',
  caballo: 'Caballo de trabajo',
  puzzle: 'Puzzle',
  perro: 'Perro',
};
const ACCIONES: Record<Clasificacion, string> = {
  estrella: 'Mantener en posición destacada. No tocar precio ni receta.',
  caballo: 'Se vende mucho pero deja poco margen. Subir precio 5-10%, reducir porción o sustituir ingrediente caro.',
  puzzle: 'Buen margen pero se vende poco. Mejor posición en carta, foto destacada, que el camarero lo recomiende.',
  perro: 'No se vende y no deja margen. Eliminar de la carta o reinventar con ingredientes más baratos.',
};

export default function IngenieriaMenuPage() {
  const qc = useQueryClient();
  const { data: platos = [] } = useQuery({ queryKey: ['platos'], queryFn: fetchPlatos });
  const { data: arqueos = [] } = useQuery({ queryKey: ['arqueos-all-im'], queryFn: fetchArqueos });
  const { data: familias = [] } = useQuery({ queryKey: ['familias'], queryFn: fetchFamilias });
  const [periodo, setPeriodo] = useState('mes');
  const [filtroClasif, setFiltroClasif] = useState<string>('todas');
  const [analyzing, setAnalyzing] = useState(false);

  // Filter arqueos by period
  const arqueosFiltered = useMemo(() => {
    const now = new Date();
    return arqueos.filter(a => {
      const d = new Date(a.fecha);
      const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
      if (periodo === 'semana') return diffDays <= 7;
      if (periodo === 'mes') return diffDays <= 30;
      if (periodo === 'trimestre') return diffDays <= 90;
      return true;
    });
  }, [arqueos, periodo]);

  // ─── Analysis ───
  const analysis = useMemo(() => {
    if (platos.length === 0 || arqueosFiltered.length === 0) return [];

    // Aggregate units sold per familia
    const familyUnits: Record<string, number> = {};
    for (const a of arqueosFiltered) {
      for (const af of (a.arqueo_familias || [])) {
        familyUnits[af.familia_nombre] = (familyUnits[af.familia_nombre] || 0) + Number(af.unidades || 0);
      }
    }

    // Distribute units to platos (equal distribution within family)
    const platoResults: {
      id: string; nombre: string; familia: string;
      unidades: number; pvp: number; coste: number;
      ingresos: number; margen: number; foodCostPct: number; margenTotal: number;
      popularidad: 'alta' | 'baja'; rentabilidad: 'alta' | 'baja';
      clasificacion: Clasificacion; accion: string;
    }[] = [];

    for (const plato of platos) {
      const fam = familias.find(f => f.id === plato.familia_id);
      if (!fam) continue;
      const totalUnits = familyUnits[fam.nombre] || 0;
      const platosInFamily = platos.filter(p => p.familia_id === fam.id).length;
      const unidades = platosInFamily > 0 ? totalUnits / platosInFamily : 0;

      const pvp = Number(plato.pvp || 0);
      const coste = Number(plato.coste || 0);
      const margen = pvp - coste;
      const foodCostPct = pvp > 0 ? (coste / pvp) * 100 : 0;
      const ingresos = pvp * unidades;
      const margenTotal = margen * unidades;

      platoResults.push({
        id: plato.id, nombre: plato.nombre, familia: fam.nombre,
        unidades, pvp, coste, ingresos, margen, foodCostPct, margenTotal,
        popularidad: 'baja', rentabilidad: 'baja',
        clasificacion: 'perro', accion: '',
      });
    }

    if (platoResults.length === 0) return [];

    // Calculate thresholds
    const avgUnits = platoResults.reduce((s, p) => s + p.unidades, 0) / platoResults.length;
    const avgMargin = platoResults.reduce((s, p) => s + p.margen, 0) / platoResults.length;

    for (const p of platoResults) {
      p.popularidad = p.unidades >= avgUnits * 0.7 ? 'alta' : 'baja';
      p.rentabilidad = p.margen >= avgMargin ? 'alta' : 'baja';

      if (p.popularidad === 'alta' && p.rentabilidad === 'alta') p.clasificacion = 'estrella';
      else if (p.popularidad === 'alta' && p.rentabilidad === 'baja') p.clasificacion = 'caballo';
      else if (p.popularidad === 'baja' && p.rentabilidad === 'alta') p.clasificacion = 'puzzle';
      else p.clasificacion = 'perro';

      p.accion = ACCIONES[p.clasificacion];
    }

    return platoResults;
  }, [platos, arqueosFiltered, familias]);

  const filtered = filtroClasif === 'todas' ? analysis : analysis.filter(a => a.clasificacion === filtroClasif);

  const counts = {
    estrella: analysis.filter(a => a.clasificacion === 'estrella').length,
    caballo: analysis.filter(a => a.clasificacion === 'caballo').length,
    puzzle: analysis.filter(a => a.clasificacion === 'puzzle').length,
    perro: analysis.filter(a => a.clasificacion === 'perro').length,
  };

  const margenMedio = analysis.length > 0
    ? analysis.reduce((s, a) => s + (100 - a.foodCostPct), 0) / analysis.length
    : 0;

  // Scatter data
  const scatterData = analysis.map(a => ({
    x: a.unidades,
    y: a.margen,
    z: a.ingresos,
    nombre: a.nombre,
    clasificacion: a.clasificacion,
  }));

  // Save to DB
  const saveAnalysis = async () => {
    setAnalyzing(true);
    try {
      const now = new Date();
      let desde: Date;
      if (periodo === 'semana') { desde = new Date(now); desde.setDate(desde.getDate() - 7); }
      else if (periodo === 'trimestre') { desde = new Date(now); desde.setDate(desde.getDate() - 90); }
      else { desde = new Date(now); desde.setDate(desde.getDate() - 30); }

      // Delete previous for same period
      await supabase.from('ingenieria_menu').delete().gte('periodo_inicio', desde.toISOString().split('T')[0]);

      const rows = analysis.map(a => ({
        periodo_inicio: desde.toISOString().split('T')[0],
        periodo_fin: now.toISOString().split('T')[0],
        plato_id: a.id,
        plato_nombre: a.nombre,
        familia: a.familia,
        unidades_vendidas: a.unidades,
        ingresos: a.ingresos,
        food_cost_unitario: a.coste,
        food_cost_pct: a.foodCostPct,
        margen_unitario: a.margen,
        margen_total: a.margenTotal,
        popularidad: a.popularidad,
        rentabilidad: a.rentabilidad,
        clasificacion: a.clasificacion,
        accion_sugerida: a.accion,
      }));

      if (rows.length > 0) {
        const { error } = await supabase.from('ingenieria_menu').insert(rows);
        if (error) throw error;
      }
      toast.success(`Análisis guardado: ${rows.length} platos`);
    } catch (e: any) {
      toast.error(e.message);
    }
    setAnalyzing(false);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.[0]) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-card border rounded-lg p-2 shadow-lg text-xs">
        <p className="font-semibold">{d.nombre}</p>
        <p>Unidades: {Math.round(d.x)}</p>
        <p>Margen: {fmt(d.y)}</p>
        <p>{CLASIF_EMOJI[d.clasificacion as Clasificacion]} {CLASIF_LABELS[d.clasificacion as Clasificacion]}</p>
      </div>
    );
  };

  return (
    <div className="space-y-4 md:space-y-5">
      <PageHeader title="Ingeniería de Menú" description="Análisis BCG de la carta — popularidad vs rentabilidad" />

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={periodo} onValueChange={setPeriodo}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="semana">Última semana</SelectItem>
            <SelectItem value="mes">Último mes</SelectItem>
            <SelectItem value="trimestre">Último trimestre</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={saveAnalysis} disabled={analyzing || analysis.length === 0}>
          {analyzing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Star className="h-4 w-4 mr-2" />}
          Guardar análisis
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-3 text-center">
          <p className="text-xs text-muted-foreground">Total platos</p>
          <p className="text-xl font-bold">{analysis.length}</p>
        </Card>
        <Card className="p-3 text-center border-l-4" style={{ borderLeftColor: CLASIF_COLORS.estrella }}>
          <p className="text-xs text-muted-foreground">⭐ Estrellas</p>
          <p className="text-xl font-bold">{counts.estrella}</p>
        </Card>
        <Card className="p-3 text-center border-l-4" style={{ borderLeftColor: CLASIF_COLORS.caballo }}>
          <p className="text-xs text-muted-foreground">🐴 Caballos</p>
          <p className="text-xl font-bold">{counts.caballo}</p>
        </Card>
        <Card className="p-3 text-center border-l-4" style={{ borderLeftColor: CLASIF_COLORS.puzzle }}>
          <p className="text-xs text-muted-foreground">🧩 Puzzles</p>
          <p className="text-xl font-bold">{counts.puzzle}</p>
        </Card>
        <Card className="p-3 text-center border-l-4" style={{ borderLeftColor: CLASIF_COLORS.perro }}>
          <p className="text-xs text-muted-foreground">🐕 Perros</p>
          <p className="text-xl font-bold">{counts.perro}</p>
        </Card>
      </div>

      {analysis.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <p>No hay datos suficientes para el análisis.</p>
          <p className="text-xs mt-1">Necesitas platos con escandallos y arqueos Z con ventas por familia.</p>
        </Card>
      ) : (
        <>
          {/* Scatter Matrix */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-3">Matriz de Clasificación</h3>
            <div className="h-64 md:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 10, bottom: 30, left: 10 }}>
                  <XAxis type="number" dataKey="x" name="Unidades" fontSize={10} stroke="hsl(var(--muted-foreground))"
                    label={{ value: 'Popularidad (unidades)', position: 'bottom', offset: 10, fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis type="number" dataKey="y" name="Margen" fontSize={10} stroke="hsl(var(--muted-foreground))"
                    label={{ value: 'Rentabilidad (€)', angle: -90, position: 'insideLeft', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(v) => `${v.toFixed(0)}€`} />
                  <ZAxis type="number" dataKey="z" range={[40, 400]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Scatter data={scatterData}>
                    {scatterData.map((entry, i) => (
                      <Cell key={i} fill={CLASIF_COLORS[entry.clasificacion as Clasificacion]} fillOpacity={0.8} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-3 mt-2 justify-center">
              {(['estrella', 'caballo', 'puzzle', 'perro'] as Clasificacion[]).map(c => (
                <div key={c} className="flex items-center gap-1 text-xs">
                  <div className="w-3 h-3 rounded-full" style={{ background: CLASIF_COLORS[c] }} />
                  {CLASIF_EMOJI[c]} {CLASIF_LABELS[c]}
                </div>
              ))}
            </div>
          </Card>

          {/* Filter + Table */}
          <div className="flex gap-2 items-center">
            <span className="text-xs text-muted-foreground">Filtrar:</span>
            {['todas', 'estrella', 'caballo', 'puzzle', 'perro'].map(c => (
              <Button key={c} size="sm" variant={filtroClasif === c ? 'default' : 'outline'}
                onClick={() => setFiltroClasif(c)} className="text-xs h-7">
                {c === 'todas' ? 'Todas' : `${CLASIF_EMOJI[c as Clasificacion]} ${CLASIF_LABELS[c as Clasificacion]}`}
              </Button>
            ))}
          </div>

          <Card className="overflow-x-auto">
            <table className="w-full text-xs md:text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left p-2">Plato</th>
                  <th className="text-left p-2">Familia</th>
                  <th className="text-right p-2">Uds.</th>
                  <th className="text-right p-2">PVP</th>
                  <th className="text-right p-2">Coste</th>
                  <th className="text-right p-2">Margen</th>
                  <th className="text-right p-2">FC%</th>
                  <th className="text-center p-2">Clase</th>
                  <th className="text-left p-2 hidden md:table-cell">Acción</th>
                </tr>
              </thead>
              <tbody>
                {filtered.sort((a, b) => b.margenTotal - a.margenTotal).map(p => (
                  <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="p-2 font-medium">{p.nombre}</td>
                    <td className="p-2 text-muted-foreground">{p.familia}</td>
                    <td className="text-right p-2 tabular-nums">{Math.round(p.unidades)}</td>
                    <td className="text-right p-2 tabular-nums">{fmt(p.pvp)}</td>
                    <td className="text-right p-2 tabular-nums">{fmt(p.coste)}</td>
                    <td className="text-right p-2 tabular-nums font-medium">{fmt(p.margen)}</td>
                    <td className="text-right p-2 tabular-nums">{p.foodCostPct.toFixed(1)}%</td>
                    <td className="text-center p-2">
                      <Badge variant="outline" className="text-[10px]" style={{ borderColor: CLASIF_COLORS[p.clasificacion], color: CLASIF_COLORS[p.clasificacion] }}>
                        {CLASIF_EMOJI[p.clasificacion]} {CLASIF_LABELS[p.clasificacion]}
                      </Badge>
                    </td>
                    <td className="p-2 text-muted-foreground text-[10px] hidden md:table-cell max-w-[200px]">{p.accion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}
