import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log("Inicio función (Gemini v2 Mode)");

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
      console.log("Gemini 1.5 Flash (Standard Mode)...");
      
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
      
      if (result.error) {
        throw new Error(`Detalle Error: ${result.error.message} (Code: ${result.error.code})`);
      }

      const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
      console.log("Respuesta Gemini OK.");
      
      const match = text.match(/\{[\s\S]*\}/)
      if (!match) throw new Error("La IA no detectó una factura válida en esta imagen.");
      
      const data = JSON.parse(match[0]);
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });

    } else if (anthropicKey) {
      return new Response(JSON.stringify({ error: "Claude deshabilitado." }), { 
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    } else {
      return new Response(JSON.stringify({ error: "Falta GEMINI_API_KEY" }), { 
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

  } catch (err: any) {
    console.error("Fallo:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    })
  }
})
