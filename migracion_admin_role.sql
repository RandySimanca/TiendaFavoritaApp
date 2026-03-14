-- MIGRACIÓN DE ROLES: 'duena' -> 'admin'

-- 1. Eliminar la restricción antigua (CHECK)
ALTER TABLE public.perfiles 
DROP CONSTRAINT IF EXISTS perfiles_rol_check;

-- 2. Agregar la nueva restricción con 'admin' en lugar de 'duena'
ALTER TABLE public.perfiles 
ADD CONSTRAINT perfiles_rol_check 
CHECK (rol IN ('admin', 'trabajador'));

-- 3. Actualizar los registros existentes
UPDATE public.perfiles 
SET rol = 'admin' 
WHERE rol = 'duena';

-- 4. Actualizar la función del Trigger para que use 'admin' si se solicita 
-- (aunque el default del handler sigue siendo trabajador en el script anterior, 
--  actualizamos la lógica por si acaso se pasa el rol en metadata)
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
