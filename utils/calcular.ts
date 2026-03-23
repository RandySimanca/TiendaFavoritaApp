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
export function sumarFilas(filas: FilaDato[]): number {
  return filas.reduce((acc, f) => acc + (f.valor || 0), 0);
}

// Formatea un número como pesos colombianos: $ 1.234.567
export function fmt(n: number): string {
  return '$ ' + Math.round(n).toLocaleString('es-CO');
}

// Cálculo principal del cuadre diario
// Reproduce exactamente la función calcular() del HTML original
export function calcularDia(estado: EstadoDia): ResultadoCuadre {
  const { base, cierre, retiro, facturas, gastos, creditos, pagos, transferenciaVentas, transferenciaPagos } = estado;

  const compras  = facturas.reduce((s, f) => s + f.total, 0);
  const totalGastos   = sumarFilas(gastos);
  const totalCreditos = sumarFilas(creditos);
  const totalPagos    = sumarFilas(pagos);
  const totalTv       = sumarFilas(transferenciaVentas);
  const totalTp       = sumarFilas(transferenciaPagos);

  // Ventas efectivo = cierre - base + compras + gastos + creditos - pagos
  // (El retiro no debe afectar el cálculo del total vendido de lo contado al cierre)
  const ventasEfectivo = cierre - base + compras + totalGastos + totalCreditos - totalPagos;

  // Total = ventas efectivo + transferencias ventas + pagos deuda por transf (cuentan como venta)
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
  const meses: Record<string, { ventas: number; dias: number }> = {};
  historial.forEach(d => {
    if (!d.fecha) return;
    const clave = d.fecha.substring(0, 7); // YYYY-MM
    if (!meses[clave]) meses[clave] = { ventas: 0, dias: 0 };
    meses[clave].ventas += Math.max(0, d.total || 0);
    meses[clave].dias++;
  });
  return meses;
}
