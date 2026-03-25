// ═══════════════════════════════════════════════════
// Store del día actual — estado del cuadre diario
// Reemplaza el localStorage del HTML con AsyncStorage
// ═══════════════════════════════════════════════════

import { create } from 'zustand';
import { calcularDia, EstadoDia, ResultadoCuadre, Factura, FilaDato } from '../utils/calcular';
import { 
  dbSetBorrador, 
  dbGetBorrador, 
  dbDeleteBorrador,
  dbGetHistorial
} from '../utils/database';
import { supabase } from '../utils/supabase';

// (Clave dinámica basada en fecha se usa ahora)

// Estado inicial de un día en blanco
const estadoBlanco = (): EstadoDia => ({
  base: 0,
  cierre: 0,
  retiro: 0,
  notaRetiro: '',
  ingreso: 0,
  notaIngreso: '',
  prestamo: 0,
  notaPrestamo: '',
  facturas: [],
  gastos: [{ nombre: '', valor: 0 }],
  creditos: [{ nombre: '', valor: 0 }],
  pagos: [{ nombre: '', valor: 0 }],
  transferenciaVentas: [{ nombre: '', valor: 0 }],
  transferenciaPagos: [{ nombre: '', valor: 0 }],
});

interface DiaStore extends EstadoDia {
  fecha: string;
  resultado: ResultadoCuadre | null;
  guardando: boolean;
  cargando: boolean;

  // Actualiza la fecha del día
  setFecha: (fecha: string) => void;
  // Actualiza campos numéricos simples
  setBase: (v: number) => void;
  setCierre: (v: number) => void;
  setRetiro: (v: number) => void;
  setNotaRetiro: (v: string) => void;
  setIngreso: (v: number) => void;
  setNotaIngreso: (v: string) => void;
  setPrestamo: (v: number) => void;
  setNotaPrestamo: (v: string) => void;

  // Facturas del día
  agregarFactura: (f: Factura) => void;
  eliminarFactura: (id: number) => void;
  editarTotalFactura: (id: number, total: number) => void;

  // Filas dinámicas (gastos, créditos, pagos, transferencias)
  actualizarFila: (lista: keyof FilasStore, idx: number, campo: 'nombre' | 'valor', valor: string | number) => void;
  agregarFila: (lista: keyof FilasStore) => void;
  eliminarFila: (lista: keyof FilasStore, idx: number) => void;

  // Calcula y guarda el resultado localmente
  calcular: () => void;
  // Guarda borrador en SQLite y Cloud
  autoGuardar: () => Promise<void>;
  // Carga el borrador guardado al abrir la app o al cambiar fecha
  cargarDiaActual: (fechaManual?: string) => Promise<void>;
  // Limpia el formulario para un nuevo día (opcionalmente hereda base)
  limpiar: (nuevaBase?: number) => Promise<void>;
  // Captura el estado completo para guardar en historial
  capturarEstado: () => any;
  // Suscribirse a cambios en tiempo real
  suscribirCambios: () => void;
  // Procesar factura con IA (Supabase Edge Function)
  procesarFacturaIA: (base64Image: string) => Promise<void>;
  // Helper interno
  _aplicarDatos: (d: any) => void;
}

// Tipo auxiliar para nombrar las listas de filas
type FilasStore = Pick<DiaStore, 'gastos' | 'creditos' | 'pagos' | 'transferenciaVentas' | 'transferenciaPagos'>;

export const useDiaStore = create<DiaStore>((set, get) => ({
  // Estado inicial
  fecha: new Date().toISOString().slice(0, 10),
  ...estadoBlanco(),
  resultado: null,
  guardando: false,
  cargando: true,

  setFecha: (fecha) => { set({ fecha }); get().autoGuardar(); },
  setBase:   (base)   => { set({ base });   get().calcular(); get().autoGuardar(); },
  setCierre: (cierre) => { set({ cierre }); get().calcular(); get().autoGuardar(); },
  setRetiro: (retiro) => { set({ retiro }); get().calcular(); get().autoGuardar(); },
  setNotaRetiro: (notaRetiro) => { set({ notaRetiro }); get().autoGuardar(); },
  setIngreso: (ingreso) => { set({ ingreso }); get().calcular(); get().autoGuardar(); },
  setNotaIngreso: (notaIngreso) => { set({ notaIngreso }); get().autoGuardar(); },
  setPrestamo: (prestamo) => { set({ prestamo }); get().calcular(); get().autoGuardar(); },
  setNotaPrestamo: (notaPrestamo) => { set({ notaPrestamo }); get().autoGuardar(); },

  agregarFactura: (f) => {
    set(s => ({ facturas: [...s.facturas, f] }));
    get().calcular(); get().autoGuardar();
  },
  eliminarFactura: (id) => {
    set(s => ({ facturas: s.facturas.filter(f => f.id !== id) }));
    get().calcular(); get().autoGuardar();
  },
  editarTotalFactura: (id, total) => {
    set(s => ({ facturas: s.facturas.map(f => f.id === id ? { ...f, total } : f) }));
    get().calcular(); get().autoGuardar();
  },

  actualizarFila: (lista, idx, campo, valor) => {
    set(s => {
      const arr = [...(s[lista] as FilaDato[])];
      arr[idx] = { ...arr[idx], [campo]: valor };
      return { [lista]: arr } as any;
    });
    get().calcular(); get().autoGuardar();
  },

  agregarFila: (lista) => {
    set(s => ({
      [lista]: [...(s[lista] as FilaDato[]), { nombre: '', valor: 0 }]
    } as any));
  },

  eliminarFila: (lista, idx) => {
    set(s => {
      const arr = (s[lista] as FilaDato[]).filter((_, i) => i !== idx);
      // Siempre deja al menos una fila vacía
      return { [lista]: arr.length > 0 ? arr : [{ nombre: '', valor: 0 }] } as any;
    });
    get().calcular(); get().autoGuardar();
  },

  calcular: () => {
    const s = get();
    const resultado = calcularDia({
      base: s.base, cierre: s.cierre, retiro: s.retiro, notaRetiro: s.notaRetiro,
      ingreso: s.ingreso, notaIngreso: s.notaIngreso,
      prestamo: s.prestamo, notaPrestamo: s.notaPrestamo,
      facturas: s.facturas,
      gastos: s.gastos, creditos: s.creditos, pagos: s.pagos,
      transferenciaVentas: s.transferenciaVentas,
      transferenciaPagos: s.transferenciaPagos,
    });
    set({ resultado });
  },

  autoGuardar: async () => {
    const s = get();
    const clave = `borrador_${s.fecha}`;
    const estado = s.capturarEstado();
    try {
      await dbSetBorrador(clave, estado);
      supabase.from('borradores').upsert({
        key: clave,
        datos_json: estado,
        updated_at: new Date().toISOString()
      }).then();
    } catch (error) {}
  },

  cargarDiaActual: async (fechaManual?: string) => {
    const f = fechaManual || get().fecha;
    const clave = `borrador_${f}`;
    try {
      set({ cargando: true });
      // 1. Buscar en borrador local primero
      const local = await dbGetBorrador(clave);
      if (local) {
        get()._aplicarDatos(local);
        set({ cargando: false });
        // No seguimos si hay borrador (es la verdad mas reciente)
        return;
      }
      
      // 2. Si no hay borrador, buscar en Historial Real (Día cerrado)
      const dataHist = await dbGetHistorial();
      const guardado = dataHist.find(h => {
        try {
          const d = JSON.parse(h.datos_json);
          return d.fecha === f;
        } catch(e) { return false; }
      });

      if (guardado) {
        get()._aplicarDatos(JSON.parse(guardado.datos_json));
        set({ cargando: false });
        return;
      }

      // 3. Buscar en la nube (borrador remoto)
      const { data: cloud } = await supabase.from('borradores').select('*').eq('key', clave).single();
      if (cloud) {
        get()._aplicarDatos(cloud.datos_json);
      } else {
        // 4. Día nuevo completamente blanco
        set({ ...estadoBlanco(), fecha: f });
      }
      set({ cargando: false });
    } catch (error) {
      set({ cargando: false });
    }
  },

  // Helper privado para inyectar datos en el estado
  _aplicarDatos: (d: any) => {
    set({
      fecha:    d.fecha    || new Date().toISOString().slice(0, 10),
      base:     d.base     || 0,
      cierre:   d.cierre   || 0,
      retiro:      d.retiro      || 0,
      notaRetiro:  d.notaRetiro  || '',
      ingreso:     d.ingreso     || 0,
      notaIngreso: d.notaIngreso || '',
      prestamo:     d.prestamo    || 0,
      notaPrestamo: d.notaPrestamo || '',
      facturas: (d.facturas || []).map((f: any, i: number) => ({
        id: i + 1, thumb: '', proveedor: f.proveedor, resumen: f.resumen, total: f.total
      })),
      gastos:              d.gastos?.length              ? d.gastos              : [{ nombre: '', valor: 0 }],
      creditos:            d.creditos?.length            ? d.creditos            : [{ nombre: '', valor: 0 }],
      pagos:               d.pagos?.length               ? d.pagos               : [{ nombre: '', valor: 0 }],
      transferenciaVentas: d.transferenciaVentas?.length ? d.transferenciaVentas : [{ nombre: '', valor: 0 }],
      transferenciaPagos:  d.transferenciaPagos?.length  ? d.transferenciaPagos  : [{ nombre: '', valor: 0 }],
    });
    get().calcular();
  },

  limpiar: async (nuevaBase?: number) => {
    const f = new Date().toISOString().slice(0, 10);
    const clave = `borrador_${f}`;
    set({ 
      fecha: f, 
      ...estadoBlanco(), 
      base: nuevaBase ?? 0,
      resultado: null 
    });
    try { 
      await dbDeleteBorrador(clave); 
      supabase.from('borradores').delete().eq('key', clave).then();
    } catch (error) {}
  },

  suscribirCambios: () => {
    supabase.channel('borradores-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'borradores' }, (payload: any) => {
        if (payload.new && payload.new.key === `borrador_${get().fecha}`) {
          get().cargarDiaActual();
        }
      })
      .subscribe();
  },

  procesarFacturaIA: async (base64Image: string) => {
    try {
      set({ guardando: true });
      
      const { data, error } = await supabase.functions.invoke('procesar-factura', {
        body: { image_url: base64Image }
      });

      if (error) throw error;
      
      if (data) {
        get().agregarFactura({
          id: Date.now(),
          proveedor: data.proveedor || 'Proveedor desconocido',
          resumen: data.resumen || '',
          total: data.total || 0,
        });
      }
    } catch (error: any) {
      console.error("[IA] Error procesando factura IA:", error.message || error);
      throw error;
    } finally {
      set({ guardando: false });
    }
  },

  capturarEstado: () => {
    const s = get();
    const r = s.resultado;
    return {
      fecha:    s.fecha,
      base:     s.base,
      cierre:   s.cierre,
      retiro:      s.retiro,
      notaRetiro:  s.notaRetiro,
      ingreso:     s.ingreso,
      notaIngreso: s.notaIngreso,
      prestamo:     s.prestamo,
      notaPrestamo: s.notaPrestamo,
      compras:  s.facturas.reduce((acc, f) => acc + f.total, 0),
      facturas: s.facturas.map(f => ({ proveedor: f.proveedor, resumen: f.resumen, total: f.total })),
      gastos:              s.gastos,
      creditos:            s.creditos,
      pagos:               s.pagos,
      transferenciaVentas: s.transferenciaVentas,
      transferenciaPagos:  s.transferenciaPagos,
      totalGastos:    r?.totalGastos    || 0,
      totalCreditos:  r?.totalCreditos  || 0,
      totalPagos:     r?.totalPagos     || 0,
      totalTv:        r?.totalTv        || 0,
      totalTp:        r?.totalTp        || 0,
      ventasEf:       r?.ventasEfectivo || 0,
      ventasTr:       r?.ventasTransferencia || 0,
      total:          r?.total          || 0,
      ts: Date.now(),
    };
  },
}));
