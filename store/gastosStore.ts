import { create } from 'zustand';
import { dbGetGastosAdministrativos, dbInsertGastoAdmon, dbDeleteGastoAdmon } from '../utils/database';
import { supabase } from '../utils/supabase';

export interface GastoAdmon {
  id: string;
  mes: string;
  concepto: string;
  monto: number;
  categoria: string;
  fuente: string;
  timestamp: number;
}

interface GastosStore {
  gastos: GastoAdmon[];
  cargando: boolean;

  cargar: (mes?: string) => Promise<void>;
  agregarGasto: (g: Omit<GastoAdmon, 'timestamp'>) => Promise<void>;
  eliminarGasto: (id: string) => Promise<void>;
  suscribirCambios: () => void;
}

export const useGastosStore = create<GastosStore>((set, get) => ({
  gastos: [],
  cargando: true,

  cargar: async (mes) => {
    try {
      const data = await dbGetGastosAdministrativos(mes);
      set({ gastos: data as GastoAdmon[], cargando: false });

      // Sync Cloud
      (async () => {
        let query = supabase.from('gastos_administrativos').select('*');
        if (mes) query = query.eq('mes', mes);
        
        const { data: cloudData, error } = await query.order('timestamp', { ascending: false });
        if (!error && cloudData) {
          set({ gastos: cloudData as GastoAdmon[] });
        }
      })();
    } catch (e) {
      console.error('Error cargando gastos:', e);
      set({ cargando: false });
    }
  },

  agregarGasto: async (g) => {
    try {
      const nuevo = { ...g, timestamp: Date.now() };
      await dbInsertGastoAdmon(nuevo);
      await get().cargar(g.mes);

      await supabase.from('gastos_administrativos').upsert(nuevo);
    } catch (e) {
      console.error('Error agregando gasto:', e);
    }
  },

  eliminarGasto: async (id) => {
    try {
      const mes = get().gastos.find(g => g.id === id)?.mes;
      await dbDeleteGastoAdmon(id);
      await get().cargar(mes);

      await supabase.from('gastos_administrativos').delete().eq('id', id);
    } catch (e) {
      console.error('Error eliminando gasto:', e);
    }
  },

  suscribirCambios: () => {
    supabase.channel('gastos-admon-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gastos_administrativos' }, () => {
        get().cargar();
      })
      .subscribe();
  }
}));
