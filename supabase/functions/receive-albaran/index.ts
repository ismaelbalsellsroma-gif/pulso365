import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json();
    const items = Array.isArray(body) ? body : [body];
    const results: { id: string; numero: string }[] = [];

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

      // 1. Match or create provider
      let proveedor_id: string | null = null;
      if (cif_proveedor) {
        const { data: provByCif } = await supabase
          .from("proveedores")
          .select("id")
          .eq("cif", cif_proveedor)
          .maybeSingle();
        if (provByCif) proveedor_id = provByCif.id;
      }
      if (!proveedor_id && proveedor) {
        const { data: provByName } = await supabase
          .from("proveedores")
          .select("id, nombre")
          .ilike("nombre", `%${proveedor.split(" ")[0]}%`);
        if (provByName && provByName.length === 1) proveedor_id = provByName[0].id;
      }
      if (!proveedor_id && proveedor) {
        const { data: newProv } = await supabase
          .from("proveedores")
          .insert({
            nombre: proveedor,
            cif: cif_proveedor || "",
            telefono: proveedor_telefono || "",
            email: proveedor_email || "",
            contacto: proveedor_direccion || "",
          })
          .select("id")
          .single();
        if (newProv) proveedor_id = newProv.id;
      }

      // 2. Upload image if provided
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

      // 3. Create albaran record
      const { data: albaran, error: albErr } = await supabase
        .from("albaranes")
        .insert({
          numero: numero_albaran || "",
          fecha: fecha || new Date().toISOString().slice(0, 10),
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

      // 4. Insert line items & update product prices
      if (lineas.length > 0 && albaran) {
        const albaranFecha = fecha || new Date().toISOString().slice(0, 10);

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
          };
        });
        await supabase.from("lineas_albaran").insert(rows);

        // 5. Auto-update product prices from lines
        for (const row of rows) {
          if (!row.descripcion) continue;
          const nombreNorm = row.descripcion.toLowerCase().trim();

          // Try to find existing product by normalized name
          const { data: existingProd } = await supabase
            .from("productos")
            .select("id, precio_actual, num_compras")
            .eq("nombre_normalizado", nombreNorm)
            .maybeSingle();

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

            // Insert price history
            await supabase.from("precios_historico").insert({
              producto_id: existingProd.id,
              precio: newPrice,
              fecha: albaranFecha,
              albaran_id: albaran.id,
              proveedor_id: proveedor_id,
              proveedor_nombre: proveedor || "",
              cantidad: row.cantidad,
            });

            // Create price alert if significant change
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
                nombre_normalizado: nombreNorm,
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
      JSON.stringify({ success: true, count: results.length, albaranes: results }),
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
