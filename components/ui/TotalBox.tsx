// ═══════════════════════════════════════════════════
// Componente TotalBox — Caja resumen de totales
// Se usa al final de cada sección del cuadre diario
// ═══════════════════════════════════════════════════

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/Colors';
import { fmt } from '../../utils/calcular';

interface TotalBoxProps {
  label: string;
  valor: number;
  color: string;
}

export function TotalBox({ label, valor, color }: TotalBoxProps) {
  const bgColor = valor < 0 ? Colors.red : color;
  return (
    <View style={[estilos.contenedor, { backgroundColor: bgColor }]}>
      <Text style={estilos.label}>{label}</Text>
      <Text style={estilos.valor} numberOfLines={1} adjustsFontSizeToFit>{fmt(valor)}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    borderRadius: 11,
    padding: 11,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    // Sombra sutil para dar relieve
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  label: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '700',
  },
  valor: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '900',
    flexShrink: 1,
    textAlign: 'right',
  },
});
