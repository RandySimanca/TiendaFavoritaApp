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
  dbDeleteRetiro,
  dbGetIngresos,
  dbInsertIngreso,
  dbDeleteIngreso
} from '../utils/database';
import { supabase } from '../utils/supabase';

export interface DiaGuardado {
  fecha: string;
  base: number;
  cierre: number;
  retiro: number;
  notaRetiro?: string;
  ingreso: number;
  notaIngreso?: string;
  prestamo: number;
  notaPrestamo?: string;
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

export interface Ingreso {
  id?: number;
  fecha: string;
  valor: number;
  nota?: string;
  ts: number;
}

interface HistorialStore {
  historial: DiaGuardado[];
  retiros: Retiro[];
  ingresos: Ingreso[];
  cargando: boolean;

  // Carga historial y retiros desde SQLite y Supabase
  cargar: () => Promise<void>;
  // Guarda o reemplaza un día en el historial (local + cloud)
  guardarDia: (estado: any) => Promise<void>;
  // Elimina un día por fecha (identificador único del historial)
  eliminarDia: (fecha: string) => Promise<void>;
  // Elimina un retiro por ID real de la DB
  eliminarRetiro: (id: number) => Promise<void>;
  // Elimina un ingreso por ID real de la DB
  eliminarIngreso: (id: number) => Promise<void>;
  // Suscribirse a cambios en tiempo real
  suscribirCambios: () => void;
  // Inyectar gasto operacional
  inyectarGastoOperacional: (gasto: { nombre: string; valor: number; fechaStr: string }) => Promise<void>;
}

export const useHistorialStore = create<HistorialStore>((set, get) => ({
  historial: [],
  retiros: [],
  ingresos: [],
  cargando: true,

  cargar: async () => {
    try {
      // 1. Cargar local (instantáneo)
      const dataHist   = await dbGetHistorial();
      const dataRet    = await dbGetRetiros();
      const dataIng    = await dbGetIngresos();
      
      const historial: DiaGuardado[] = dataHist.map(h => {
        try {
          return JSON.parse(h.datos_json);
        } catch (e) {
          console.error("Error parseando registro de historial:", e);
          return null;
        }
      }).filter(h => h !== null);
      const retiros: Retiro[] = dataRet.map(r => ({
        id: r.id, fecha: r.fecha, valor: r.valor, nota: r.nota, ts: r.timestamp
      }));
      const ingresos: Ingreso[] = dataIng.map(i => ({
        id: i.id, fecha: i.fecha, valor: i.valor, nota: i.nota, ts: i.timestamp
      }));

      set({ historial, retiros, ingresos, cargando: false });

      // 2. Sincronizar en segundo plano (silencioso - Mezclando datos con sanación)
      (async () => {
        try {
          const { data: cloudHist, error: errH } = await supabase.from('historial').select('*');
          const { data: cloudRet,  error: errR } = await supabase.from('retiros').select('*');
          const { data: cloudIng,  error: errI } = await supabase.from('ingresos').select('*');

          let finalHist = [...historial];
          let finalRet  = [...retiros];
          let finalIng  = [...ingresos];

          if (!errH && cloudHist) {
            const hCloud = cloudHist.map(h => h.datos_json).filter(h => h && h.fecha);
            const mapHist = new Map();
            hCloud.forEach(h => mapHist.set(h.fecha, h));
            historial.forEach(h => {
              if (h && h.fecha) mapHist.set(h.fecha, h);
            });
            finalHist = Array.from(mapHist.values()).sort((a: any, b: any) => {
              return (b.fecha || '').localeCompare(a.fecha || '');
            });
          }

          // --- Sanación de Retiros e Ingresos desde el Historial ---
          finalHist.forEach((h: any) => {
             if (!h) return;
             if (h.retiro && h.retiro > 0) {
                const existe = finalRet.some(r => r && r.fecha === h.fecha && Math.abs((r.valor || 0) - h.retiro) < 0.1);
                if (!existe) {
                  const nuevo: Retiro = { id: undefined, fecha: h.fecha, valor: h.retiro, nota: h.notaRetiro || 'Recuperado de historial', ts: h.ts || Date.now() };
                  finalRet.push(nuevo);
                }
             }
             if (h.ingreso && h.ingreso > 0) {
                const existe = finalIng.some(i => i && i.fecha === h.fecha && Math.abs((i.valor || 0) - h.ingreso) < 0.1);
                if (!existe) {
                  const nuevo: Ingreso = { id: undefined, fecha: h.fecha, valor: h.ingreso, nota: h.notaIngreso || 'Recuperado de historial', ts: h.ts || Date.now() };
                  finalIng.push(nuevo);
                }
             }
          });

          if (!errR && cloudRet) {
            const rCloud = (cloudRet || []).map((r: any) => {
              if (!r || !r.fecha) return null;
              return { id: r.id, fecha: r.fecha, valor: r.valor, nota: r.nota, ts: r.timestamp };
            }).filter(r => r !== null) as Retiro[];
            
            rCloud.forEach(rc => {
               const duplicado = finalRet.some(r => r && r.fecha === rc.fecha && Math.abs((r.valor || 0) - (rc.valor || 0)) < 0.1);
               if (!duplicado) finalRet.push(rc);
            });
          }

          if (!errI && cloudIng) {
            const iCloud = (cloudIng || []).map((i: any) => {
              if (!i || !i.fecha) return null;
              return { id: i.id, fecha: i.fecha, valor: i.valor, nota: i.nota, ts: i.timestamp };
            }).filter(i => i !== null) as Ingreso[];

            iCloud.forEach(ic => {
               const duplicado = finalIng.some(i => i && i.fecha === ic.fecha && Math.abs((i.valor || 0) - (ic.valor || 0)) < 0.1);
               if (!duplicado) finalIng.push(ic);
            });
          }

          set({ 
             historial: finalHist, 
             retiros: finalRet.filter(r => r).sort((a, b) => (b.ts || 0) - (a.ts || 0)), 
             ingresos: finalIng.filter(i => i).sort((a, b) => (b.ts || 0) - (a.ts || 0)) 
          });

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

      // Manejo de Ingresos
      if (estado.ingreso && estado.ingreso > 0) {
        const existe = get().ingresos.find(i => i.fecha === estado.fecha);
        if (existe && existe.id !== undefined) {
          await dbDeleteIngreso(existe.id);
          supabase.from('ingresos').delete().eq('id', existe.id).then();
        }
        await dbInsertIngreso(estado.fecha, estado.ingreso, estado.notaIngreso || '');
        supabase.from('ingresos').insert({
          fecha: estado.fecha, valor: estado.ingreso, nota: estado.notaIngreso || '', timestamp: Date.now()
        }).then();
      }

      // ── Retiro automático por transferencias (Ventas + Pagos) ──────────────
      const totalTransferencias = (estado.totalTv || 0) + (estado.totalTp || 0);
      const notaAutoTransferencia = '📲 Transferencias (Ventas + Pagos) — dinero al cel/banco, no a caja';
      
      const retiroAutoAnteriorTrans = get().retiros.find(
        r => r.fecha === estado.fecha && r.nota === notaAutoTransferencia
      );
      if (retiroAutoAnteriorTrans?.id !== undefined) {
        await dbDeleteRetiro(retiroAutoAnteriorTrans.id);
        supabase.from('retiros').delete().eq('id', retiroAutoAnteriorTrans.id).then();
      }
      if (totalTransferencias > 0) {
        await dbInsertRetiro(estado.fecha, totalTransferencias, notaAutoTransferencia);
        supabase.from('retiros').insert({
          fecha: estado.fecha, valor: totalTransferencias, nota: notaAutoTransferencia, timestamp: Date.now()
        }).then();
      }
      // ───────────────────────────────────────────────────────────────────────
      
      // Recargar de local para asegurar consistencia UI
      await get().cargar();
    } catch (error) {
      console.error('Error guardando historial local:', error);
    }
  },

  eliminarDia: async (fecha) => {
    try {
      // 1. Eliminar retiros dependientes de ese día
      const retirosDia = get().retiros.filter(r => r.fecha === fecha);
      for (const r of retirosDia) {
        if (r.id !== undefined) {
          await dbDeleteRetiro(r.id);
          supabase.from('retiros').delete().eq('id', r.id).then();
        }
      }
      
      // 2. Eliminar ingresos dependientes de ese día
      const ingresosDia = get().ingresos.filter(i => i.fecha === fecha);
      for (const i of ingresosDia) {
        if (i.id !== undefined) {
          await dbDeleteIngreso(i.id);
          supabase.from('ingresos').delete().eq('id', i.id).then();
        }
      }

      // 3. Eliminar el día del historial
      // Local
      await dbDeleteHistorial(fecha);
      // Cloud
      supabase.from('historial').delete().eq('fecha', fecha).then();
      
      await get().cargar();
    } catch (error) {
      console.error('Error eliminando historial local:', error);
    }
  },

  eliminarRetiro: async (id) => {
    try {
      await dbDeleteRetiro(id);
      supabase.from('retiros').delete().eq('id', id).then();
      await get().cargar();
    } catch (error) {
      console.error('Error eliminando retiro local:', error);
    }
  },

  eliminarIngreso: async (id) => {
    try {
      await dbDeleteIngreso(id);
      supabase.from('ingresos').delete().eq('id', id).then();
      await get().cargar();
    } catch (error) {
      console.error('Error eliminando ingreso local:', error);
    }
  },

  suscribirCambios: () => {
    supabase.channel('historial-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'historial' }, () => get().cargar())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'retiros' }, () => get().cargar())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ingresos' }, () => get().cargar())
      .subscribe();
  },

  inyectarGastoOperacional: async (gasto) => {
    const { historial, guardarDia } = get();
    let dia = historial.find(h => h.fecha === gasto.fechaStr);
    
    if (!dia) {
      dia = {
        fecha: gasto.fechaStr, base: 0, cierre: 0, retiro: 0, notaRetiro: '', ingreso: 0, notaIngreso: '', prestamo: 0, notaPrestamo: '',
        facturas: [], gastos: [], creditos: [], pagos: [], transferenciaVentas: [], transferenciaPagos: [],
        compras: 0, totalGastos: 0, totalCreditos: 0, totalPagos: 0, totalTv: 0, totalTp: 0, ventasEf: 0, ventasTr: 0, total: 0, ts: Date.now()
      };
    }
    
    let diaSeguro = dia as DiaGuardado;
    const nuevosGastos = [...(diaSeguro.gastos || []), { nombre: gasto.nombre, valor: gasto.valor }];
    await guardarDia({ ...diaSeguro, gastos: nuevosGastos });
  }
}));
