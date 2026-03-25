// ═══════════════════════════════════════════════════
// ResultadoDia — Bloque que muestra el resumen del cuadre diario
// Equivalente al div .resultado del HTML original
// Se pone verde si el total es positivo, rojo si es negativo
// ═══════════════════════════════════════════════════

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ResultadoCuadre } from '../../utils/calcular';
import { fmt } from '../../utils/calcular';
import { Colors } from '../../constants/Colors';

interface Props {
  base: number;
  cierre: number;
  retiro: number;
  prestamo: number;
  resultado: ResultadoCuadre;
  esDuena: boolean;
}

interface LineaProps {
  etiqueta: string;
  valor: string;
  esTransferencia?: boolean;
}

// Línea individual del resumen
function Linea({ etiqueta, valor, esTransferencia }: LineaProps) {
  return (
    <View style={estilos.linea}>
      <Text style={[estilos.lineaEtiqueta, esTransferencia && estilos.lineaTransf]}>
        {etiqueta}
      </Text>
      <Text style={[estilos.lineaValor, esTransferencia && estilos.lineaTransf]}>
        {valor}
      </Text>
    </View>
  );
}

export function ResultadoDia({ base, cierre, retiro, prestamo, resultado, esDuena }: Props) {
  // Color del bloque según si el resultado es positivo o negativo
  const gradiente: [string, string] = resultado.positivo
    ? ['#14532d', '#16a34a']
    : ['#7f1d1d', '#dc2626'];

  return (
    <LinearGradient colors={gradiente} style={estilos.contenedor} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
      <Text style={estilos.titulo}>📊 Resumen del día</Text>

      {/* Desglose del cálculo */}
      <Linea etiqueta="Plata al cerrar:"     valor={fmt(cierre)} />
      {esDuena && retiro > 0 && (
        <Linea etiqueta="💼 (+) Retiro del día:" valor={fmt(retiro)} />
      )}
      {prestamo > 0 && (
        <Linea etiqueta="👤 (+) Préstamo empleado:" valor={fmt(prestamo)} />
      )}
      <Linea etiqueta="(−) Plata al abrir:"  valor={fmt(base)} />
      <Linea etiqueta="(+) Compras pagadas:" valor={fmt(resultado.compras)} />
      <Linea etiqueta="(+) Gastos del día:"  valor={fmt(resultado.totalGastos)} />
      <Linea etiqueta="(+) Créditos fiados:" valor={fmt(resultado.totalCreditos)} />
      <Linea etiqueta="(−) Pagos efectivo:"  valor={fmt(resultado.totalPagos)} />
      <Linea etiqueta="📲 Ventas por transf.:"        valor={fmt(resultado.totalTv)} esTransferencia />
      <Linea etiqueta="📲 Pagos recibidos transf.:"   valor={fmt(resultado.totalTp)} esTransferencia />

      {/* Total principal */}
      <View style={estilos.totalBox}>
        <Text style={estilos.totalEtiqueta}>⭐ Total vendido hoy</Text>
        <Text style={estilos.totalValor}>{fmt(Math.max(0, resultado.total))}</Text>

        {/* Desglose efectivo vs transferencia */}
        <View style={estilos.subtotales}>
          <View style={estilos.subtotalItem}>
            <Text style={estilos.subtotalEtiqueta}>💵 Efectivo</Text>
            <Text style={estilos.subtotalValor}>{fmt(resultado.ventasEfectivo)}</Text>
          </View>
          <View style={estilos.subtotalItem}>
            <Text style={estilos.subtotalEtiqueta}>📲 Transferencia</Text>
            <Text style={estilos.subtotalValor}>{fmt(resultado.ventasTransferencia)}</Text>
          </View>
        </View>
      </View>
    </LinearGradient>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 11,
  },
  titulo: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 11,
    textAlign: 'center',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  linea: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  lineaEtiqueta: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.82)',
  },
  lineaValor: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.white,
  },
  lineaTransf: {
    color: 'rgba(153,246,228,0.9)',
  },
  totalBox: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 13,
    padding: 14,
    marginTop: 14,
    alignItems: 'center',
  },
  totalEtiqueta: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  totalValor: {
    color: Colors.white,
    fontSize: 36,
    fontWeight: '900',
    lineHeight: 40,
  },
  subtotales: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  subtotalItem: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10,
    padding: 8,
    alignItems: 'center',
  },
  subtotalEtiqueta: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
  },
  subtotalValor: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '900',
  },
});
