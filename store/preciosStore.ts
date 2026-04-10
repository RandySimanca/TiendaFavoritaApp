// ═══════════════════════════════════════════════════
// Store de precios — lista de productos de la tienda
// Carga precios iniciales la primera vez que se abre la app
// ═══════════════════════════════════════════════════

import { create } from 'zustand';
import { PRECIOS_INICIALES } from '../data/preciosIniciales';
import { 
  dbGetPrecios, 
  dbInsertPrecio, 
  dbUpdatePrecio, 
  dbDeletePrecio, 
  dbInsertPreciosBulk 
} from '../utils/database';
import { supabase } from '../utils/supabase';

export interface Precio {
  id?: number;
  nombre: string;
  proveedor: string;
  compra: number;
  venta: number;
  unidad: string;
  user_id?: string;
}

interface PreciosStore {
  precios: Precio[];
  cargando: boolean;

  // Carga precios desde SQLite y sincroniza con Supabase
  cargar: () => Promise<void>;
  // Agrega un producto nuevo
  agregar: (p: Precio) => Promise<void>;
  // Edita un producto por ID real o índice
  editar: (idx: number, p: Precio) => Promise<void>;
  // Elimina un producto por índice
  eliminar: (idx: number) => Promise<void>;
  // Suscribirse a cambios en tiempo real
  suscribirCambios: () => void;
}

export const usePreciosStore = create<PreciosStore>((set, get) => ({
  precios: [],
  cargando: true,

  cargar: async () => {
    try {
      // 1. Cargar lo que haya en SQLite (instantáneo)
      let data = await dbGetPrecios();
      
      if (data.length === 0) {
        // Primera vez: cargar todos los iniciales
        await dbInsertPreciosBulk(PRECIOS_INICIALES);
        data = await dbGetPrecios();
      } else {
        // Detectar productos nuevos en PRECIOS_INICIALES que no están en la BD
        const nombresExistentes = new Set(data.map(p => p.nombre.toLowerCase()));
        const nuevos = PRECIOS_INICIALES.filter(p => !nombresExistentes.has(p.nombre.toLowerCase()));
        if (nuevos.length > 0) {
          console.log(`Insertando ${nuevos.length} productos nuevos del catálogo...`);
          await dbInsertPreciosBulk(nuevos);
          data = await dbGetPrecios();
        }
      }
      set({ precios: data, cargando: false });

      // 2. Sincronización en segundo plano (sin await para no bloquear la UI)
      (async () => {
        try {
          const { data: cloudData, error } = await supabase.from('precios').select('*');
          if (!error && cloudData && cloudData.length > 0) {
            // Verificar si hay productos nuevos que no están en cloud
            const nombresCloud = new Set(cloudData.map((p: any) => p.nombre?.toLowerCase()));
            const faltanEnCloud = data.filter(p => !nombresCloud.has(p.nombre.toLowerCase()));
            if (faltanEnCloud.length > 0) {
              await supabase.from('precios').insert(faltanEnCloud.map(p => ({
                nombre: p.nombre, proveedor: p.proveedor, compra: p.compra, venta: p.venta, unidad: p.unidad
              })));
              // Recargar cloud completo después de insertar
              const { data: cloudActualizado } = await supabase.from('precios').select('*');
              if (cloudActualizado) {
                const limpios = cloudActualizado.filter((p: any) => p && p.nombre);
                set({ precios: limpios });
              }
            } else {
              const limpios = cloudData.filter((p: any) => p && p.nombre);
              set({ precios: limpios });
            }
          } else if (!error && cloudData && cloudData.length === 0 && data.length > 0) {
            // Seed inicial al cloud si está vacío
            await supabase.from('precios').insert(data.map(p => ({
              nombre: p.nombre, proveedor: p.proveedor, compra: p.compra, venta: p.venta, unidad: p.unidad
            })));
          }
        } catch (e) {
          console.log('Sync de precios falló (offline):', e);
        }
      })();

    } catch (error) {
      console.error('Error cargando precios local:', error);
      set({ cargando: false });
    }
  },

  agregar: async (p) => {
    try {
      // 1. Guardar en SQLite y actualizar UI inmediatamente
      await dbInsertPrecio(p);
      const data = await dbGetPrecios();
      set({ precios: data });

      // 2. Intentar guardar en nube en segundo plano (silencioso)
      supabase.from('precios').insert([{
        nombre: p.nombre, proveedor: p.proveedor, compra: p.compra, venta: p.venta, unidad: p.unidad
      }]).then(({ error }) => {
        if (error) console.log('Error cloud agregar precio:', error.message);
      });

    } catch (error) {
      console.error('Error agregando precio local:', error);
    }
  },

  editar: async (idx, p) => {
    try {
      const pOriginal = get().precios[idx] as any;
      if (pOriginal && pOriginal.id !== undefined) {
        // 1. Local
        await dbUpdatePrecio(pOriginal.id, p);
        const data = await dbGetPrecios();
        set({ precios: data });

        // 2. Cloud (silencioso)
        supabase.from('precios').update({
          nombre: p.nombre, proveedor: p.proveedor, compra: p.compra, venta: p.venta, unidad: p.unidad
        }).eq('id', pOriginal.id).then(({ error }) => {
          if (error) console.log('Error cloud editar precio:', error.message);
        });
      }
    } catch (error) {
      console.error('Error editando precio local:', error);
    }
  },

  eliminar: async (idx) => {
    try {
      const pOriginal = get().precios[idx] as any;
      if (pOriginal && pOriginal.id !== undefined) {
        // 1. Local
        await dbDeletePrecio(pOriginal.id);
        const data = await dbGetPrecios();
        set({ precios: data });

        // 2. Cloud (silencioso)
        supabase.from('precios').delete().eq('id', pOriginal.id).then(({ error }) => {
          if (error) console.log('Error cloud eliminar precio:', error.message);
        });
      }
    } catch (error) {
      console.error('Error eliminando precio local:', error);
    }
  },

  suscribirCambios: () => {
    supabase.channel('custom-all-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'precios' }, () => {
        get().cargar(); // Recargar todo cuando haya un cambio de cualquier dispositivo
      })
      .subscribe();
  }
}));
