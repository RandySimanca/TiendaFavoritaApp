import React, { useEffect, useState } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator 
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from 'expo-router';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { Colors } from '../../constants/Colors';
import { useHistorialStore } from '../../store/historialStore';
import { useMensualStore } from '../../store/mensualStore';
import { useGastosStore } from '../../store/gastosStore';
import { fmt, calcularDia, generarCierreMensual } from '../../utils/calcular';

type Tab = 'RESULTADOS' | 'BALANCE';

export default function ContabilidadScreen() {
  const navigation = useNavigation<DrawerNavigationProp<any>>();
  const [tab, setTab] = useState<Tab>('RESULTADOS');
  const [mesSeleccionado, setMesSeleccionado] = useState<string>('');

  const { historial, retiros, ingresos, cargando: cHistorial } = useHistorialStore();
  const { cierres, cargar: cMensual, cargando: cCierres } = useMensualStore();
  const { gastos, cargar: cargarGastos, cargando: cGastos } = useGastosStore();

  useEffect(() => {
    cMensual();
    cargarGastos();
  }, [cMensual, cargarGastos]);

  // Determinar la lista de meses disponibles
  const mesesHistoricos = Array.from(new Set(historial.map((d: any) => d.fecha?.substring(0, 7)).filter(Boolean))).sort().reverse();

  useEffect(() => {
    if (mesesHistoricos.length > 0 && !mesSeleccionado) {
      setMesSeleccionado(mesesHistoricos[0]);
    }
  }, [mesesHistoricos, mesSeleccionado]);

  const cargando = cHistorial || cCierres || cGastos;

  // ===== DATOS: ESTADO DE RESULTADOS =====
  const generarEstadoResultados = () => {
    if (!mesSeleccionado) return null;
    
    // Buscar si hay cierre oficial
    const cerrado = cierres.find(c => c.mes === mesSeleccionado);
    if (cerrado) {
      return {
        ventas: cerrado.venta_total,
        costos: cerrado.compras_total,
        utilidadBruta: cerrado.venta_total - cerrado.compras_total,
        gastosOperativos: cerrado.gasto_total,
        utilidadNeta: cerrado.utilidad
      };
    }
    
    // Si no está cerrado, calcular en vivo
    const dataMes = generarCierreMensual(mesSeleccionado, historial, gastos);
    return {
      ventas: dataMes.venta_total,
      costos: dataMes.compras_total,
      utilidadBruta: dataMes.venta_total - dataMes.compras_total,
      gastosOperativos: dataMes.gasto_total,
      utilidadNeta: dataMes.utilidad
    };
  };

  const resultados = generarEstadoResultados();

  // ===== DATOS: BALANCE GENERAL =====
  const generarBalanceGeneral = () => {
    // Activos:
    // Efectivo actual = Es el 'cierre' del último día registrado en el historial (si hay)
    const efectivoEnCaja = historial.length > 0 ? historial[0].cierre || 0 : 0;
    
    // Prestamos a empleados acumulados
    const prestamosAcumulados = historial.reduce((acc, d) => acc + (d.prestamo || 0), 0);

    const totalActivosLíquidos = efectivoEnCaja + prestamosAcumulados;

    // Pasivos = Para esta app, asumimos pasivos a corto plazo en $0
    const pasivosTotales = 0;

    // Patrimonio (Capital):
    // Utilidad Acumulada Histórica (Todos los meses/días)
    const ventasHistoricas = historial.reduce((acc, d) => acc + calcularDia(d as any).total, 0);
    const comprasHistoricas = historial.reduce((acc, d) => acc + calcularDia(d as any).compras, 0);
    const gastosCajaHistoricos = historial.reduce((acc, d) => acc + calcularDia(d as any).totalGastos, 0);
    const gastosAdmonTotales = gastos.reduce((acc, g) => acc + (g.monto || 0), 0);

    const utilidadHistorica = ventasHistoricas - comprasHistoricas - gastosCajaHistoricos - gastosAdmonTotales;
    
    // Retiros dueños
    const retirosSocios = retiros.reduce((acc, r) => acc + (r.valor || 0), 0);
    // Ingresos Extra (inversiones)
    const capitalAportado = ingresos.reduce((acc, i) => acc + (i.valor || 0), 0);

    // Ecuacion contable: Patrimonio = Activos - Pasivos?
    // En este caso, mostramos el capital con utilidades acumuladas
    const patrimonio = (utilidadHistorica + capitalAportado) - retirosSocios;

    return {
      efectivoEnCaja,
      prestamosAcumulados,
      totalActivosLíquidos,
      pasivosTotales,
      utilidadHistorica,
      retirosSocios,
      capitalAportado,
      patrimonio,
      // Descuadre si la caja no matchea el patrimonio de forma exacta.
      descuadre: totalActivosLíquidos - (patrimonio + pasivosTotales)
    };
  };

  const balance = generarBalanceGeneral();

  if (cargando) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.green} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#14532d', '#16a34a']} style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 15 }}>
          <TouchableOpacity onPress={() => navigation.openDrawer()}>
            <MaterialCommunityIcons name="menu" size={28} color={Colors.white} />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Contabilidad</Text>
            <Text style={styles.headerSubtitle}>Superficie Financiera de tu Negocio</Text>
          </View>
        </View>

        {/* Custom Segmented Control */}
        <View style={styles.segmentContainer}>
          <TouchableOpacity 
            style={[styles.segmentBtn, tab === 'RESULTADOS' && styles.segmentBtnActive]}
            onPress={() => setTab('RESULTADOS')}
          >
            <Text style={[styles.segmentText, tab === 'RESULTADOS' && styles.segmentTextActive]}>
              Pérdidas y Ganancias
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.segmentBtn, tab === 'BALANCE' && styles.segmentBtnActive]}
            onPress={() => setTab('BALANCE')}
          >
            <Text style={[styles.segmentText, tab === 'BALANCE' && styles.segmentTextActive]}>
              Balance General
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>

        {tab === 'RESULTADOS' && (
          <View style={styles.tabContent}>
            {/* Combo meses */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthScroll} contentContainerStyle={{ paddingHorizontal: 20 }}>
              {mesesHistoricos.map(m => (
                <TouchableOpacity 
                  key={m} 
                  style={[styles.monthChip, mesSeleccionado === m && styles.monthChipActive]}
                  onPress={() => setMesSeleccionado(m)}
                >
                  <Text style={[styles.monthChipText, mesSeleccionado === m && styles.monthChipTextActive]}>
                    {m}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <MaterialCommunityIcons name="movie-roll" size={24} color={Colors.blue} />
                <Text style={styles.cardTitle}>Estado de Resultados ({mesSeleccionado || 'N/A'})</Text>
              </View>
              <Text style={styles.cardDesc}>
                Conocido como P&G (Pérdidas y Ganancias). Muestra la película de la rentabilidad durante este periodo.
              </Text>

              {resultados ? (
                <View style={styles.reportContainer}>
                  <View style={styles.row}>
                    <Text style={styles.rowLabel}>Ingresos (Ventas)</Text>
                    <Text style={styles.rowValuePos}>{fmt(resultados.ventas)}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.rowLabel}>(-) Costo de Ventas (Compras)</Text>
                    <Text style={styles.rowValueNeg}>{fmt(resultados.costos)}</Text>
                  </View>
                  
                  <View style={styles.dividerBold} />
                  
                  <View style={styles.row}>
                    <Text style={styles.rowLabelBold}>Utilidad Bruta</Text>
                    <Text style={styles.rowValueBold}>{fmt(resultados.utilidadBruta)}</Text>
                  </View>

                  <View style={styles.row}>
                    <Text style={styles.rowLabel}>(-) Gastos Operacionales</Text>
                    <Text style={styles.rowValueNeg}>{fmt(resultados.gastosOperativos)}</Text>
                  </View>

                  <View style={styles.dividerBold} />

                  <View style={styles.rowPrimary}>
                    <Text style={styles.rowPrimaryLabel}>UTILIDAD NETA</Text>
                    <Text style={styles.rowPrimaryValue}>{fmt(resultados.utilidadNeta)}</Text>
                  </View>
                </View>
              ) : (
                <Text style={{ textAlign: 'center', color: Colors.gray, marginTop: 20 }}>
                  No hay datos para el mes seleccionado.
                </Text>
              )}
            </View>
          </View>
        )}

        {tab === 'BALANCE' && (
          <View style={styles.tabContent}>
            <View style={[styles.card, { marginTop: 20 }]}>
              <View style={styles.cardHeader}>
                <MaterialCommunityIcons name="camera" size={24} color={Colors.orange} />
                <Text style={styles.cardTitle}>Balance General Actual</Text>
              </View>
              <Text style={styles.cardDesc}>
                La foto actual del negocio. Lo que la empresa tiene (Activos), debe (Pasivos) y le pertenece (Patrimonio).
              </Text>

              <View style={styles.alertBox}>
                <MaterialCommunityIcons name="information" size={16} color="#0369a1" />
                <Text style={styles.alertText}>
                  Inventario no incluido: Esta app lleva contabilidad de caja, el valor de la mercancía en estantería no se suma actualmente a los activos.
                </Text>
              </View>

              <View style={styles.reportContainer}>
                
                {/* ACTIVOS */}
                <Text style={styles.sectionHeader}>ACTIVOS (Lo que se tiene)</Text>
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Efectivo en Caja (Últ. Cierre)</Text>
                  <Text style={styles.rowValue}>{fmt(balance.efectivoEnCaja)}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Préstamos Empleados (Por cobrar)</Text>
                  <Text style={styles.rowValue}>{fmt(balance.prestamosAcumulados)}</Text>
                </View>
                <View style={styles.dividerBold} />
                <View style={styles.row}>
                  <Text style={styles.rowLabelBold}>TOTAL ACTIVOS LÍQUIDOS</Text>
                  <Text style={styles.rowValueBold}>{fmt(balance.totalActivosLíquidos)}</Text>
                </View>

                {/* PASIVOS */}
                <Text style={[styles.sectionHeader, { marginTop: 20 }]}>PASIVOS (Lo que se debe)</Text>
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Cuentas por Pagar Proveedores</Text>
                  <Text style={styles.rowValue}>{fmt(balance.pasivosTotales)}</Text>
                </View>
                <View style={styles.dividerBold} />
                <View style={styles.row}>
                  <Text style={styles.rowLabelBold}>TOTAL PASIVOS</Text>
                  <Text style={styles.rowValueBold}>{fmt(balance.pasivosTotales)}</Text>
                </View>

                {/* PATRIMONIO */}
                <Text style={[styles.sectionHeader, { marginTop: 20 }]}>PATRIMONIO (Lo de los dueños)</Text>
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Capital / Ingresos Aportados</Text>
                  <Text style={styles.rowValuePos}>{fmt(balance.capitalAportado)}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Utilidad Acumulada Histórica</Text>
                  <Text style={styles.rowValuePos}>{fmt(balance.utilidadHistorica)}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>(-) Retiros Realizados</Text>
                  <Text style={styles.rowValueNeg}>{fmt(balance.retirosSocios)}</Text>
                </View>
                <View style={styles.dividerBold} />
                <View style={styles.rowPrimary}>
                  <Text style={styles.rowPrimaryLabel}>TOTAL PATRIMONIO</Text>
                  <Text style={styles.rowPrimaryValue}>{fmt(balance.patrimonio)}</Text>
                </View>

                {Math.abs(balance.descuadre) > 1000 && (
                  <View style={[styles.alertBox, { backgroundColor: '#fef2f2', borderColor: '#fecaca', marginTop: 15 }]}>
                    <MaterialCommunityIcons name="alert" size={16} color="#dc2626" />
                    <Text style={[styles.alertText, { color: '#dc2626' }]}>
                      Nota: Hay un descuadre histórico acumulado de {fmt(balance.descuadre)} debido a cuadres de caja imperfectos, errores u omisiones en días pasados.
                    </Text>
                  </View>
                )}
              </View>

            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 20, paddingTop: 60, paddingBottom: 20 },
  headerTitle: { color: Colors.white, fontSize: 24, fontWeight: '900' },
  headerSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 4 },
  
  segmentContainer: { 
    flexDirection: 'row', 
    backgroundColor: 'rgba(0,0,0,0.2)', 
    borderRadius: 12, 
    padding: 4,
    marginTop: 20
  },
  segmentBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  segmentBtnActive: { backgroundColor: Colors.white, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
  segmentText: { color: 'rgba(255,255,255,0.8)', fontWeight: '700', fontSize: 14 },
  segmentTextActive: { color: Colors.green, fontWeight: '900' },

  tabContent: { flex: 1 },
  
  monthScroll: { marginVertical: 15, maxHeight: 40 },
  monthChip: { 
    paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, 
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', 
    marginRight: 10, justifyContent: 'center', alignItems: 'center' 
  },
  monthChipActive: { backgroundColor: Colors.green, borderColor: Colors.green },
  monthChipText: { color: Colors.gray, fontWeight: '700' },
  monthChipTextActive: { color: Colors.white, fontWeight: '900' },

  card: {
    backgroundColor: Colors.white, borderRadius: 20, marginHorizontal: 16,
    padding: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  cardTitle: { fontSize: 18, fontWeight: '900', color: Colors.dark },
  cardDesc: { fontSize: 13, color: Colors.gray, marginBottom: 20, lineHeight: 18 },

  alertBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#f0f9ff', padding: 12, borderRadius: 12,
    borderWidth: 1, borderColor: '#bae6fd', marginBottom: 20
  },
  alertText: { flex: 1, fontSize: 12, color: '#0369a1', fontWeight: '500', lineHeight: 18 },

  reportContainer: { backgroundColor: '#f8fafc', padding: 15, borderRadius: 16 },
  sectionHeader: { fontSize: 12, fontWeight: '800', color: Colors.gray, marginBottom: 10, letterSpacing: 0.5 },
  
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  rowLabel: { fontSize: 14, color: Colors.dark },
  rowValue: { fontSize: 14, color: Colors.dark, fontWeight: '600' },
  rowValuePos: { fontSize: 14, color: Colors.green, fontWeight: '700' },
  rowValueNeg: { fontSize: 14, color: Colors.orange, fontWeight: '700' },
  
  rowLabelBold: { fontSize: 15, color: Colors.dark, fontWeight: '800' },
  rowValueBold: { fontSize: 15, color: Colors.dark, fontWeight: '900' },

  dividerBold: { height: 2, backgroundColor: '#cbd5e1', marginVertical: 10 },

  rowPrimary: { 
    flexDirection: 'row', justifyContent: 'space-between', 
    backgroundColor: '#ecfdf5', padding: 15, borderRadius: 12, marginTop: 5,
    borderWidth: 1, borderColor: '#a7f3d0'
  },
  rowPrimaryLabel: { fontSize: 15, color: '#065f46', fontWeight: '900' },
  rowPrimaryValue: { fontSize: 18, color: '#065f46', fontWeight: '900' },
});
