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

    // Accept single or array
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
        // Extra provider fields from scanning app
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
      // Auto-create provider if not found
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

      // 4. Insert line items
      if (lineas.length > 0 && albaran) {
        const rows = lineas.map(
          (l: Record<string, unknown>) => ({
            albaran_id: albaran.id,
            codigo: (l.referencia as string) || "",
            descripcion: (l.descripcion as string) || "",
            cantidad: (l.cantidad as number) || 1,
            precio_unitario: (l.precio_unitario as number) || 0,
            importe: (l.importe as number) || 0,
            iva_pct: (l.iva_pct as number) || 0,
          })
        );
        await supabase.from("lineas_albaran").insert(rows);
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
