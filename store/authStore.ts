// ═══════════════════════════════════════════════════

import { create } from 'zustand';
import { supabase } from '../utils/supabase';
import { User } from '@supabase/supabase-js';

export type Rol = 'admin' | 'trabajador' | null;

interface Perfil {
  nombre: string;
  rol: Rol;
  tienda_id: string;
}

interface AuthStore {
  user: User | null;
  rol: Rol;
  perfil: Perfil | null;
  cargando: boolean;
  
  // Acciones
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  cerrarSesion: () => Promise<void>;
  recuperarSesion: () => Promise<void>;
  actualizarPassword: (nuevaPass: string) => Promise<{ error: string | null }>;
  
  // Acciones Administrativas (Dueña)
  crearTrabajador: (email: string, pass: string, nombre: string) => Promise<{ error: string | null }>;
  
  // Helpers
  esDuena: () => boolean;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  rol: null,
  perfil: null,
  cargando: true,

  login: async (email, password) => {
    try {
      set({ cargando: true });
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Buscar el perfil
      const { data: p, error: perfilError } = await supabase
        .from('perfiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (perfilError) throw perfilError;

      set({ 
        user: data.user, 
        rol: p.rol as Rol,
        perfil: p as Perfil
      });

      return { error: null };
    } catch (error: any) {
      console.error("Error en login:", error.message);
      return { error: error.message };
    } finally {
      set({ cargando: false });
    }
  },

  actualizarPassword: async (nuevaPass: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: nuevaPass
      });
      if (error) throw error;
      return { error: null };
    } catch (error: any) {
      return { error: error.message };
    }
  },

  crearTrabajador: async (email, password, nombre) => {
    try {
      const { data, error } = await supabase.functions.invoke('gestionar-usuarios', {
        body: { 
          action: 'crear-trabajador',
          email,
          password,
          nombre,
          rol: 'trabajador'
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      return { error: null };
    } catch (error: any) {
      console.error("Error creando trabajador:", error.message);
      return { error: error.message };
    }
  },

  cerrarSesion: async () => {
    await supabase.auth.signOut();
    set({ user: null, rol: null, perfil: null });
  },

  recuperarSesion: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        set({ user: session.user });
        
        const { data: p } = await supabase
          .from('perfiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
          
        if (p) {
          set({ rol: p.rol as Rol, perfil: p as Perfil });
        }
      }
    } catch (error) {
      console.error("Error recuperando sesión:", error);
    } finally {
      set({ cargando: false });
    }
  },

  esDuena: () => get().rol === 'admin',
}));
