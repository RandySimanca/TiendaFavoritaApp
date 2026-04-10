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

export type GastoRecurrente = {
  id: string;
  concepto: string;
  monto: number;
  categoria: string;
  fuente: 'Caja' | 'Banco';
  dia: number;
  activo: boolean;
};

interface GastosStore {
  gastos: GastoAdmon[];
  gastosRecurrentes: GastoRecurrente[];
  cargando: boolean;

  cargar: (mes?: string) => Promise<void>;
  agregarGasto: (g: Omit<GastoAdmon, 'timestamp'> & { timestamp?: number }) => Promise<void>;
  eliminarGasto: (id: string) => Promise<void>;
  suscribirCambios: () => void;
  
  cargarRecurrentes: () => Promise<void>;
  guardarRecurrentes: (recurrentes: GastoRecurrente[]) => Promise<void>;
}

export const useGastosStore = create<GastosStore>((set, get) => ({
  gastos: [],
  gastosRecurrentes: [],
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
      const nuevo = { timestamp: Date.now(), ...g } as GastoAdmon;
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
  },

  cargarRecurrentes: async () => {
    try {
      const { dbGetBorrador } = require('../utils/database');
      const data = await dbGetBorrador('config_recurrentes');
      if (data) set({ gastosRecurrentes: data });
    } catch(e) {
      console.log('No recurrences stored yet');
    }
  },

  guardarRecurrentes: async (recurrentes) => {
    const { dbSetBorrador } = require('../utils/database');
    await dbSetBorrador('config_recurrentes', recurrentes);
    set({ gastosRecurrentes: recurrentes });
  }
}));
