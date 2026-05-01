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
  dbInsertPreciosBulk,
  dbGetBorrador,
  dbSetBorrador
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
  valorInventario: number; // Valor manual del inventario total
  cargando: boolean;

  // Carga precios desde SQLite y sincroniza con Supabase
  cargar: () => Promise<void>;
  // Agrega un producto nuevo
  agregar: (p: Precio) => Promise<void>;
  // Edita un producto por ID real o índice
  editar: (idx: number, p: Precio) => Promise<void>;
  // Elimina un producto por índice
  eliminar: (idx: number) => Promise<void>;
  // Actualiza o agrega productos desde una factura procesada por IA
  actualizarDesdeFactura: (productos: any[], proveedor: string) => Promise<void>;
  // Suscribirse a cambios en tiempo real
  suscribirCambios: () => void;
  // Guardar valor manual del inventario
  setValorInventario: (monto: number) => Promise<void>;
}

export const usePreciosStore = create<PreciosStore>((set, get) => ({
  precios: [],
  valorInventario: 0,
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
      
      // Cargar valor de inventario manual
      const vInv = await dbGetBorrador('valor_inventario');

      set({ precios: data, valorInventario: vInv || 0, cargando: false });

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

  actualizarDesdeFactura: async (productos, proveedor) => {
    try {
      const { precios, agregar, editar } = get();
      console.log(`[Sinc] Procesando ${productos.length} items de ${proveedor}`);

      for (const pF of productos) {
        // Validar integridad basica
        if (!pF.nombre || typeof pF.precio_compra !== 'number' || pF.precio_compra <= 0) {
          console.warn(`[Sinc] Producto ignorado por datos invalidos:`, pF);
          continue;
        }

        const nom = pF.nombre.toLowerCase().trim();
        const idx = precios.findIndex(p => p.nombre.toLowerCase().trim() === nom);

        if (idx !== -1) {
          const pE = precios[idx];
          // Solo actualizar si el precio cambio significativamente (evitar spam)
          if (pE.compra !== pF.precio_compra) {
            await editar(idx, {
              ...pE,
              compra: pF.precio_compra,
              proveedor: proveedor,
              unidad: pF.unidad || pE.unidad
            });
          }
        } else {
          // Nuevo: Margen +20% redondeado a 50
          let ventaM = Math.round((pF.precio_compra * 1.20) / 50) * 50;
          
          // Salvaguarda para productos muy baratos (minimo ganar 100 pesos)
          if (ventaM <= pF.precio_compra) {
            ventaM = pF.precio_compra + 100;
          }

          await agregar({
            nombre: pF.nombre.trim(),
            proveedor: proveedor,
            compra: pF.precio_compra,
            venta: ventaM,
            unidad: (pF.unidad || 'und').toLowerCase().trim()
          });
        }
      }
    } catch (e) {
      console.error('Error sincronizando precios desde factura:', e);
    }
  },

  suscribirCambios: () => {
    supabase.channel('custom-all-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'precios' }, () => {
        get().cargar(); // Recargar todo cuando haya un cambio de cualquier dispositivo
      })
      .subscribe();
  },

  setValorInventario: async (monto: number) => {
    await dbSetBorrador('valor_inventario', monto);
    set({ valorInventario: monto });
  }
}));
