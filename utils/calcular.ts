// ═══════════════════════════════════════════════════
// Lógica matemática del cuadre de caja diario
// Fórmula idéntica a la del archivo control_diario-5.html
// ═══════════════════════════════════════════════════

export interface Factura {
  id: number;
  proveedor: string;
  resumen: string;
  total: number;
}

export interface FilaDato {
  nombre: string;
  valor: number;
}

export interface EstadoDia {
  base: number;
  cierre: number;
  retiro: number;
  notaRetiro: string;
  ingreso: number;
  notaIngreso: string;
  prestamo: number;
  notaPrestamo: string;
  facturas: Factura[];
  gastos: FilaDato[];
  creditos: FilaDato[];
  pagos: FilaDato[];
  transferenciaVentas: FilaDato[];
  transferenciaPagos: FilaDato[];
}

export interface ResultadoCuadre {
  compras: number;
  totalGastos: number;
  totalCreditos: number;
  totalPagos: number;
  totalTv: number;    // transferencias de ventas
  totalTp: number;    // transferencias de pagos de deuda
  ventasEfectivo: number;
  ventasTransferencia: number;
  total: number;
  positivo: boolean;
}

// Suma todos los valores de un arreglo de filas
export function sumarFilas(filas: FilaDato[] = []): number {
  return (filas || []).reduce((acc, f) => acc + (f.valor || 0), 0);
}

// Formatea un número como pesos colombianos: $ 1.234.567
export function fmt(n: number): string {
  if (n === undefined || n === null || isNaN(n)) return '$ 0';
  return '$ ' + Math.round(n).toLocaleString('es-CO');
}

// Formatea un número como string con puntos de miles para INPUTS: 10000 -> "10.000"
export function formatInput(n: number | string): string {
  if (n === 0 || n === '0' || n === '') return '';
  const val = typeof n === 'number' ? n : parseFloat(String(n).replace(/\./g, '')) || 0;
  return Math.round(val).toLocaleString('es-CO');
}

// Limpia los puntos de un string para obtener el número: "10.000" -> 10000
export function parseInput(s: string): number {
  if (!s) return 0;
  return parseFloat(s.replace(/\./g, '')) || 0;
}

// Cálculo principal del cuadre diario
// Reproduce exactamente la función calcular() del HTML original
export function calcularDia(estado: EstadoDia): ResultadoCuadre {
  const { 
    base = 0, 
    cierre = 0, 
    retiro = 0, 
    ingreso = 0, 
    prestamo = 0,
    facturas = [], 
    gastos = [], 
    creditos = [], 
    pagos = [], 
    transferenciaVentas = [], 
    transferenciaPagos = [] 
  } = (estado || {}) as any;

  const compras  = (facturas || []).reduce((s: number, f: any) => s + (f.total || 0), 0);
  const totalGastos   = sumarFilas(gastos);
  const totalCreditos = sumarFilas(creditos);
  const totalPagos    = sumarFilas(pagos);
  const totalTv       = sumarFilas(transferenciaVentas);
  const totalTp       = sumarFilas(transferenciaPagos);

  // ventasEfectivo calcula la venta real de hoy en efectivo.
  // Se eliminó sumar 'creditos' para no registrar ventas fiadas como ingresos del dia.
  // Se omitió restar 'pagos' para que los pagos de fiado recibidos en efectivo sumen al total de ventas.
  // Ya no sumamos totalTp al efectivo, para no inflar artificialmente las ventas en efectivo
  const ventasEfectivo = (cierre + retiro + prestamo) - base - ingreso + compras + totalGastos;

  // Total = ventas en efectivo + ventas por transferencia (incluye tanto ventas nuevas como pagos de deudas pasadas).
  const total = ventasEfectivo + totalTv + totalTp;

  return {
    compras,
    totalGastos,
    totalCreditos,
    totalPagos,
    totalTv,
    totalTp,
    ventasEfectivo: Math.max(0, ventasEfectivo),
    ventasTransferencia: totalTv + totalTp,
    total,
    positivo: total >= 0,
  };
}

// Agrupa un historial por mes y devuelve resumen
export function resumenPorMes(historial: any[]) {
  const meses: Record<string, { ventas: number; compras: number; gastos: number; dias: number }> = {};
  historial.forEach(d => {
    if (!d.fecha) return;
    const clave = d.fecha.substring(0, 7); // YYYY-MM
    if (!meses[clave]) meses[clave] = { ventas: 0, compras: 0, gastos: 0, dias: 0 };
    // Siempre recalculamos el día para aplicar la fórmula actualizada a días guardados
    const res = calcularDia(d);
    let total = res.total;
    let compras = res.compras;
    meses[clave].ventas += Math.max(0, total);
    meses[clave].compras += compras;
    meses[clave].gastos += res.totalGastos;
    meses[clave].dias++;
  });
  return meses;
}

// Genera un objeto de cierre formal para persistir
export function generarCierreMensual(mes: string, historial: any[], gastosAdmon: any[] = []): any {
  const diasMes = historial.filter(d => d.fecha && d.fecha.startsWith(mes));
  const extras  = gastosAdmon.filter(g => g.mes === mes);
  
  let ventaTotal = 0;
  let comprasTotal = 0;
  let gastosTotal  = 0;
  let retirosTotal = 0;
  let prestamosTotal = 0;
  let ingresosTotal  = 0;
  let transacciones = 0;
  const proveedores: Record<string, number> = {};

  // 1. Datos del historial diario
  diasMes.forEach(d => {
    const res = calcularDia(d);
    ventaTotal   += res.total;
    comprasTotal += res.compras;
    gastosTotal  += res.totalGastos;
    retirosTotal += (d.retiro || 0);
    prestamosTotal += (d.prestamo || 0);
    ingresosTotal += (d.ingreso || 0);
    
    transacciones += (d.facturas?.length || 0) + (d.gastos?.length || 0) + (d.pagos?.length || 0);
    
    // Conteo de proveedores (para el JSON detalle)
    d.facturas?.forEach((f: any) => {
      proveedores[f.proveedor] = (proveedores[f.proveedor] || 0) + f.total;
    });
  });

  // 2. Gastos Administrativos (Operacionales)
  const totalAdmon = extras.reduce((acc, g) => acc + (g.monto || 0), 0);
  transacciones += extras.length;

  return {
    mes,
    venta_total: ventaTotal,
    compras_total: comprasTotal,
    gasto_total: gastosTotal + totalAdmon,
    retiros_total: retirosTotal,
    prestamos_total: prestamosTotal,
    ingresos_total: ingresosTotal,
    utilidad: ventaTotal - comprasTotal - gastosTotal - totalAdmon,
    transacciones,
    json_detalle: JSON.stringify({
      num_dias: diasMes.length,
      gastos_admon: totalAdmon,
      proveedores_top: Object.entries(proveedores)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
    })
  };
}
