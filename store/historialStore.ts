// ═══════════════════════════════════════════════════
// Store del historial — días guardados
// Persiste en AsyncStorage (equivalente al localStorage del HTML)
// ═══════════════════════════════════════════════════

import { create } from 'zustand';
import { 
  dbGetHistorial, 
  dbInsertHistorial, 
  dbDeleteHistorial,
  dbGetRetiros,
  dbInsertRetiro,
  dbDeleteRetiro
} from '../utils/database';
import { supabase } from '../utils/supabase';

export interface DiaGuardado {
  fecha: string;
  base: number;
  cierre: number;
  retiro: number;
  notaRetiro?: string;
  compras: number;
  facturas: { proveedor: string; resumen: string; total: number }[];
  gastos: { nombre: string; valor: number }[];
  creditos: { nombre: string; valor: number }[];
  pagos: { nombre: string; valor: number }[];
  transferenciaVentas: { nombre: string; valor: number }[];
  transferenciaPagos: { nombre: string; valor: number }[];
  totalGastos: number;
  totalCreditos: number;
  totalPagos: number;
  totalTv: number;
  totalTp: number;
  ventasEf: number;
  ventasTr: number;
  total: number;
  ts: number;
}

export interface Retiro {
  id?: number;
  fecha: string;
  valor: number;
  nota?: string;
  ts: number;
}

interface HistorialStore {
  historial: DiaGuardado[];
  retiros: Retiro[];
  cargando: boolean;

  // Carga historial y retiros desde SQLite y Supabase
  cargar: () => Promise<void>;
  // Guarda o reemplaza un día en el historial (local + cloud)
  guardarDia: (estado: any) => Promise<void>;
  // Elimina un día por fecha (identificador único del historial)
  eliminarDia: (fecha: string) => Promise<void>;
  // Elimina un retiro por ID real de la DB
  eliminarRetiro: (id: number) => Promise<void>;
  // Suscribirse a cambios en tiempo real
  suscribirCambios: () => void;
}

export const useHistorialStore = create<HistorialStore>((set, get) => ({
  historial: [],
  retiros: [],
  cargando: true,

  cargar: async () => {
    try {
      // 1. Cargar local (instantáneo)
      const dataHist = await dbGetHistorial();
      const dataRet  = await dbGetRetiros();
      
      const historial = dataHist.map(h => JSON.parse(h.datos_json));
      const retiros = dataRet.map(r => ({
        id: r.id, fecha: r.fecha, valor: r.valor, nota: r.nota, ts: r.timestamp
      }));

      set({ historial, retiros, cargando: false });

      // 2. Sincronizar en segundo plano (silencioso)
      (async () => {
        try {
          const { data: cloudHist, error: errH } = await supabase.from('historial').select('*');
          const { data: cloudRet,  error: errR } = await supabase.from('retiros').select('*');

          if (!errH && cloudHist && cloudHist.length > 0) {
            const hCloud = cloudHist.map(h => h.datos_json);
            set({ historial: hCloud });
          }

          if (!errR && cloudRet && cloudRet.length > 0) {
            const rCloud = cloudRet.map(r => ({
              id: r.id, fecha: r.fecha, valor: r.valor, nota: r.nota, ts: r.timestamp
            }));
            set({ retiros: rCloud });
          }
        } catch (e) {
          console.log('Sync historial cloud falló (offline):', e);
        }
      })();

    } catch (error) {
      console.error('Error cargando historial local:', error);
      set({ cargando: false });
    }
  },

  guardarDia: async (estado) => {
    try {
      // 1. Local (Prioritario)
      await dbInsertHistorial(estado.fecha, estado, estado.total);
      
      // 2. Cloud (Background)
      supabase.from('historial').upsert({
        fecha: estado.fecha,
        datos_json: estado,
        total_vendido: estado.total
      }).then(({ error }) => {
        if (error) console.log('Sync historial upsert falló (offline):', error.message);
      });
      
      // Manejo de Retiros
      if (estado.retiro && estado.retiro > 0) {
        const existe = get().retiros.find(r => r.fecha === estado.fecha);
        if (existe && existe.id !== undefined) {
          await dbDeleteRetiro(existe.id);
          supabase.from('retiros').delete().eq('id', existe.id).then();
        }
        
        await dbInsertRetiro(estado.fecha, estado.retiro, estado.notaRetiro || '');
        supabase.from('retiros').insert({
          fecha: estado.fecha, valor: estado.retiro, nota: estado.notaRetiro || '', timestamp: Date.now()
        }).then();
      }
      
      // Recargar de local para asegurar consistencia UI
      await get().cargar();
    } catch (error) {
      console.error('Error guardando historial local:', error);
    }
  },

  eliminarDia: async (fecha) => {
    try {
      // 1. Local
      await dbDeleteHistorial(fecha);
      // 2. Cloud
      supabase.from('historial').delete().eq('fecha', fecha).then();
      
      await get().cargar();
    } catch (error) {
      console.error('Error eliminando historial local:', error);
    }
  },

  eliminarRetiro: async (id) => {
    try {
      // 1. Local
      await dbDeleteRetiro(id);
      // 2. Cloud
      supabase.from('retiros').delete().eq('id', id).then();
      
      await get().cargar();
    } catch (error) {
      console.error('Error eliminando retiro local:', error);
    }
  },

  suscribirCambios: () => {
    supabase.channel('historial-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'historial' }, () => get().cargar())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'retiros' }, () => get().cargar())
      .subscribe();
  }
}));
