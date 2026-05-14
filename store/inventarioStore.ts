// store/inventarioStore.ts
import { create } from 'zustand';
import { supabase } from '../utils/supabase';
import {
  dbGetInventarioItems,
  dbUpsertInventarioItem,
  dbDeleteInventarioItem,
  dbGetInventarioMovimientos,
  dbInsertInventarioMovimiento,
} from '../utils/database';

export interface ItemInventario {
  id: string;
  producto_id?: number;
  nombre: string;
  proveedor: string;
  precio_compra: number;
  precio_venta: number;
  unidad: string;
  cantidad: number;
  fecha_conteo: string;
  fecha_vencimiento?: string;
  categoria?: string;
  notas?: string;
  activo: boolean;
}

export interface MovimientoInventario {
  id: string;
  item_id: string;
  nombre_producto: string;
  tipo: 'ENTRADA' | 'SALIDA' | 'AJUSTE' | 'MERMA';
  cantidad: number;
  precio_unitario: number;
  valor_total: number;
  concepto: string;
  fecha: string;
  timestamp: number;
}

export interface ResumenInventario {
  totalItems: number;
  valorCosto: number;
  valorVenta: number;
  utilidadPotencial: number;
  margenBruto: number;
  itemsSinStock: number;
  itemsPorVencer: number;
  topProductos: { nombre: string; valor: number }[];
}

interface InventarioStore {
  items: ItemInventario[];
  movimientos: MovimientoInventario[];
  cargando: boolean;
  ultimoConteo: string;

  cargar: () => Promise<void>;
  agregarItem: (item: Omit<ItemInventario, 'id'>) => Promise<void>;
  actualizarItem: (id: string, datos: Partial<ItemInventario>) => Promise<void>;
  eliminarItem: (id: string) => Promise<void>;
  registrarMovimiento: (mov: Omit<MovimientoInventario, 'id' | 'timestamp'>) => Promise<void>;
  registrarConteoFisico: (conteos: { id: string; cantidad: number }[]) => Promise<void>;
  calcularResumen: () => ResumenInventario;
  sincronizarConCatalogo: (precios: any[]) => Promise<void>;
}

function newId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

export const useInventarioStore = create<InventarioStore>((set, get) => ({
  items: [],
  movimientos: [],
  cargando: true,
  ultimoConteo: '',

  cargar: async () => {
    try {
      const itemsLocal = await dbGetInventarioItems();
      const movsLocal  = await dbGetInventarioMovimientos();
      const parsedItems: ItemInventario[] = itemsLocal.map(i => ({ ...i, activo: !!i.activo }));
      const ultimoConteo = parsedItems.length > 0
        ? parsedItems.reduce((max, i) => (i.fecha_conteo || '') > max ? (i.fecha_conteo || '') : max, '')
        : '';
      set({ items: parsedItems, movimientos: movsLocal, cargando: false, ultimoConteo });

      // Sync Supabase en background — falla silenciosamente si la tabla no existe
      (async () => {
        try {
          const { data: cloudItems, error: e1 } = await supabase
            .from('inventario_items').select('*').eq('activo', true).order('nombre');
          if (!e1 && cloudItems && cloudItems.length > 0) {
            for (const ci of cloudItems) {
              await dbUpsertInventarioItem({ ...ci, activo: true });
            }
            const reloaded = await dbGetInventarioItems();
            set({ items: reloaded.map(i => ({ ...i, activo: !!i.activo })) });
          }

          const { data: cloudMovs, error: e2 } = await supabase
            .from('inventario_movimientos').select('*')
            .order('timestamp', { ascending: false }).limit(300);
          if (!e2 && cloudMovs && cloudMovs.length > 0) {
            for (const cm of cloudMovs) {
              await dbInsertInventarioMovimiento(cm).catch(() => {});
            }
            const reloadedMovs = await dbGetInventarioMovimientos();
            set({ movimientos: reloadedMovs });
          }
        } catch {
          console.log('[inventarioStore] sync offline, usando caché local');
        }
      })();
    } catch (e) {
      console.error('[inventarioStore] error cargando:', e);
      set({ cargando: false });
    }
  },

  agregarItem: async (datos) => {
    try {
      const nuevo: ItemInventario = { ...datos, id: newId('inv'), activo: true };
      await dbUpsertInventarioItem(nuevo);
      const items = await dbGetInventarioItems();
      set({ items: items.map(i => ({ ...i, activo: !!i.activo })) });
      supabase.from('inventario_items').insert(nuevo).then(({ error }) => {
        if (error) console.warn('[inv] cloud insert:', error.message);
      });
    } catch (e) { console.error('[inv] agregarItem:', e); }
  },

  actualizarItem: async (id, datos) => {
    try {
      const item = get().items.find(i => i.id === id);
      if (!item) return;
      const actualizado = { ...item, ...datos };
      await dbUpsertInventarioItem(actualizado);
      const items = await dbGetInventarioItems();
      set({ items: items.map(i => ({ ...i, activo: !!i.activo })) });
      supabase.from('inventario_items').update(datos).eq('id', id).then(({ error }) => {
        if (error) console.warn('[inv] cloud update:', error.message);
      });
    } catch (e) { console.error('[inv] actualizarItem:', e); }
  },

  eliminarItem: async (id) => {
    try {
      await dbDeleteInventarioItem(id);
      const items = await dbGetInventarioItems();
      set({ items: items.map(i => ({ ...i, activo: !!i.activo })) });
      supabase.from('inventario_items').update({ activo: false }).eq('id', id).then();
    } catch (e) { console.error('[inv] eliminarItem:', e); }
  },

  registrarMovimiento: async (movSinId) => {
    try {
      const mov: MovimientoInventario = { ...movSinId, id: newId('mov'), timestamp: Date.now() };

      const item = get().items.find(i => i.id === mov.item_id);
      if (item) {
        let nuevaCantidad = item.cantidad;
        if      (mov.tipo === 'ENTRADA')                       nuevaCantidad += mov.cantidad;
        else if (mov.tipo === 'SALIDA' || mov.tipo === 'MERMA') nuevaCantidad -= mov.cantidad;
        else if (mov.tipo === 'AJUSTE')                         nuevaCantidad  = mov.cantidad;
        await get().actualizarItem(item.id, {
          cantidad: Math.max(0, nuevaCantidad),
          fecha_conteo: mov.fecha,
        });
      }

      await dbInsertInventarioMovimiento(mov);
      const movimientos = await dbGetInventarioMovimientos();
      set({ movimientos });
      supabase.from('inventario_movimientos').insert(mov).then(({ error }) => {
        if (error) console.warn('[inv] cloud mov:', error.message);
      });
    } catch (e) { console.error('[inv] registrarMovimiento:', e); }
  },

  registrarConteoFisico: async (conteos) => {
    const hoy = new Date().toISOString().split('T')[0];
    for (const c of conteos) {
      const item = get().items.find(i => i.id === c.id);
      if (!item) continue;
      const dif = c.cantidad - item.cantidad;
      await get().registrarMovimiento({
        item_id: c.id,
        nombre_producto: item.nombre,
        tipo: 'AJUSTE',
        cantidad: c.cantidad,
        precio_unitario: item.precio_compra,
        valor_total: c.cantidad * item.precio_compra,
        concepto: dif !== 0
          ? `Conteo físico — diferencia: ${dif > 0 ? '+' : ''}${dif} ${item.unidad}`
          : 'Conteo físico confirmado — sin diferencias',
        fecha: hoy,
      });
    }
    set({ ultimoConteo: hoy });
  },

  calcularResumen: (): ResumenInventario => {
    const activos = get().items.filter(i => i.activo);
    const hoy     = new Date().toISOString().split('T')[0];
    const en7Dias = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const valorCosto        = activos.reduce((a, i) => a + i.cantidad * i.precio_compra, 0);
    const valorVenta        = activos.reduce((a, i) => a + i.cantidad * i.precio_venta,  0);
    const utilidadPotencial = valorVenta - valorCosto;
    const margenBruto       = valorVenta > 0 ? (utilidadPotencial / valorVenta) * 100 : 0;
    const itemsSinStock     = activos.filter(i => i.cantidad <= 0).length;
    const itemsPorVencer    = activos.filter(i =>
      i.fecha_vencimiento && i.fecha_vencimiento >= hoy && i.fecha_vencimiento <= en7Dias
    ).length;
    const topProductos = [...activos]
      .sort((a, b) => b.cantidad * b.precio_compra - a.cantidad * a.precio_compra)
      .slice(0, 5)
      .map(i => ({ nombre: i.nombre, valor: i.cantidad * i.precio_compra }));

    return { totalItems: activos.length, valorCosto, valorVenta,
             utilidadPotencial, margenBruto, itemsSinStock, itemsPorVencer, topProductos };
  },

  sincronizarConCatalogo: async (precios) => {
    const existentes = new Set(get().items.map(i => i.nombre.toLowerCase()));
    const hoy = new Date().toISOString().split('T')[0];
    for (const p of precios) {
      if (!existentes.has((p.nombre || '').toLowerCase())) {
        await get().agregarItem({
          producto_id: p.id,
          nombre: p.nombre,
          proveedor: p.proveedor || '',
          precio_compra: p.compra || 0,
          precio_venta:  p.venta  || 0,
          unidad: p.unidad || 'und',
          cantidad: 0,
          fecha_conteo: hoy,
          activo: true,
        });
      }
    }
  },
}));
