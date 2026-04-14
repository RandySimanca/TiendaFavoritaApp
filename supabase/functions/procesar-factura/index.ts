import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const prompt = `Analiza esta factura y devuelve SOLO un JSON con esta estructura:
    {
      "proveedor": "string",
      "resumen": "string",
      "total": number,
      "productos": [
        { "nombre": "string", "precio_compra": number, "unidad": "string (unid, kg, lb, etc.)" }
      ]
    }
    Si no ves productos o el total, usa valores por defecto (0 o []).`;

    // 1. ESTRATEGIA A: Gemini
    if (geminiKey) {
      console.log("Iniciando procesamiento con Gemini...");
      const visionModels = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite"
];

      for (const modelName of visionModels) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiKey}`;
          console.log(`Llamando a Gemini (${modelName})...`);
          
          const response = await fetch(url, {
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

          console.log(`Status HTTP (${modelName}):`, response.status);
          const result = await response.json();

          if (result.error) {
            console.error(`Error detallado de Google (${modelName}):`, JSON.stringify(result.error));
            continue;
          }

          const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
          if (!text) {
            console.warn(`Respuesta vacía de ${modelName}, intentando siguiente...`);
            continue;
          }

          console.log(`Éxito con ${modelName}.`);
          
          // Limpieza profunda de JSON
          let cleanText = text;
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            cleanText = jsonMatch[0];
          } else {
            cleanText = text.replace(/```json|```/g, "").trim();
          }

          const data = JSON.parse(cleanText);
          
          return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        } catch (e: any) {
          console.warn(`Intento fallido con ${modelName}:`, e.message);
        }
      }
    }

    // 2. ESTRATEGIA B: OpenAI (fallback)
    if (openaiKey) {
      console.log("Usando OpenAI (GPT-4o) como fallback...");
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
        console.warn("Fallo OpenAI:", e.message);
      }
    }

    // Fallo final
    const reason = !geminiKey && !openaiKey && !anthropicKey 
      ? "Faltan las API Keys en Supabase (GEMINI_API_KEY, etc.)" 
      : "Todos los proveedores de IA fallaron. Revisa tus créditos o que la imagen sea legible.";
      
    throw new Error(reason);

  } catch (err: any) {
    console.error("Fallo Crítico:", err.message);
    return new Response(JSON.stringify({ 
      error: err.message, 
      details: "Revisa los logs de Supabase para ver el error detallado de Google/OpenAI." 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500
    })
  }
})
