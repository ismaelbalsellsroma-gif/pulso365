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
Familias conocidas del negocio: ${familiasList}
Intenta mapear cada línea del ticket a una de las familias conocidas. Si no coincide, usa el nombre tal cual aparece.
Presta atención a los decimales: el formato español usa comas como separador decimal.

MUY IMPORTANTE: Todos los importes deben ser SIN IVA (base imponible).
- Si el ticket muestra importes con IVA incluido, divide SIEMPRE entre 1.10 para obtener la base imponible.
- El total_sin_iva debe ser la suma de todos los importes sin IVA.
- Aplica IVA del 10% a TODAS las familias sin excepción.`;

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
              { type: "text", text: "Interpreta este ticket Z y extrae fecha, familias con unidades e importes." },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${image_base64}` } },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_arqueo_z",
              description: "Extraer datos del ticket Z",
              parameters: {
                type: "object",
                properties: {
                  fecha: { type: "string", description: "Fecha del ticket en formato YYYY-MM-DD" },
                  familias: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        familia_nombre: { type: "string", description: "Nombre de la familia de venta" },
                        unidades: { type: "number", description: "Número de unidades vendidas" },
                        importe: { type: "number", description: "Importe total de la familia sin IVA" },
                      },
                      required: ["familia_nombre", "unidades", "importe"],
                    },
                  },
                  total_sin_iva: { type: "number", description: "Total de ventas sin IVA" },
                },
                required: ["fecha", "familias"],
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
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos agotados." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
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
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
