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
    console.log("Inicio función (Multi-IA Mode)");

    const openaiKey = Deno.env.get("OPENAI_API_KEY")
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
    const prompt = "Analiza esta factura y devuelve SOLO un JSON: { \"proveedor\": \"string\", \"resumen\": \"string\", \"total\": number }. Si no ves el total, usa 0.";

    // 1. ESTRATEGIA A: OpenAI (Muy estable y rápido con gpt-4o-mini)
    if (openaiKey) {
      console.log("Usando OpenAI (GPT-4o)...");
      try {
        const resp = await fetch("https://api.openai.com/v1/chat/completions", {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: prompt },
                  { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Data}` } }
                ]
              }
            ],
            response_format: { type: "json_object" }
          })
        });

        const result = await resp.json();
        if (result.error) throw new Error(result.error.message);
        
        const data = JSON.parse(result.choices[0].message.content);
        console.log("Éxito con OpenAI.");
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200
        });
      } catch (e: any) {
        console.warn("Fallo OpenAI, intentando alternativas...", e.message);
      }
    }

    // 2. ESTRATEGIA B: Gemini (Fallback Multimodelo)
    if (geminiKey) {
      console.log("Iniciando procesamiento IA (Gemini)...");
      const visionModels = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro-vision"];
      let lastError = null;

      for (const modelName of visionModels) {
        try {
          console.log(`Intentando con modelo: ${modelName}...`);
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { text: prompt },
                  { inline_data: { mime_type: "image/jpeg", data: base64Data } }
                ]
              }]
            })
          });

          const result = await response.json();
          if (result.error) {
            if (result.error.code === 404 || result.error.status === "NOT_FOUND") {
              continue;
            }
            throw new Error(result.error.message);
          }

          const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
          if (!text) continue;

          console.log(`Éxito con ${modelName}.`);
          const match = text.match(/\{[\s\S]*\}/)
          if (!match) continue;
          
          const data = JSON.parse(match[0]);
          return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        } catch (e: any) {
          lastError = e.message;
        }
      }
      console.warn("Fallo total en Gemini:", lastError);
    }

    // 3. ESTRATEGIA C: Claude (Comentado/Deshabilitado por créditos)
    if (anthropicKey && !openaiKey && !geminiKey) {
       // ... lógia de Claude si fuera necesaria
    }

    // Falló todo
    throw new Error("No hay API Key configurada o todos los proveedores fallaron.");

  } catch (err: any) {
    console.error("Fallo Crítico:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500
    })
  }
})
