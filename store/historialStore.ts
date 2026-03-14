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
      // 1. Cargar local
      const dataHist = await dbGetHistorial();
      const dataRet  = await dbGetRetiros();
      
      const historial = dataHist.map(h => JSON.parse(h.datos_json));
      const retiros = dataRet.map(r => ({
        id: r.id,
        fecha: r.fecha,
        valor: r.valor,
        ts: r.timestamp
      }));

      set({ historial, retiros, cargando: false });

      // 2. Sincronizar con Cloud
      const { data: cloudHist, error: errH } = await supabase.from('historial').select('*');
      const { data: cloudRet,  error: errR } = await supabase.from('retiros').select('*');

      if (!errH && cloudHist) {
        const hCloud = cloudHist.map(h => h.datos_json);
        set({ historial: hCloud });
        // TODO: Actualizar SQLite si es necesario
      }

      if (!errR && cloudRet) {
        const rCloud = cloudRet.map(r => ({
          id: r.id, fecha: r.fecha, valor: r.valor, ts: r.timestamp
        }));
        set({ retiros: rCloud });
      }

    } catch (error) {
      console.error('Error cargando historial sync:', error);
      set({ cargando: false });
    }
  },

  guardarDia: async (estado) => {
    try {
      // Local
      await dbInsertHistorial(estado.fecha, estado, estado.total);
      
      // Cloud
      await supabase.from('historial').upsert({
        fecha: estado.fecha,
        datos_json: estado,
        total_vendido: estado.total
      });
      
      // Si el día tiene retiro, guardarlo también
      if (estado.retiro && estado.retiro > 0) {
        const existe = get().retiros.find(r => r.fecha === estado.fecha);
        if (existe && existe.id !== undefined) {
          await dbDeleteRetiro(existe.id);
          await supabase.from('retiros').delete().eq('id', existe.id);
        }
        
        // Insertar nuevo retiro
        await dbInsertRetiro(estado.fecha, estado.retiro);
        await supabase.from('retiros').insert({
          fecha: estado.fecha,
          valor: estado.retiro,
          timestamp: Date.now()
        });
      }
      
      await get().cargar();
    } catch (error) {
      console.error('Error guardando día sync:', error);
    }
  },

  eliminarDia: async (fecha) => {
    try {
      await dbDeleteHistorial(fecha);
      await supabase.from('historial').delete().eq('fecha', fecha);
      await get().cargar();
    } catch (error) {
      console.error('Error eliminando día sync:', error);
    }
  },

  eliminarRetiro: async (id) => {
    try {
      await dbDeleteRetiro(id);
      await supabase.from('retiros').delete().eq('id', id);
      await get().cargar();
    } catch (error) {
      console.error('Error eliminando retiro sync:', error);
    }
  },

  suscribirCambios: () => {
    supabase.channel('historial-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'historial' }, () => get().cargar())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'retiros' }, () => get().cargar())
      .subscribe();
  }
}));
