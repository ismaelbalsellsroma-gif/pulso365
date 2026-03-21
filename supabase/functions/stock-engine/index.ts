import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getWeekNumber(d: Date): { semana: number; anyo: number } {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const semana = Math.ceil(
    ((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
  return { semana, anyo: date.getUTCFullYear() };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/stock-engine\/?/, "");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const db = createClient(supabaseUrl, serviceKey);

  try {
    // ─── CLASIFICACIÓN ABC ───
    if (path === "clasificacion-abc" && req.method === "GET") {
      const hace90 = new Date();
      hace90.setDate(hace90.getDate() - 90);
      const desde = hace90.toISOString().split("T")[0];

      // Get all products
      const { data: productos } = await db.from("productos").select("*");
      if (!productos?.length) return json([]);

      // Get processed albaranes in last 90 days
      const { data: albaranes } = await db
        .from("albaranes")
        .select("id, fecha, estado")
        .eq("estado", "procesado")
        .gte("fecha", desde);

      if (!albaranes?.length) return json([]);
      const albaranIds = albaranes.map((a) => a.id);

      // Get lines for those albaranes
      const { data: lineas } = await db
        .from("lineas_albaran")
        .select("albaran_id, descripcion, importe")
        .in("albaran_id", albaranIds);

      // Match lines to products by normalized name
      const prodByNorm: Record<string, typeof productos[0]> = {};
      for (const p of productos) {
        prodByNorm[p.nombre_normalizado] = p;
      }

      const gastoPorProducto: Record<string, number> = {};
      for (const l of lineas || []) {
        const norm = (l.descripcion || "").toLowerCase().trim();
        const prod = prodByNorm[norm];
        if (prod) {
          gastoPorProducto[prod.id] =
            (gastoPorProducto[prod.id] || 0) + (Number(l.importe) || 0);
        }
      }

      // Sort by gasto desc and classify
      const sorted = Object.entries(gastoPorProducto)
        .map(([id, gasto]) => ({ id, gasto }))
        .filter((x) => x.gasto > 0)
        .sort((a, b) => b.gasto - a.gasto);

      const totalGasto = sorted.reduce((s, x) => s + x.gasto, 0);
      if (totalGasto === 0) return json([]);

      let acumulado = 0;
      const result = sorted.map((item) => {
        acumulado += item.gasto;
        const pct = (acumulado / totalGasto) * 100;
        const clase = pct <= 80 ? "A" : pct <= 95 ? "B" : "C";
        const prod = productos.find((p) => p.id === item.id)!;
        return {
          producto_id: item.id,
          nombre: prod.nombre,
          clase,
          gasto_90d: Math.round(item.gasto * 100) / 100,
          unidad: prod.unidad,
          precio: prod.precio_actual,
          proveedor: prod.proveedor_nombre,
          categoria_id: prod.categoria_id,
        };
      });

      return json(result);
    }

    // ─── SEMANA ACTUAL ───
    if (path === "semana-actual" && req.method === "GET") {
      const { semana, anyo } = getWeekNumber(new Date());

      // Check if already generated
      const { data: existing } = await db
        .from("stock_solicitudes_semanales")
        .select("*, productos(id, nombre, unidad, precio_actual, proveedor_nombre)")
        .eq("semana", semana)
        .eq("anyo", anyo);

      if (existing && existing.length > 0) {
        // Get conteo data for each
        const result = [];
        for (const sol of existing) {
          const { data: conteo } = await db
            .from("stock_conteos")
            .select("*")
            .eq("producto_id", sol.producto_id)
            .eq("semana", semana)
            .eq("anyo", anyo)
            .order("created_at", { ascending: false })
            .limit(1);

          result.push({
            ...sol,
            conteo: conteo?.[0] || null,
          });
        }
        return json({ semana, anyo, productos: result });
      }

      // Generate new selection - call ABC first
      const abcRes = await fetch(
        `${supabaseUrl}/functions/v1/stock-engine/clasificacion-abc`,
        { headers: { Authorization: `Bearer ${serviceKey}` } }
      );
      const abc: any[] = await abcRes.json();
      if (!abc?.length) return json({ semana, anyo, productos: [] });

      // Get products with movement in last 60 days
      const hace60 = new Date();
      hace60.setDate(hace60.getDate() - 60);
      const desde60 = hace60.toISOString().split("T")[0];

      const { data: albaranes60 } = await db
        .from("albaranes")
        .select("id")
        .eq("estado", "procesado")
        .gte("fecha", desde60);

      const activosSet = new Set<string>();
      if (albaranes60?.length) {
        const albIds = albaranes60.map((a) => a.id);
        const { data: lineas60 } = await db
          .from("lineas_albaran")
          .select("descripcion")
          .in("albaran_id", albIds);

        const { data: prods } = await db.from("productos").select("id, nombre_normalizado");
        const normToId: Record<string, string> = {};
        for (const p of prods || []) normToId[p.nombre_normalizado] = p.id;

        for (const l of lineas60 || []) {
          const norm = (l.descripcion || "").toLowerCase().trim();
          if (normToId[norm]) activosSet.add(normToId[norm]);
        }
      }

      const abcMap: Record<string, any> = {};
      for (const item of abc) abcMap[item.producto_id] = item;

      // Candidates = in ABC + active
      const candidatos = abc.filter((a) => activosSet.has(a.producto_id));

      // Never counted
      const { data: allConteos } = await db
        .from("stock_conteos")
        .select("producto_id");
      const contadosSet = new Set((allConteos || []).map((c) => c.producto_id));
      const nuncaContados = candidatos
        .filter((c) => !contadosSet.has(c.producto_id))
        .sort((a, b) => b.gasto_90d - a.gasto_90d);

      // Last count date
      const { data: ultimosConteos } = await db
        .from("stock_conteos")
        .select("producto_id, fecha")
        .order("fecha", { ascending: false });

      const ultimoConteo: Record<string, string> = {};
      for (const c of ultimosConteos || []) {
        if (!ultimoConteo[c.producto_id]) ultimoConteo[c.producto_id] = c.fecha;
      }

      // High deviation
      const { data: desviaciones } = await db
        .from("stock_desviaciones")
        .select("producto_id, desviacion_porcentaje")
        .order("created_at", { ascending: false });

      const altaDesv = new Set<string>();
      const seenDev = new Set<string>();
      for (const d of desviaciones || []) {
        if (!seenDev.has(d.producto_id)) {
          seenDev.add(d.producto_id);
          if (Math.abs(Number(d.desviacion_porcentaje) || 0) > 10) {
            altaDesv.add(d.producto_id);
          }
        }
      }

      // Build selection
      const seleccion: string[] = [];
      const used = new Set<string>();

      function addItems(pids: string[], max: number) {
        let count = 0;
        for (const pid of pids) {
          if (!used.has(pid) && count < max && seleccion.length < 10) {
            seleccion.push(pid);
            used.add(pid);
            count++;
          }
        }
      }

      // 1. Never counted (max 4)
      addItems(nuncaContados.map((c) => c.producto_id), 4);

      // 2. Class A oldest (fill to 6)
      const claseA = candidatos
        .filter((c) => c.clase === "A" && !used.has(c.producto_id))
        .sort(
          (a, b) =>
            (ultimoConteo[a.producto_id] || "2000-01-01").localeCompare(
              ultimoConteo[b.producto_id] || "2000-01-01"
            )
        );
      addItems(claseA.map((c) => c.producto_id), Math.max(0, 6 - seleccion.length));

      // 3. High deviation (fill to 8)
      const altaDevList = candidatos
        .filter((c) => altaDesv.has(c.producto_id) && !used.has(c.producto_id))
        .sort((a, b) => b.gasto_90d - a.gasto_90d);
      addItems(altaDevList.map((c) => c.producto_id), Math.max(0, 8 - seleccion.length));

      // 4. Class B (fill to 9)
      const claseB = candidatos
        .filter((c) => c.clase === "B" && !used.has(c.producto_id))
        .sort(
          (a, b) =>
            (ultimoConteo[a.producto_id] || "2000-01-01").localeCompare(
              ultimoConteo[b.producto_id] || "2000-01-01"
            )
        );
      addItems(claseB.map((c) => c.producto_id), Math.max(0, 9 - seleccion.length));

      // 5. Class C (fill 10)
      const claseC = candidatos
        .filter((c) => c.clase === "C" && !used.has(c.producto_id))
        .sort(
          (a, b) =>
            (ultimoConteo[a.producto_id] || "2000-01-01").localeCompare(
              ultimoConteo[b.producto_id] || "2000-01-01"
            )
        );
      addItems(claseC.map((c) => c.producto_id), Math.max(0, 10 - seleccion.length));

      // Insert solicitudes
      if (seleccion.length > 0) {
        await db.from("stock_solicitudes_semanales").insert(
          seleccion.map((pid) => ({ semana, anyo, producto_id: pid }))
        );
      }

      // Re-fetch with product data
      const { data: newSol } = await db
        .from("stock_solicitudes_semanales")
        .select("*, productos(id, nombre, unidad, precio_actual, proveedor_nombre)")
        .eq("semana", semana)
        .eq("anyo", anyo);

      return json({
        semana,
        anyo,
        productos: (newSol || []).map((s) => ({ ...s, conteo: null })),
      });
    }

    // ─── REGISTRAR CONTEO ───
    if (path === "conteo" && req.method === "POST") {
      const body = await req.json();
      const { producto_id, cantidad, unidad } = body;
      if (!producto_id || cantidad === undefined)
        return json({ error: "producto_id y cantidad requeridos" }, 400);

      const { semana, anyo } = getWeekNumber(new Date());
      const fecha = new Date().toISOString().split("T")[0];

      // Check if already counted today
      const { data: existing } = await db
        .from("stock_conteos")
        .select("id")
        .eq("producto_id", producto_id)
        .eq("fecha", fecha)
        .limit(1);

      if (existing && existing.length > 0) {
        // Update existing
        const { error } = await db
          .from("stock_conteos")
          .update({ cantidad, unidad: unidad || "kg" })
          .eq("id", existing[0].id);
        if (error) return json({ error: error.message }, 500);
      } else {
        const { error } = await db.from("stock_conteos").insert({
          producto_id,
          cantidad,
          unidad: unidad || "kg",
          fecha,
          semana,
          anyo,
          tipo: "rotativo",
        });
        if (error) return json({ error: error.message }, 500);
      }

      // Mark solicitud as completed
      await db
        .from("stock_solicitudes_semanales")
        .update({ completado: true, fecha_completado: new Date().toISOString() })
        .eq("semana", semana)
        .eq("anyo", anyo)
        .eq("producto_id", producto_id);

      return json({ ok: true });
    }

    // ─── HISTORIAL CONTEOS ───
    if (path === "historial" && req.method === "GET") {
      const limit = Number(url.searchParams.get("limit") || "50");
      const { data } = await db
        .from("stock_conteos")
        .select("*, productos(nombre, unidad, precio_actual)")
        .order("fecha", { ascending: false })
        .limit(limit);
      return json(data || []);
    }

    // ─── GENERAR SEMANA (forzar regeneración) ───
    if (path === "generar-semana" && req.method === "POST") {
      const { semana, anyo } = getWeekNumber(new Date());
      // Delete existing for this week
      await db
        .from("stock_solicitudes_semanales")
        .delete()
        .eq("semana", semana)
        .eq("anyo", anyo);

      // Re-fetch semana-actual will regenerate
      const res = await fetch(
        `${supabaseUrl}/functions/v1/stock-engine/semana-actual`,
        { headers: { Authorization: `Bearer ${serviceKey}` } }
      );
      const data = await res.json();
      return json(data);
    }

    // ─── DESVIACIONES ───
    if (path === "desviaciones" && req.method === "GET") {
      const desde = url.searchParams.get("desde");
      const hasta = url.searchParams.get("hasta");
      if (!desde || !hasta)
        return json({ error: "desde y hasta requeridos" }, 400);

      const { data: productos } = await db.from("productos").select("*");
      if (!productos?.length) return json([]);

      const desviaciones = [];

      for (const prod of productos) {
        // Stock inicial: último conteo antes de 'desde'
        const { data: conteoInicial } = await db
          .from("stock_conteos")
          .select("cantidad")
          .eq("producto_id", prod.id)
          .lte("fecha", desde)
          .order("fecha", { ascending: false })
          .limit(1);

        // Stock final: último conteo en el periodo o más reciente
        const { data: conteoFinal } = await db
          .from("stock_conteos")
          .select("cantidad")
          .eq("producto_id", prod.id)
          .lte("fecha", hasta)
          .order("fecha", { ascending: false })
          .limit(1);

        if (!conteoInicial?.length || !conteoFinal?.length) continue;

        const stockInicial = Number(conteoInicial[0].cantidad);
        const stockFinal = Number(conteoFinal[0].cantidad);

        // Compras en el periodo from lineas_albaran
        const { data: albaranesPeriodo } = await db
          .from("albaranes")
          .select("id")
          .eq("estado", "procesado")
          .gte("fecha", desde)
          .lte("fecha", hasta);

        let comprasPeriodo = 0;
        if (albaranesPeriodo?.length) {
          const albIds = albaranesPeriodo.map((a) => a.id);
          const { data: lineas } = await db
            .from("lineas_albaran")
            .select("cantidad, descripcion")
            .in("albaran_id", albIds);

          for (const l of lineas || []) {
            const norm = (l.descripcion || "").toLowerCase().trim();
            if (norm === prod.nombre_normalizado) {
              comprasPeriodo += Number(l.cantidad) || 0;
            }
          }
        }

        const consumoReal = stockInicial + comprasPeriodo - stockFinal;

        // Consumo teórico from escandallos × ventas
        const { data: ingredientes } = await db
          .from("plato_ingredientes")
          .select("plato_id, cantidad, unidad, merma_porcentaje, producto_id")
          .eq("producto_id", prod.id);

        let consumoTeorico: number | null = null;
        if (ingredientes?.length) {
          consumoTeorico = 0;
          for (const ing of ingredientes) {
            // Get plato's familia
            const { data: plato } = await db
              .from("platos")
              .select("familia_id")
              .eq("id", ing.plato_id)
              .single();

            if (!plato?.familia_id) continue;

            const { data: familia } = await db
              .from("familias")
              .select("nombre")
              .eq("id", plato.familia_id)
              .single();

            if (!familia) continue;

            // Ventas from arqueo_familias
            const { data: arqueos } = await db
              .from("arqueos_z")
              .select("id")
              .gte("fecha", desde)
              .lte("fecha", hasta);

            if (!arqueos?.length) continue;

            const { data: ventasFamilia } = await db
              .from("arqueo_familias")
              .select("unidades")
              .in("arqueo_id", arqueos.map((a) => a.id))
              .eq("familia_nombre", familia.nombre);

            const totalUds = (ventasFamilia || []).reduce(
              (s, v) => s + (Number(v.unidades) || 0), 0
            );
            if (totalUds === 0) continue;

            // Count platos in that familia
            const { count: platosEnFamilia } = await db
              .from("platos")
              .select("id", { count: "exact", head: true })
              .eq("familia_id", plato.familia_id);

            const udsEstePlato =
              platosEnFamilia && platosEnFamilia > 0
                ? totalUds / platosEnFamilia
                : 0;

            let cantidadPorPorcion =
              (Number(ing.cantidad) || 0) *
              (1 + (Number(ing.merma_porcentaje) || 0) / 100);

            // Unit conversion
            const uIng = (ing.unidad || "kg").toLowerCase();
            const uProd = (prod.unidad || "kg").toLowerCase();
            if (uProd === "kg" && uIng === "g") cantidadPorPorcion /= 1000;
            else if (uProd === "l" && uIng === "ml") cantidadPorPorcion /= 1000;
            else if (uProd === "g" && uIng === "kg") cantidadPorPorcion *= 1000;

            consumoTeorico! += udsEstePlato * cantidadPorPorcion;
          }
        }

        if (consumoTeorico === null || consumoTeorico === 0) continue;

        const desviacion = consumoReal - consumoTeorico;
        const desviacionPct = (desviacion / consumoTeorico) * 100;
        const desviacionEuros = desviacion * (Number(prod.precio_actual) || 0);

        desviaciones.push({
          producto_id: prod.id,
          nombre: prod.nombre,
          unidad: prod.unidad,
          precio: prod.precio_actual,
          stock_inicial: Math.round(stockInicial * 100) / 100,
          compras_periodo: Math.round(comprasPeriodo * 100) / 100,
          stock_final: Math.round(stockFinal * 100) / 100,
          consumo_real: Math.round(consumoReal * 100) / 100,
          consumo_teorico: Math.round(consumoTeorico * 100) / 100,
          desviacion: Math.round(desviacion * 100) / 100,
          desviacion_porcentaje: Math.round(desviacionPct * 10) / 10,
          desviacion_euros: Math.round(desviacionEuros * 100) / 100,
        });
      }

      // Save desviaciones
      if (desviaciones.length > 0) {
        // Delete old for same period
        await db
          .from("stock_desviaciones")
          .delete()
          .eq("periodo_inicio", desde)
          .eq("periodo_fin", hasta);

        await db.from("stock_desviaciones").insert(
          desviaciones.map((d) => ({
            producto_id: d.producto_id,
            periodo_inicio: desde,
            periodo_fin: hasta,
            stock_inicial: d.stock_inicial,
            compras_periodo: d.compras_periodo,
            stock_final: d.stock_final,
            consumo_real: d.consumo_real,
            consumo_teorico: d.consumo_teorico,
            desviacion: d.desviacion,
            desviacion_porcentaje: d.desviacion_porcentaje,
            desviacion_euros: d.desviacion_euros,
          }))
        );
      }

      // KPIs
      const totalDesviacionEuros = desviaciones.reduce(
        (s, d) => s + d.desviacion_euros, 0
      );
      const mediaDesviacionPct =
        desviaciones.length > 0
          ? desviaciones.reduce((s, d) => s + Math.abs(d.desviacion_porcentaje), 0) /
            desviaciones.length
          : 0;
      const alertas = desviaciones.filter(
        (d) => Math.abs(d.desviacion_porcentaje) > 10
      ).length;

      return json({
        kpis: {
          desviacion_total_euros: Math.round(totalDesviacionEuros * 100) / 100,
          desviacion_media_pct: Math.round(mediaDesviacionPct * 10) / 10,
          productos_vigilados: desviaciones.length,
          alertas_activas: alertas,
        },
        desviaciones,
      });
    }

    // ─── PRODUCTOS SIN CONTAR ───
    if (path === "productos-sin-contar" && req.method === "GET") {
      const { data: productos } = await db
        .from("productos")
        .select("id, nombre, unidad, precio_actual, proveedor_nombre");
      const { data: conteos } = await db
        .from("stock_conteos")
        .select("producto_id");

      const contadosSet = new Set((conteos || []).map((c) => c.producto_id));
      const sinContar = (productos || []).filter(
        (p) => !contadosSet.has(p.id)
      );
      return json(sinContar);
    }

    return json({ error: "Ruta no encontrada" }, 404);
  } catch (err: any) {
    console.error("Stock engine error:", err);
    return json({ error: err.message || "Error interno" }, 500);
  }
});
