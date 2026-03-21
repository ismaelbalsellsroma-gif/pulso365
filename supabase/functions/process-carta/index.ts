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

    const systemPrompt = `Eres un experto en interpretar cartas y menús de restaurantes.
Analiza la imagen de la carta/menú y extrae TODOS los platos/elaboraciones que veas.
Para cada plato extrae: nombre, precio de venta (PVP), y si puedes identificar a qué familia pertenece.
Familias conocidas del negocio: ${familiasList}
Intenta mapear cada plato a una familia conocida. Si no coincide, sugiere una familia apropiada.
Presta atención a los decimales: el formato español usa comas como separador decimal.
Extrae TODOS los platos que veas, no te dejes ninguno.`;

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
              { type: "text", text: "Interpreta esta carta/menú y extrae todos los platos con sus precios." },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${image_base64}` } },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_carta",
              description: "Extraer platos de la carta/menú",
              parameters: {
                type: "object",
                properties: {
                  platos: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        nombre: { type: "string", description: "Nombre del plato" },
                        pvp: { type: "number", description: "Precio de venta al público" },
                        familia: { type: "string", description: "Familia o categoría del plato" },
                      },
                      required: ["nombre", "pvp"],
                    },
                  },
                },
                required: ["platos"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_carta" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Límite de peticiones alcanzado." }), {
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
    if (!toolCall?.function?.arguments) throw new Error("No se pudo interpretar la carta");

    const extracted = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(extracted), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("process-carta error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
