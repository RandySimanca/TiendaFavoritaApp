import { create } from 'zustand';
import { dbGetCierresMensuales, dbInsertCierreMensual, dbDeleteCierreMensual } from '../utils/database';
import { supabase } from '../utils/supabase';
import { generarCierreMensual } from '../utils/calcular';
import { useGastosStore } from './gastosStore';

export interface CierreMensual {
  mes: string;
  venta_total: number;
  compras_total: number;
  gasto_total: number;
  retiros_total: number;
  prestamos_total: number;
  ingresos_total: number;
  utilidad: number;
  transacciones: number;
  inventario_final: number;
  json_detalle: string;
  timestamp: number;
}

interface MensualStore {
  cierres: CierreMensual[];
  cargando: boolean;

  cargar: () => Promise<void>;
  realizarCierre: (mes: string, historial: any[], inventarioFinal?: number) => Promise<void>;
  reabrirMes: (mes: string) => Promise<void>;
  suscribirCambios: () => void;
}

export const useMensualStore = create<MensualStore>((set, get) => ({
  cierres: [],
  cargando: true,

  cargar: async () => {
    try {
      const data = await dbGetCierresMensuales();
      set({ cierres: data as CierreMensual[], cargando: false });

      // Sincronización en segundo plano con la nube
      (async () => {
        const { data: cloudData, error } = await supabase
          .from('cierres_mensuales')
          .select('*')
          .order('mes', { ascending: false });

        if (!error && cloudData) {
          // TODO: Merge inteligente, por ahora gana nube
          set({ cierres: cloudData as CierreMensual[] });
        }
      })();
    } catch (e) {
      console.error('Error cargando cierres mensuales:', e);
      set({ cargando: false });
    }
  },

  realizarCierre: async (mes, historial, inventarioFinal) => {
    try {
      const gastosAdmon = useGastosStore.getState().gastos;
      const cierreData = generarCierreMensual(mes, historial, gastosAdmon);
      const cierre = { ...cierreData, inventario_final: inventarioFinal || 0 };
      
      // 1. Local
      await dbInsertCierreMensual(cierre);
      const nuevos = await dbGetCierresMensuales();
      set({ cierres: nuevos as CierreMensual[] });

      // 2. Cloud
      const { error } = await supabase
        .from('cierres_mensuales')
        .upsert({ ...cierre, timestamp: Date.now() });

      if (error) console.error('Error cloud cierre mensual:', error.message);
    } catch (e) {
      console.error('Error realizando cierre mensual:', e);
    }
  },

  reabrirMes: async (mes: string) => {
    try {
      // 1. Local
      await dbDeleteCierreMensual(mes);
      const nuevos = await dbGetCierresMensuales();
      set({ cierres: nuevos as CierreMensual[] });

      // 2. Cloud
      const { error } = await supabase
        .from('cierres_mensuales')
        .delete()
        .eq('mes', mes);

      if (error) console.error('Error cloud eliminando cierre mensual:', error.message);
    } catch (e) {
      console.error('Error reabriendo mes:', e);
    }
  },

  suscribirCambios: () => {
    supabase.channel('mensual-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cierres_mensuales' }, () => {
        get().cargar();
      })
      .subscribe();
  }
}));
