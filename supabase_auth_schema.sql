-- Tabla para perfiles de usuario
CREATE TABLE IF NOT EXISTS public.perfiles (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  rol TEXT CHECK (rol IN ('admin', 'trabajador')) DEFAULT 'trabajador',
  nombre TEXT,
  tienda_id TEXT DEFAULT 'tienda_principal', -- Para futura expansión multi-tienda
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;

-- Borrar políticas si existen (para re-ejecución limpia)
DROP POLICY IF EXISTS "Perfiles visibles por el propio usuario" ON public.perfiles;
DROP POLICY IF EXISTS "Usuarios pueden actualizar su propio perfil" ON public.perfiles;

-- Políticas de RLS para perfiles
CREATE POLICY "Perfiles visibles por el propio usuario" 
ON public.perfiles FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Usuarios pueden actualizar su propio perfil" 
ON public.perfiles FOR UPDATE 
USING (auth.uid() = id);

-- Trigger para crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.perfiles (id, rol, nombre)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'rol', 'trabajador'), 
    new.raw_user_meta_data->>'nombre'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Borrar trigger y función antiguos si existen
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
