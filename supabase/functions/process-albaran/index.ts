import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Normaliza texto para comparaciones */
function normalizeName(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
}

function namesMatch(a: string, b: string): boolean {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  const wa = na.split(" ").slice(0, 2).join(" ");
  const wb = nb.split(" ").slice(0, 2).join(" ");
  if (wa.length >= 4 && wa === wb) return true;
  return false;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { albaran_id, fase, imagen_base64, proveedor_id } = await req.json();

    // Fetch learning instructions for this provider
    let instrucciones = "";
    if (proveedor_id) {
      const { data: correcciones } = await supabase
        .from("aprendizaje")
        .select("tipo, descripcion, datos_antes, datos_despues")
        .eq("proveedor_id", proveedor_id)
        .order("created_at", { ascending: false })
        .limit(15);

      if (correcciones && correcciones.length > 0) {
        const lineas = ["INSTRUCCIONES ESPECÍFICAS PARA ESTE PROVEEDOR (basadas en correcciones previas):"];
        for (const c of correcciones) {
          lineas.push(`- [${c.tipo.toUpperCase()}] ${c.descripcion}`);
        }
        instrucciones = lineas.join("\n");
      }
    }

    let prompt: string;
    let maxTokens: number;

    if (fase === 1) {
      // Phase 1: Identify provider
      prompt = `${instrucciones ? instrucciones + "\n\n" : ""}Analiza este albarán y extrae ÚNICAMENTE la información del PROVEEDOR (quien emite el documento, no quien lo recibe).

Responde SOLO con JSON válido, sin texto adicional, sin bloques de código:
{
  "nombre": "nombre completo de la empresa proveedora",
  "cif": "CIF o NIF o null",
  "direccion": "dirección completa o null",
  "telefono": "teléfono o null",
  "email": "email o null",
  "confianza": 0.95,
  "razon": "breve explicación de cómo identificaste al proveedor"
}`;
      maxTokens = 600;
    } else {
      // Phase 2: Extract all data
      prompt = `${instrucciones ? instrucciones + "\n\n" : ""}Extrae TODOS los datos de este albarán con máxima precisión.

Responde SOLO con JSON válido, sin texto adicional, sin bloques de código:
{
  "numero_albaran": "número o referencia del albarán",
  "fecha": "fecha en formato YYYY-MM-DD o null",
  "lineas": [
    {
      "referencia": "código producto o null",
      "descripcion": "descripción del artículo",
      "cantidad": 3,
      "unidad": "ud",
      "precio_unitario": 10.50,
      "importe": 31.50,
      "iva_pct": 10
    }
  ],
  "subtotal": 42.50,
  "iva_desglose": [{"base": 42.50, "tipo": 10, "cuota": 4.25}],
  "total": 46.75,
  "observaciones": "notas del documento o null"
}

Extrae TODAS las líneas sin omitir ninguna.
Para iva_pct de cada línea usa el tipo de IVA que aparezca (4, 10, 21) o null si no se ve.
Presta especial atención a los importes, descuentos y totales.`;
      maxTokens = 4000;
    }

    const messages = [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: `data:image/png;base64,${imagen_base64}` }
          },
          { type: "text", text: prompt }
        ]
      }
    ];

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        max_tokens: maxTokens,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Límite de peticiones alcanzado. Espera un momento." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos agotados. Añade fondos en Configuración." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      throw new Error(`AI error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    let content = aiData.choices?.[0]?.message?.content || "";
    
    // Clean JSON from markdown code blocks
    content = content.trim();
    if (content.startsWith("```")) {
      const lines = content.split("\n");
      const start = 1;
      const end = lines[lines.length - 1].trim() === "```" ? lines.length - 1 : lines.length;
      content = lines.slice(start, end).join("\n");
    }

    const resultado = JSON.parse(content);

    // Update albaran with AI data
    if (albaran_id) {
      if (fase === 1) {
        // Try to match provider in DB
        // Try to match provider — CIF first
        let matched_proveedor_id = null;
        if (resultado.cif) {
          const cleanCif = resultado.cif.replace(/[\s\-\.]/g, "").toUpperCase();
          const { data: prov } = await supabase
            .from("proveedores")
            .select("id")
            .eq("cif", cleanCif)
            .maybeSingle();
          if (prov) matched_proveedor_id = prov.id;
        }
        // Fuzzy name match
        if (!matched_proveedor_id && resultado.nombre) {
          const { data: allProvs } = await supabase
            .from("proveedores")
            .select("id, nombre");
          if (allProvs) {
            for (const p of allProvs) {
              if (namesMatch(p.nombre, resultado.nombre)) {
                matched_proveedor_id = p.id;
                break;
              }
            }
          }
        }

        await supabase.from("albaranes").update({
          proveedor_nombre: resultado.nombre,
          proveedor_id: matched_proveedor_id,
          estado: "pendiente_verificacion",
          datos_ia: { fase1: resultado },
        }).eq("id", albaran_id);

      } else {
        // Phase 2 — save extracted data
        const updateData: Record<string, unknown> = {
          numero: resultado.numero_albaran || "",
          importe: resultado.total || 0,
          estado: "pendiente_verificacion",
        };
        if (resultado.fecha) updateData.fecha = resultado.fecha;
        
        // Merge with existing datos_ia
        const { data: existing } = await supabase
          .from("albaranes")
          .select("datos_ia")
          .eq("id", albaran_id)
          .single();

        updateData.datos_ia = {
          ...(existing?.datos_ia as Record<string, unknown> || {}),
          fase2: resultado,
        };

        await supabase.from("albaranes").update(updateData).eq("id", albaran_id);

        // Insert line items
        if (resultado.lineas && resultado.lineas.length > 0) {
          // Delete existing lines first
          await supabase.from("lineas_albaran").delete().eq("albaran_id", albaran_id);
          
          const lineas = resultado.lineas.map((l: Record<string, unknown>) => ({
            albaran_id,
            codigo: l.referencia || "",
            descripcion: l.descripcion || "",
            cantidad: l.cantidad || 1,
            precio_unitario: l.precio_unitario || 0,
            importe: l.importe || 0,
            iva_pct: l.iva_pct || 0,
          }));
          await supabase.from("lineas_albaran").insert(lineas);
        }
      }
    }

    return new Response(JSON.stringify({ success: true, resultado }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("process-albaran error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
