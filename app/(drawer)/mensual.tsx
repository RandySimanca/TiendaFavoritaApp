import React, { useEffect, useState } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  Alert, ActivityIndicator, Modal
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from 'expo-router';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { useMensualStore, CierreMensual } from '../../store/mensualStore';
import { useHistorialStore } from '../../store/historialStore';
import { useGastosStore } from '../../store/gastosStore';
import { fmt, generarCierreMensual } from '../../utils/calcular';
import { Colors } from '../../constants/Colors';

const getDetallesSeguro = (jsonDetalle: any) => {
  if (!jsonDetalle) return null;
  if (typeof jsonDetalle === 'object') return jsonDetalle;
  try {
    return JSON.parse(jsonDetalle);
  } catch {
    return null;
  }
};

export default function MensualScreen() {
  const navigation = useNavigation<DrawerNavigationProp<any>>();
  const { cierres, cargando, cargar, realizarCierre, reabrirMes } = useMensualStore();
  const { historial } = useHistorialStore();
  const { gastos: gastosAdmon, cargar: cargarGastos } = useGastosStore();
  const [procesando, setProcesando] = useState(false);
  const [selectedCierre, setSelectedCierre] = useState<CierreMensual | null>(null);

  // Fecha actual para el botón de cierre
  const mesActual = new Date().toISOString().slice(0, 7); // YYYY-MM
  const yaCerrado = cierres.some(c => c.mes === mesActual);

  // Calculamos una vista previa "en vivo" a partir del historial actual
  const [preview, setPreview] = useState<any>(null);

  useEffect(() => {
    cargar();
    cargarGastos(mesActual);
  }, [cargar, cargarGastos, mesActual]);

  // Recalcular la vista previa cuando el historial cambie
  useEffect(() => {
    if (historial.length > 0) {
      const p = generarCierreMensual(mesActual, historial, gastosAdmon);
      setPreview(p);
    }
  }, [historial, gastosAdmon, mesActual]);

  const handleCerrarMes = () => {
    if (yaCerrado) {
      Alert.alert("Actualizar Cierre", "¿Ya existe un cierre para este mes, deseas actualizarlo con los datos más recientes?", [
        { text: "Cancelar", style: "cancel" },
        { text: "Actualizar", onPress: ejecutarCierre }
      ]);
    } else {
      Alert.alert("Cerrar Mes", "¿Confirmas que deseas generar el resumen financiero de " + mesActual + "?", [
        { text: "Cancelar", style: "cancel" },
        { text: "Confirmar", onPress: ejecutarCierre }
      ]);
    }
  };

  const ejecutarCierre = async () => {
    setProcesando(true);
    await realizarCierre(mesActual, historial);
    setProcesando(false);
    Alert.alert("Éxito", "El cierre mensual se ha generado y sincronizado correctamente.");
  };

  const handleReabrirMes = (mes: string) => {
    Alert.alert("Reabrir Mes", `¿Estás seguro que deseas reabrir el mes de ${mes}? Esto eliminará el resumen estático y permitirá que los datos se recalculen con el historial actual.`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Reabrir", style: "destructive", onPress: async () => {
        setProcesando(true);
        await reabrirMes(mes);
        setSelectedCierre(null);
        setProcesando(false);
        Alert.alert("Éxito", "El mes ha sido reabierto correctamente.");
      }}
    ]);
  };

  // Datos a mostrar: Priorizar el cierre guardado si existe, de lo contrario la vista previa
  const actual = cierres.find(c => c.mes === mesActual) || preview;
  const anteriorClave = () => {
    const [y, m] = mesActual.split('-').map(Number);
    const prevM = m === 1 ? 12 : m - 1;
    const prevY = m === 1 ? y - 1 : y;
    return `${prevY}-${String(prevM).padStart(2, '0')}`;
  };
  const anterior = cierres.find(c => c.mes === anteriorClave());

  // Generar lista combinada de meses (historial en vivo + cierres)
  const mesesHistoricos = Array.from(new Set(historial.map((d: any) => d.fecha?.substring(0, 7)).filter(Boolean))).sort().reverse();
  
  const listaMostrada = mesesHistoricos.map(mes => {
    const cerrado = cierres.find(c => c.mes === mes);
    if (cerrado) return { ...cerrado, isCerrado: true };
    return { ...generarCierreMensual(mes, historial, gastosAdmon), isCerrado: false };
  });

  const Variacion = ({ actual, anterior }: { actual: number, anterior: number }) => {
    if (!anterior || anterior === 0) return null;
    const diff = ((actual - anterior) / anterior) * 100;
    const esPositivo = diff >= 0;
    return (
      <View style={[styles.pill, { backgroundColor: esPositivo ? '#dcfce7' : '#fee2e2' }]}>
        <MaterialCommunityIcons 
          name={esPositivo ? "trending-up" : "trending-down"} 
          size={14} 
          color={esPositivo ? '#166534' : '#991b1b'} 
        />
        <Text style={[styles.pillText, { color: esPositivo ? '#166534' : '#991b1b' }]}>
          {Math.abs(diff).toFixed(1)}%
        </Text>
      </View>
    );
  };

  if (cargando) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.green} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header con Gradiente Premium Fijo */}
      <LinearGradient colors={['#14532d', '#16a34a']} style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 10 }}>
          <TouchableOpacity onPress={() => navigation.openDrawer()}>
            <MaterialCommunityIcons name="menu" size={28} color={Colors.white} />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Resumen Mensual</Text>
            <Text style={styles.headerSubtitle}>Control y Crecimiento del Negocio</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Tarjeta Principal de Mes Actual */}
      <TouchableOpacity 
        style={styles.card}
        activeOpacity={yaCerrado ? 0.8 : 1}
        onPress={() => { if (yaCerrado && actual) setSelectedCierre(actual as CierreMensual) }}
      >
        {!yaCerrado && (
          <View style={[styles.pill, { alignSelf: 'flex-start', marginBottom: 10, backgroundColor: '#fef3c7' }]}>
            <MaterialCommunityIcons name="eye-outline" size={14} color="#92400e" />
            <Text style={[styles.pillText, { color: '#92400e' }]}>Vista en tiempo real</Text>
          </View>
        )}
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Mes en curso: {mesActual}</Text>
          {actual && anterior && (
            <Variacion actual={actual.venta_total} anterior={anterior.venta_total} />
          )}
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Ventas Totales</Text>
            <Text style={[styles.statValue, { color: (actual?.venta_total || 0) < 0 ? Colors.red : Colors.green }]}>
              {fmt(actual?.venta_total || 0)}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Compras</Text>
            <Text style={[styles.statValue, { color: (actual?.compras_total || 0) < 0 ? Colors.red : Colors.blue }]}>
              {fmt(actual?.compras_total || 0)}
            </Text>
          </View>
        </View>

        <View style={[styles.statsGrid, { marginTop: 15 }]}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Gastos</Text>
            <Text style={[styles.statValue, { color: (actual?.gasto_total || 0) < 0 ? Colors.red : Colors.orange }]}>
              {fmt(actual?.gasto_total || 0)}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Transacciones</Text>
            <Text style={[styles.statValue, { color: Colors.dark }]}>
              {actual?.transacciones || 0}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />
        
        {/* Nueva sección para Préstamos y Retiros */}
        <View style={styles.extraGrid}>
          <View style={[styles.extraItem, { backgroundColor: '#fff7ed' }]}>
            <MaterialCommunityIcons name="account-cash" size={20} color="#c2410c" />
            <View>
              <Text style={styles.extraLabel}>Retiros</Text>
              <Text style={styles.extraValue}>{fmt(actual?.retiros_total || 0)}</Text>
            </View>
          </View>
          <View style={[styles.extraItem, { backgroundColor: '#fef3c7' }]}>
            <MaterialCommunityIcons name="account-group" size={20} color="#b45309" />
            <View>
              <Text style={styles.extraLabel}>Préstamos Empleado</Text>
              <Text style={styles.extraValue}>{fmt(actual?.prestamos_total || 0)}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.extraGrid, { marginTop: 10 }]}>
          <View style={[styles.extraItem, { backgroundColor: '#f0fdf4' }]}>
            <MaterialCommunityIcons name="currency-usd" size={20} color="#15803d" />
            <View>
              <Text style={styles.extraLabel}>Ingresos Extra</Text>
              <Text style={styles.extraValue}>{fmt(actual?.ingresos_total || 0)}</Text>
            </View>
          </View>
          <View style={{ flex: 1 }} />
        </View>

        <View style={styles.divider} />

        <View style={styles.utilidadBox}>
          <Text style={styles.utilidadLabel}>Utilidad Neta (Ventas - Compras - Gastos)</Text>
          <Text style={[styles.utilidadValue, { color: (actual?.utilidad || 0) < 0 ? Colors.red : Colors.dark }]}>{fmt(actual?.utilidad || 0)}</Text>
        </View>

        <TouchableOpacity 
          style={[styles.button, yaCerrado && styles.buttonOutline]} 
          onPress={handleCerrarMes}
          disabled={procesando}
        >
          {procesando ? (
            <ActivityIndicator color={yaCerrado ? Colors.green : Colors.white} />
          ) : (
            <>
              <MaterialCommunityIcons 
                name={yaCerrado ? "refresh" : "lock-check"} 
                size={20} 
                color={yaCerrado ? Colors.green : Colors.white} 
              />
              <Text style={[styles.buttonText, yaCerrado && { color: Colors.green }]}>
                {yaCerrado ? "Actualizar Resumen" : "Generar Cierre del Mes"}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </TouchableOpacity>

      {/* Histórico */}
      <Text style={styles.sectionTitle}>Historial de Meses</Text>
      {listaMostrada.length === 0 ? (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="database-off" size={40} color={Colors.gray} />
          <Text style={styles.emptyText}>No hay datos registrados aún</Text>
        </View>
      ) : (
        listaMostrada.map((c: any) => (
          <TouchableOpacity key={c.mes} style={styles.histItem} onPress={() => setSelectedCierre(c as CierreMensual)}>
            <View style={[styles.histDot, !c.isCerrado && { backgroundColor: Colors.orange }]} />
            <View style={styles.histContent}>
              <View style={styles.histHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Text style={styles.histMes}>{c.mes}</Text>
                  {!c.isCerrado && <MaterialCommunityIcons name="clock-outline" size={14} color={Colors.orange} />}
                  {c.isCerrado && <MaterialCommunityIcons name="lock-check" size={14} color={Colors.green} />}
                </View>
                <Text style={[styles.histUtilidad, (c.utilidad < 0) ? { color: Colors.red } : (!c.isCerrado && { color: Colors.orange })]}>{fmt(c.utilidad)}</Text>
              </View>
              <Text style={styles.histSub}>
                V: {fmt(c.venta_total)} • C: {fmt(c.compras_total)} • G: {fmt(c.gasto_total)}
              </Text>
              <Text style={[styles.histSub, { marginTop: 2, color: '#b45309', fontWeight: '600' }]}>
                💼 Ret: {fmt(c.retiros_total)} • 👤 Prést: {fmt(c.prestamos_total)} • 💰 Ing: {fmt(c.ingresos_total)}
              </Text>
            </View>
          </TouchableOpacity>
        ))
      )}
      </ScrollView>

      {/* Modal Detalles del Mes Histórico */}
      <Modal
        visible={!!selectedCierre}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSelectedCierre(null)}
      >
        <View style={styles.modalOverlay}>
          {selectedCierre && (
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Detalles de {selectedCierre.mes}</Text>
                <TouchableOpacity onPress={() => setSelectedCierre(null)}>
                  <MaterialCommunityIcons name="close-circle" size={28} color={Colors.gray} />
                </TouchableOpacity>
              </View>

              <ScrollView>
                <View style={[styles.card, { margin: 0, marginTop: 10 }]}>
                  <View style={styles.statsGrid}>
                    <View style={styles.statItem}>
                      <Text style={styles.statLabel}>Ventas Totales</Text>
                      <Text style={[styles.statValue, { color: (selectedCierre.venta_total < 0) ? Colors.red : Colors.green }]}>
                        {fmt(selectedCierre.venta_total)}
                      </Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statLabel}>Compras</Text>
                      <Text style={[styles.statValue, { color: (selectedCierre.compras_total < 0) ? Colors.red : Colors.blue }]}>
                        {fmt(selectedCierre.compras_total)}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.statsGrid, { marginTop: 15 }]}>
                    <View style={styles.statItem}>
                      <Text style={styles.statLabel}>Gastos</Text>
                      <Text style={[styles.statValue, { color: (selectedCierre.gasto_total < 0) ? Colors.red : Colors.orange }]}>
                        {fmt(selectedCierre.gasto_total)}
                      </Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statLabel}>Transacciones</Text>
                      <Text style={[styles.statValue, { color: Colors.dark }]}>
                        {selectedCierre.transacciones}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.divider} />
                  
                  <View style={styles.extraGrid}>
                    <View style={[styles.extraItem, { backgroundColor: '#fff7ed' }]}>
                      <MaterialCommunityIcons name="account-cash" size={20} color="#c2410c" />
                      <View>
                        <Text style={styles.extraLabel}>Retiros</Text>
                        <Text style={styles.extraValue}>{fmt(selectedCierre.retiros_total)}</Text>
                      </View>
                    </View>
                    <View style={[styles.extraItem, { backgroundColor: '#fef3c7' }]}>
                      <MaterialCommunityIcons name="account-group" size={20} color="#b45309" />
                      <View>
                        <Text style={styles.extraLabel}>Préstamos Empleado</Text>
                        <Text style={styles.extraValue}>{fmt(selectedCierre.prestamos_total)}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={[styles.extraGrid, { marginTop: 10 }]}>
                    <View style={[styles.extraItem, { backgroundColor: '#f0fdf4' }]}>
                      <MaterialCommunityIcons name="currency-usd" size={20} color="#15803d" />
                      <View>
                        <Text style={styles.extraLabel}>Ingresos Extra</Text>
                        <Text style={styles.extraValue}>{fmt(selectedCierre.ingresos_total)}</Text>
                      </View>
                    </View>
                    <View style={{ flex: 1 }} />
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.utilidadBox}>
                    <Text style={styles.utilidadLabel}>Utilidad Neta (Ventas - Compras - Gastos)</Text>
                    <Text style={[styles.utilidadValue, { color: (selectedCierre.utilidad < 0) ? Colors.red : Colors.dark }]}>{fmt(selectedCierre.utilidad)}</Text>
                  </View>

                  {(() => {
                    const detalles = getDetallesSeguro(selectedCierre.json_detalle);
                    if (!detalles) return null;
                    return (
                      <View style={{ marginTop: 10, paddingBottom: 10 }}>
                        <Text style={[styles.sectionTitle, { marginHorizontal: 0, marginTop: 10 }]}>Resumen Operativo</Text>
                        <View style={{ marginTop: 10, padding: 15, backgroundColor: '#f1f5f9', borderRadius: 12 }}>
                          <Text style={{ fontSize: 13, color: Colors.dark, marginBottom: 5, fontWeight: '600' }}>
                            Días trabajados: {detalles.num_dias}
                          </Text>
                          <Text style={{ fontSize: 13, color: Colors.dark, fontWeight: '600' }}>
                            Gastos Administrativos: {fmt(detalles.gastos_admon)}
                          </Text>
                        </View>
                      </View>
                    );
                  })()}

                  {selectedCierre.mes === mesActual && cierres.some(c => c.mes === selectedCierre.mes) && (
                    <TouchableOpacity 
                      style={[styles.button, { marginTop: 15, backgroundColor: Colors.orange }]} 
                      onPress={() => handleReabrirMes(selectedCierre.mes)}
                      disabled={procesando}
                    >
                      {procesando ? (
                        <ActivityIndicator color={Colors.white} />
                      ) : (
                        <>
                          <MaterialCommunityIcons name="lock-open-variant" size={20} color={Colors.white} />
                          <Text style={styles.buttonText}>Reabrir Mes</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </ScrollView>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 30, paddingTop: 60, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerTitle: { color: Colors.white, fontSize: 24, fontWeight: '900' },
  headerSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 4 },
  card: {
    backgroundColor: Colors.white, borderRadius: 20, margin: 16, marginTop: -20,
    padding: 20, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: Colors.dark },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  statItem: { flex: 1 },
  statLabel: { fontSize: 12, color: Colors.gray, marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: '900' },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 15 },
  extraGrid: { flexDirection: 'row', gap: 10 },
  extraItem: { flex: 1, padding: 10, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  extraLabel: { fontSize: 10, color: Colors.gray, fontWeight: '700' },
  extraValue: { fontSize: 13, fontWeight: '800', color: Colors.dark },
  utilidadBox: { alignItems: 'center', marginBottom: 20 },
  utilidadLabel: { fontSize: 11, color: Colors.gray, fontWeight: '600', marginBottom: 5 },
  utilidadValue: { fontSize: 32, fontWeight: '900', color: Colors.dark },
  button: {
    backgroundColor: Colors.green, padding: 15, borderRadius: 12,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8
  },
  buttonOutline: {
    backgroundColor: 'transparent', borderWidth: 2, borderColor: Colors.green
  },
  buttonText: { color: Colors.white, fontWeight: '800', fontSize: 16 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20
  },
  pillText: { fontSize: 12, fontWeight: '800' },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: Colors.dark, marginHorizontal: 20, marginTop: 20, marginBottom: 15 },
  histItem: {
    flexDirection: 'row', marginHorizontal: 20, marginBottom: 15, alignItems: 'center'
  },
  histDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.green, marginRight: 15 },
  histContent: { flex: 1, backgroundColor: Colors.white, padding: 15, borderRadius: 12 },
  histHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  histMes: { fontWeight: '800', fontSize: 15, color: Colors.dark },
  histUtilidad: { fontWeight: '900', color: Colors.green },
  histSub: { fontSize: 11, color: Colors.gray },
  empty: { alignItems: 'center', marginTop: 40 },
  emptyText: { color: Colors.gray, marginTop: 10, fontSize: 14, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { 
    backgroundColor: '#f8fafc', borderTopLeftRadius: 30, borderTopRightRadius: 30, 
    padding: 20, maxHeight: '85%', paddingBottom: 40 
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, marginTop: 10 },
  modalTitle: { fontSize: 20, fontWeight: '900', color: Colors.dark }
});
