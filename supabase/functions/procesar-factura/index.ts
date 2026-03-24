import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// import { Anthropic } from "https://esm.sh/@anthropic-ai/sdk@0.24.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log("Inicio función (Gemini Mode)");

    // Intentar obtener clave de Gemini primero
    const geminiKey = Deno.env.get("GEMINI_API_KEY")
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY")

    const body = await req.json().catch(() => null)
    if (!body || !body.image_url) {
      return new Response(JSON.stringify({ error: "Falta image_url" }), { 
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { image_url } = body
    const base64Data = image_url.includes(",") ? image_url.split(",")[1] : image_url

    if (geminiKey) {
      console.log("Usando Gemini 1.5 Flash...");
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: "Analiza esta factura y devuelve SOLO un JSON: { \"proveedor\": \"string\", \"resumen\": \"string\", \"total\": number }. Si no ves el total, usa 0." },
              {
                inline_data: {
                  mime_type: "image/jpeg",
                  data: base64Data
                }
              }
            ]
          }]
        })
      });

      const result = await response.json();
      if (result.error) throw new Error(result.error.message);

      const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
      console.log("Respuesta Gemini:", text);
      
      const match = text.match(/\{[\s\S]*\}/)
      if (!match) throw new Error("No se pudo extraer JSON de la respuesta de Gemini");
      
      const data = JSON.parse(match[0]);
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });

    } else if (anthropicKey) {
      /* 
      // CÓDIGO CLAUDE (MANTENIDO COMO COMENTARIO POR SI EL CLIENTE LO REQUIERE)
      const anthropic = new Anthropic({ apiKey: anthropicKey })
      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20240620",
        max_tokens: 1024,
        messages: [{
          role: "user",
          content: [
            { type: "text", text: "Analiza esta factura y devuelve SOLO un JSON: { \"proveedor\": \"string\", \"resumen\": \"string\", \"total\": number }. Si no ves el total, usa 0." },
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: base64Data } }
          ]
        }]
      })
      const text = response.content[0].type === "text" ? response.content[0].text : ""
      ...
      */
      return new Response(JSON.stringify({ error: "Claude está deshabilitado temporalmente. Usa GEMINI_API_KEY." }), { 
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    } else {
      return new Response(JSON.stringify({ error: "Falta API Key (GEMINI_API_KEY)" }), { 
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

  } catch (err: any) {
    console.error("Error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    })
  }
})
