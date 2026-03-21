// ─── Escandallo cost calculation engine ───
// Ported from Albarán360 Python logic

interface ProductoData {
  precio_actual: number | null;
  unidad: string | null;
  contenido_neto: number | null;
  contenido_unidad: string | null;
}

interface IngredienteData {
  cantidad: number | null;
  unidad: string | null;
  merma_porcentaje: number | null;
}

function convertUnits(cantidad: number, fromUnit: string, toUnit: string): number {
  const from = fromUnit.toLowerCase();
  const to = toUnit.toLowerCase();
  if (from === to) return cantidad;
  if (to === 'kg' && from === 'g') return cantidad / 1000;
  if (to === 'kg' && from === 'mg') return cantidad / 1000000;
  if (to === 'g' && from === 'kg') return cantidad * 1000;
  if (to === 'l' && from === 'ml') return cantidad / 1000;
  if (to === 'ml' && from === 'l') return cantidad * 1000;
  return cantidad;
}

export function calcIngredienteCoste(ing: IngredienteData, prod: ProductoData | null) {
  const precioCompra = prod?.precio_actual ?? 0;
  const cantidad = ing.cantidad ?? 0;
  const unidadIng = (ing.unidad || 'kg').toLowerCase();
  const unidadProd = (prod?.unidad || 'ud').toLowerCase();
  const contenidoNeto = prod?.contenido_neto ?? null;
  const contenidoUnidad = prod?.contenido_unidad?.toLowerCase() ?? null;
  const merma = ing.merma_porcentaje ?? 0;

  if (contenidoNeto && contenidoNeto > 0 && contenidoUnidad) {
    // Case A: product has contenido_neto → precise cost
    const precioPorUnidadReal = precioCompra / contenidoNeto;
    const cantidadConvertida = convertUnits(cantidad, unidadIng, contenidoUnidad);
    const cantidadConMerma = cantidadConvertida * (1 + merma / 100);
    const coste = Math.round(cantidadConMerma * precioPorUnidadReal * 10000) / 10000;

    return {
      precio_unitario: Math.round(precioPorUnidadReal * 10000) / 10000,
      cantidad_con_merma: Math.round(cantidadConMerma * 10000) / 10000,
      coste,
      unidad_calculo: contenidoUnidad,
      contenido_neto: contenidoNeto,
      precio_compra: precioCompra,
    };
  } else {
    // Case B: direct calculation
    const cantidadConvertida = convertUnits(cantidad, unidadIng, unidadProd);
    const cantidadConMerma = cantidadConvertida * (1 + merma / 100);
    const coste = Math.round(cantidadConMerma * precioCompra * 10000) / 10000;

    return {
      precio_unitario: precioCompra,
      cantidad_con_merma: Math.round(cantidadConMerma * 10000) / 10000,
      coste,
      unidad_calculo: unidadProd,
      contenido_neto: null,
      precio_compra: precioCompra,
    };
  }
}

export function calcPlatoMetrics(pvp: number, costeTotal: number, ivaPct: number = 10) {
  const margen = Math.round((pvp - costeTotal) * 100) / 100;
  const margenPct = pvp > 0 ? Math.round(((margen / pvp) * 100) * 10) / 10 : 0;
  const foodCost = pvp > 0 ? Math.round(((costeTotal / pvp) * 100) * 10) / 10 : 0;
  const multiplicador = costeTotal > 0 ? Math.round((pvp / costeTotal) * 100) / 100 : 0;
  const pvpConIva = Math.round(pvp * (1 + ivaPct / 100) * 100) / 100;

  return { margen, margenPct, foodCost, multiplicador, pvpConIva };
}
