// ═══════════════════════════════════════════════════
// Paleta de colores de la app Tienda Favorita
// Basada en el diseño original de control_diario-5.html
// ═══════════════════════════════════════════════════

export const Colors = {
  // Verde — color principal de la marca
  green:     '#16a34a',
  greenDark: '#14532d',
  greenLight:'#dcfce7',

  // Azul — compras
  blue:      '#1d4ed8',
  blueDark:  '#1e3a8a',
  blueLight: '#dbeafe',

  // Naranja — gastos
  orange:    '#ea580c',
  orangeLight:'#ffedd5',

  // Rojo — negativo / eliminar
  red:       '#dc2626',
  redLight:  '#fee2e2',

  // Dorado — advertencias
  gold:      '#d97706',
  goldLight: '#fef3c7',

  // Morado — pagos en efectivo
  purple:    '#7c3aed',
  purpleLight:'#ede9fe',

  // Teal — transferencias
  teal:      '#0d9488',
  tealLight: '#ccfbf1',

  // Neutros
  bg:        '#f1f5f9',
  border:    '#e2e8f0',
  gray:      '#64748b',
  grayLight: '#f8fafc',
  dark:      '#1e293b',
  white:     '#ffffff',
};

// Gradientes predefinidos para las tarjetas
export const Gradients = {
  green:   ['#15803d', '#16a34a'] as [string, string],
  blue:    ['#1d4ed8', '#2563eb'] as [string, string],
  orange:  ['#c2410c', '#ea580c'] as [string, string],
  purple:  ['#6d28d9', '#7c3aed'] as [string, string],
  teal:    ['#0f766e', '#0d9488'] as [string, string],
  gold:    ['#b45309', '#d97706'] as [string, string],
  login:   ['#14532d', '#16a34a', '#22c55e'] as [string, string, string],
};
