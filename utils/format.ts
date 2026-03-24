// ═══════════════════════════════════════════════════
// Utilidades de formato para la consistencia de la UI
// ═══════════════════════════════════════════════════

/**
 * Formatea un número como pesos colombianos: $ 1.234.567
 */
export const formatCurrency = (val: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(val);
};

/**
 * Formatea un número con puntos de miles (sin signo de pesos) para inputs: 10000 -> "10.000"
 */
export const formatNum = (val: number | string): string => {
  if (val === 0 || val === '0' || val === '') return '';
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/\./g, '')) || 0;
  return Math.round(num).toLocaleString('es-CO');
};

/**
 * Limpia los puntos de un string para obtener el número puro: "10.000" -> 10000
 */
export const parseNum = (val: string): number => {
  if (!val) return 0;
  return parseFloat(val.replace(/\./g, '')) || 0;
};
