import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Normaliza texto para comparaciones: minúsculas, sin acentos, sin espacios extra */
function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Compara dos nombres normalizados con tolerancia */
function namesMatch(a: string, b: string): boolean {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (na === nb) return true;
  // One contains the other
  if (na.includes(nb) || nb.includes(na)) return true;
  // First two words match (e.g. "Distribuciones Garcia" vs "Distribuciones Garcia SL")
  const wa = na.split(" ").slice(0, 2).join(" ");
  const wb = nb.split(" ").slice(0, 2).join(" ");
  if (wa.length >= 4 && wa === wb) return true;
  return false;
}

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json();
    const items = Array.isArray(body) ? body : [body];
    const results: { id: string; numero: string; duplicado?: boolean }[] = [];

    for (const item of items) {
      const {
        proveedor,
        cif_proveedor,
        numero_albaran,
        fecha,
        fecha_vencimiento,
        lineas = [],
        descuento_global_pct,
        subtotal,
        iva_desglose,
        importe_total,
        notas,
        imagen_b64,
        procesado_en,
        proveedor_telefono,
        proveedor_email,
        proveedor_direccion,
      } = item;

      // ═══════════════════════════════════════════════════════════
      // 1. PROVEEDOR — Match by CIF first, then normalized name
      // ═══════════════════════════════════════════════════════════
      let proveedor_id: string | null = null;

      if (cif_proveedor) {
        const cleanCif = cif_proveedor.replace(/[\s\-\.]/g, "").toUpperCase();
        const { data: provByCif } = await supabase
          .from("proveedores")
          .select("id, nombre")
          .eq("cif", cleanCif)
          .maybeSingle();
        if (provByCif) proveedor_id = provByCif.id;
      }

      if (!proveedor_id && proveedor) {
        // Search all providers and do fuzzy match
        const { data: allProvs } = await supabase
          .from("proveedores")
          .select("id, nombre, cif");

        if (allProvs) {
          for (const p of allProvs) {
            if (namesMatch(p.nombre, proveedor)) {
              proveedor_id = p.id;
              // Also update CIF if we have one and the DB doesn't
              if (cif_proveedor && (!p.cif || p.cif === "")) {
                await supabase
                  .from("proveedores")
                  .update({ cif: cif_proveedor.replace(/[\s\-\.]/g, "").toUpperCase() })
                  .eq("id", p.id);
              }
              break;
            }
          }
        }
      }

      if (!proveedor_id && proveedor) {
        const { data: newProv } = await supabase
          .from("proveedores")
          .insert({
            nombre: proveedor,
            cif: cif_proveedor ? cif_proveedor.replace(/[\s\-\.]/g, "").toUpperCase() : "",
            telefono: proveedor_telefono || "",
            email: proveedor_email || "",
            contacto: proveedor_direccion || "",
          })
          .select("id")
          .single();
        if (newProv) proveedor_id = newProv.id;
      }

      // ═══════════════════════════════════════════════════════════
      // 2. ALBARÁN — Check for duplicate (same numero + proveedor + fecha)
      // ═══════════════════════════════════════════════════════════
      const albaranFecha = fecha || new Date().toISOString().slice(0, 10);

      if (numero_albaran && proveedor_id) {
        const { data: existingAlb } = await supabase
          .from("albaranes")
          .select("id, numero")
          .eq("numero", numero_albaran)
          .eq("proveedor_id", proveedor_id)
          .eq("fecha", albaranFecha)
          .maybeSingle();

        if (existingAlb) {
          console.log(`Albarán duplicado detectado: ${numero_albaran} del proveedor ${proveedor} fecha ${albaranFecha}`);
          results.push({ id: existingAlb.id, numero: numero_albaran, duplicado: true });
          continue; // Skip — do not insert duplicate
        }
      }

      // Also check by numero + proveedor (without fecha) to catch date variations
      if (numero_albaran && proveedor_id) {
        const { data: existingAlb2 } = await supabase
          .from("albaranes")
          .select("id, numero, fecha")
          .eq("numero", numero_albaran)
          .eq("proveedor_id", proveedor_id)
          .maybeSingle();

        if (existingAlb2) {
          console.log(`Albarán duplicado (mismo número+proveedor, fecha distinta): ${numero_albaran}`);
          results.push({ id: existingAlb2.id, numero: numero_albaran, duplicado: true });
          continue;
        }
      }

      // ═══════════════════════════════════════════════════════════
      // 3. Upload image if provided
      // ═══════════════════════════════════════════════════════════
      let imagen_url: string | null = null;
      if (imagen_b64) {
        try {
          const bytes = decode(imagen_b64);
          const fileName = `webhook_${Date.now()}_${(numero_albaran || "SN").replace(/[\/\\]/g, "-")}.png`;
          const { error: upErr } = await supabase.storage
            .from("albaranes")
            .upload(fileName, bytes, { contentType: "image/png" });
          if (!upErr) {
            const { data: urlData } = supabase.storage
              .from("albaranes")
              .getPublicUrl(fileName);
            imagen_url = urlData.publicUrl;
          }
        } catch (e) {
          console.error("Image upload error:", e);
        }
      }

      // ═══════════════════════════════════════════════════════════
      // 4. Create albaran record
      // ═══════════════════════════════════════════════════════════
      const { data: albaran, error: albErr } = await supabase
        .from("albaranes")
        .insert({
          numero: numero_albaran || "",
          fecha: albaranFecha,
          proveedor_id,
          proveedor_nombre: proveedor || "",
          importe: importe_total || 0,
          imagen_url,
          estado: "pendiente_verificacion",
          datos_ia: {
            subtotal,
            descuento_global_pct,
            iva_desglose,
            notas,
            procesado_en,
            fecha_vencimiento,
          },
        })
        .select("id")
        .single();

      if (albErr) {
        console.error("Insert albaran error:", albErr);
        continue;
      }

      // ═══════════════════════════════════════════════════════════
      // 5. Insert line items & update product prices (with dedup)
      // ═══════════════════════════════════════════════════════════
      if (lineas.length > 0 && albaran) {
        const rows = lineas.map((l: Record<string, unknown>) => {
          let pu = Number(l.precio_unitario) || 0;
          const cant = Number(l.cantidad) || 1;
          const imp = Number(l.importe) || 0;

          // Detect precio_unitario in thousandths (milésimas)
          if (pu > 100) {
            const puNorm = pu / 1000;
            const expectedFromImp = cant > 0 ? imp / cant : 0;
            if (expectedFromImp > 0 && Math.abs(puNorm - expectedFromImp) / expectedFromImp < 0.15) {
              pu = puNorm;
            } else if (expectedFromImp > 0) {
              pu = Math.round(expectedFromImp * 10000) / 10000;
            } else {
              pu = puNorm;
            }
          }

          return {
            albaran_id: albaran.id,
            codigo: (l.referencia as string) || "",
            descripcion: (l.descripcion as string) || "",
            cantidad: cant,
            precio_unitario: pu,
            importe: imp,
            iva_pct: Number(l.iva_pct) || 0,
            descuento_pct: Number(l.descuento_pct) || 0,
            descuento_tipo: (l.descuento_tipo as string) || "%",
          };
        });
        await supabase.from("lineas_albaran").insert(rows);

        // ─── PRODUCTOS: Match with dedup ───
        for (const row of rows) {
          if (!row.descripcion) continue;
          const nombreNorm = normalizeName(row.descripcion);

          // Strategy 1: Exact match by nombre_normalizado
          let existingProd: { id: string; precio_actual: number | null; num_compras: number | null } | null = null;

          const { data: exactMatch } = await supabase
            .from("productos")
            .select("id, precio_actual, num_compras")
            .eq("nombre_normalizado", row.descripcion.toLowerCase().trim())
            .maybeSingle();

          if (exactMatch) {
            existingProd = exactMatch;
          }

          // Strategy 2: Match by referencia (código) + proveedor
          if (!existingProd && row.codigo) {
            const { data: refMatch } = await supabase
              .from("productos")
              .select("id, precio_actual, num_compras")
              .eq("referencia", row.codigo)
              .eq("proveedor_id", proveedor_id!)
              .maybeSingle();
            if (refMatch) existingProd = refMatch;
          }

          // Strategy 3: Fuzzy name match within same proveedor
          if (!existingProd && proveedor_id) {
            const { data: provProducts } = await supabase
              .from("productos")
              .select("id, nombre, nombre_normalizado, precio_actual, num_compras")
              .eq("proveedor_id", proveedor_id);

            if (provProducts) {
              for (const pp of provProducts) {
                if (namesMatch(pp.nombre, row.descripcion)) {
                  existingProd = { id: pp.id, precio_actual: pp.precio_actual, num_compras: pp.num_compras };
                  // Update nombre_normalizado if it was slightly different
                  if (pp.nombre_normalizado !== row.descripcion.toLowerCase().trim()) {
                    await supabase
                      .from("productos")
                      .update({ nombre_normalizado: row.descripcion.toLowerCase().trim() })
                      .eq("id", pp.id);
                  }
                  break;
                }
              }
            }
          }

          if (existingProd) {
            // Update existing product price
            const oldPrice = Number(existingProd.precio_actual) || 0;
            const newPrice = row.precio_unitario;
            const numCompras = (Number(existingProd.num_compras) || 0) + 1;

            await supabase
              .from("productos")
              .update({
                precio_anterior: oldPrice,
                precio_actual: newPrice,
                ultima_compra: albaranFecha,
                num_compras: numCompras,
                proveedor_id: proveedor_id,
                proveedor_nombre: proveedor || "",
              })
              .eq("id", existingProd.id);

            await supabase.from("precios_historico").insert({
              producto_id: existingProd.id,
              precio: newPrice,
              fecha: albaranFecha,
              albaran_id: albaran.id,
              proveedor_id: proveedor_id,
              proveedor_nombre: proveedor || "",
              cantidad: row.cantidad,
            });

            // Price alert if >5% change
            if (oldPrice > 0 && Math.abs(newPrice - oldPrice) / oldPrice > 0.05) {
              const variacion = ((newPrice - oldPrice) / oldPrice) * 100;
              await supabase.from("alertas_precio").insert({
                producto_id: existingProd.id,
                precio_anterior: oldPrice,
                precio_nuevo: newPrice,
                variacion_pct: Math.round(variacion * 10) / 10,
                albaran_id: albaran.id,
                fecha: albaranFecha,
                tipo: variacion > 0 ? "subida" : "bajada",
                mensaje: `${row.descripcion}: ${variacion > 0 ? "+" : ""}${variacion.toFixed(1)}% (${oldPrice.toFixed(2)}€ → ${newPrice.toFixed(2)}€)`,
              });
            }
          } else {
            // Create new product
            const { data: newProd } = await supabase
              .from("productos")
              .insert({
                nombre: row.descripcion,
                nombre_normalizado: row.descripcion.toLowerCase().trim(),
                referencia: row.codigo || "",
                precio_actual: row.precio_unitario,
                precio_anterior: 0,
                ultima_compra: albaranFecha,
                num_compras: 1,
                proveedor_id: proveedor_id,
                proveedor_nombre: proveedor || "",
                unidad: "ud",
              })
              .select("id")
              .single();

            if (newProd) {
              await supabase.from("precios_historico").insert({
                producto_id: newProd.id,
                precio: row.precio_unitario,
                fecha: albaranFecha,
                albaran_id: albaran.id,
                proveedor_id: proveedor_id,
                proveedor_nombre: proveedor || "",
                cantidad: row.cantidad,
              });
            }
          }
        }
      }

      results.push({ id: albaran!.id, numero: numero_albaran || "" });
    }

    return new Response(
      JSON.stringify({
        success: true,
        count: results.filter((r) => !r.duplicado).length,
        duplicados: results.filter((r) => r.duplicado).length,
        albaranes: results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("receive-albaran error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
