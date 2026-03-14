import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"

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
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // 1. Verificar que el usuario que llama es ADMIN (Duena)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('No se proporcionó token de autorización')

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError || !user) throw new Error('Usuario no autenticado')

    // Consultar el rol en la tabla perfiles
    const { data: perfil, error: perfilError } = await supabaseAdmin
      .from('perfiles')
      .select('rol')
      .eq('id', user.id)
      .single()

    if (perfilError || perfil?.rol !== 'admin') {
      throw new Error('No tienes permisos para realizar esta acción. Solo el Administrador puede gestionar usuarios.')
    }

    // 2. Procesar la solicitud según la acción
    const { action, email, password, nombre, rol = 'trabajador' } = await req.json()

    if (action === 'crear-trabajador') {
      if (!email || !password || !nombre) throw new Error('Faltan datos requeridos (email, password, nombre)')

      console.log(`Creando trabajador: ${email}`)

      // Crear usuario en Auth
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { nombre, rol }
      })

      if (createError) throw createError

      // El perfil se crea automáticamente por el Trigger SQL que definimos antes
      // Pero podemos forzar el nombre y rol por si el trigger tarda o falla
      await supabaseAdmin
        .from('perfiles')
        .update({ nombre, rol })
        .eq('id', newUser.user.id)

      return new Response(JSON.stringify({ success: true, user: newUser.user }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    throw new Error('Acción no válida')

  } catch (error: any) {
    console.error("ERROR EN EDGE FUNCTION:", error.message)
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})
