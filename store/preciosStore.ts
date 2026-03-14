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
      // 1. Cargar lo que haya en SQLite (rápido)
      let data = await dbGetPrecios();
      
      if (data.length === 0) {
        // Primera vez total: cargar iniciales
        await dbInsertPreciosBulk(PRECIOS_INICIALES);
        data = await dbGetPrecios();
      }
      set({ precios: data, cargando: false });

      // 2. Intentar cargar desde Supabase (sincronización)
      const { data: cloudData, error } = await supabase.from('precios').select('*');
      if (!error && cloudData && cloudData.length > 0) {
        // En un app real aquí haríamos match de IDs y timestamps.
        // Como simplificación para la Fase 2: si hay datos en Supabase, prevalecen.
        // Pero no queremos borrar SQLite si no hay internet.
        set({ precios: cloudData });
        // Opcional: actualizar SQLite con lo del cloud (pendiente lógica de diff)
      } else if (!error && cloudData && cloudData.length === 0 && data.length > 0) {
        // Si el cloud está vacío pero local tiene datos, subirlos (seed inicial cloud)
        await supabase.from('precios').insert(data.map(p => ({
          nombre: p.nombre, proveedor: p.proveedor, compra: p.compra, venta: p.venta, unidad: p.unidad
        })));
      }
    } catch (error) {
      console.error('Error cargando precios sync:', error);
      set({ cargando: false });
    }
  },

  agregar: async (p) => {
    try {
      // Local
      await dbInsertPrecio(p);
      const data = await dbGetPrecios();
      set({ precios: data });

      // Cloud
      await supabase.from('precios').insert([{
        nombre: p.nombre, proveedor: p.proveedor, compra: p.compra, venta: p.venta, unidad: p.unidad
      }]);
    } catch (error) {
      console.error('Error agregando precio sync:', error);
    }
  },

  editar: async (idx, p) => {
    try {
      const pOriginal = get().precios[idx] as any;
      if (pOriginal && pOriginal.id !== undefined) {
        // Local
        await dbUpdatePrecio(pOriginal.id, p);
        const data = await dbGetPrecios();
        set({ precios: data });

        // Cloud
        await supabase.from('precios').update({
          nombre: p.nombre, proveedor: p.proveedor, compra: p.compra, venta: p.venta, unidad: p.unidad
        }).eq('id', pOriginal.id);
      }
    } catch (error) {
      console.error('Error editando precio sync:', error);
    }
  },

  eliminar: async (idx) => {
    try {
      const pOriginal = get().precios[idx] as any;
      if (pOriginal && pOriginal.id !== undefined) {
        // Local
        await dbDeletePrecio(pOriginal.id);
        const data = await dbGetPrecios();
        set({ precios: data });

        // Cloud
        await supabase.from('precios').delete().eq('id', pOriginal.id);
      }
    } catch (error) {
      console.error('Error eliminando precio sync:', error);
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
