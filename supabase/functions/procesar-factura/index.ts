import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { Anthropic } from "https://esm.sh/@anthropic-ai/sdk@0.24.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // Manejar CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log("Inicio función");

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY")
    if (!apiKey) {
      console.error("CRÍTICO: No se encontró ANTHROPIC_API_KEY en las variables de entorno.")
      return new Response(JSON.stringify({ error: "Servidor no configurado (falta API Key)" }), { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const body = await req.json().catch(() => null)
    console.log("Body recibido:", body ? { ...body, image_url: body.image_url ? "[BASE64_OCULTO]" : null } : null);
    if (!body || !body.image_url) {
      console.error("ERROR: Cuerpo de petición inválido o falta image_url")
      return new Response(JSON.stringify({ error: "Cuerpo de petición inválido" }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { image_url } = body
    console.log("Iniciando llamada a Claude. Longitud base64:", image_url.length)

    const anthropic = new Anthropic({ apiKey })
    
    // Limpiar el base64
    const base64Data = image_url.includes(",") ? image_url.split(",")[1] : image_url

    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analiza esta factura y devuelve SOLO un JSON: { \"proveedor\": \"string\", \"resumen\": \"string\", \"total\": number }. Si no ves el total, usa 0."
            },
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/jpeg",
                data: base64Data
              }
            }
          ]
        }
      ]
    })

    const text = response.content[0].type === "text" ? response.content[0].text : ""
    console.log("Respuesta bruta de Claude:", text)

    // Extraer el JSON
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) {
      console.error("ERROR: Claude no devolvió JSON válido")
      throw new Error("Respuesta de IA no tiene formato JSON")
    }

    const data = JSON.parse(match[0])
    console.log("Éxito. Proveedor:", data.proveedor, "Total:", data.total)

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    })

  } catch (err: any) {
    console.error("ERROR REAL:", err);
    console.error("Detalle del error completo:", JSON.stringify(err, Object.getOwnPropertyNames(err)));
    
    return new Response(JSON.stringify({ error: err?.message || 'Error desconocido', stack: err?.stack }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    })
  }
})
