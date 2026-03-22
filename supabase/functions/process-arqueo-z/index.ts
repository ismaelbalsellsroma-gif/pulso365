import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { image_base64, familias_conocidas } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const familiasList = (familias_conocidas || []).join(", ");

    const systemPrompt = `Eres un experto en interpretar tickets Z (arqueos de caja) de restaurantes.
Extrae la información del ticket Z en la imagen. Devuelve la información usando la tool proporcionada.

FAMILIAS EXISTENTES del negocio (SOLO puedes usar estos nombres): ${familiasList}

REGLAS OBLIGATORIAS:
1. DEBES mapear CADA línea del ticket a una de las familias existentes. NO inventes familias nuevas.
2. Usa EXACTAMENTE el nombre de la familia existente, respetando mayúsculas y tildes.
3. Si una línea coincide claramente (mismo nombre, abreviación, sinónimo obvio), usa el nombre exacto y marca matched=true.
   Ejemplos: "HAMBURGUE.." → "HAMBURGUESAS", "VINOS y ESP.." → "VINOS Y ESPIRITUOSOS", "Licores" → "VINOS Y ESPIRITUOSOS"
4. Si NO puedes mapear una línea a ninguna familia existente con certeza, pon su nombre original tal como aparece en el ticket y marca matched=false.
5. NUNCA crees nombres nuevos si existe uno equivalente. Siempre intenta mapear primero.

Presta atención a los decimales: el formato español usa comas como separador decimal.

MUY IMPORTANTE: Devuelve los importes TAL COMO aparecen en el ticket (CON IVA). NO dividas ni modifiques los importes. El sistema quitará el IVA automáticamente.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "Interpreta este ticket Z y extrae fecha, familias con unidades e importes. Mapea cada línea a las familias existentes." },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${image_base64}` } },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_arqueo_z",
              description: "Extraer datos del ticket Z mapeando a familias existentes",
              parameters: {
                type: "object",
                properties: {
                  fecha: { type: "string", description: "Fecha del ticket en formato YYYY-MM-DD" },
                  familias: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        familia_nombre: { type: "string", description: "Nombre EXACTO de la familia existente, o nombre original si no hay match" },
                        nombre_ticket: { type: "string", description: "Nombre tal como aparece en el ticket" },
                        unidades: { type: "number", description: "Número de unidades vendidas" },
                        importe: { type: "number", description: "Importe total de la familia sin IVA (dividido entre 1.10)" },
                        matched: { type: "boolean", description: "true si se mapeó a una familia existente, false si no se encontró coincidencia" },
                      },
                      required: ["familia_nombre", "nombre_ticket", "unidades", "importe", "matched"],
                    },
                  },
                  total_sin_iva: { type: "number", description: "Total de ventas sin IVA" },
                },
                required: ["fecha", "familias", "total_sin_iva"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_arqueo_z" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Límite de peticiones alcanzado, intenta de nuevo en unos segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos agotados." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("No se pudo interpretar el ticket");
    }

    const extracted = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(extracted), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("process-arqueo-z error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
