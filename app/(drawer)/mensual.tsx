import React, { useEffect, useState } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  Alert, ActivityIndicator 
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from 'expo-router';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { useMensualStore } from '../../store/mensualStore';
import { useHistorialStore } from '../../store/historialStore';
import { useGastosStore } from '../../store/gastosStore';
import { fmt } from '../../utils/calcular';
import { Colors } from '../../constants/Colors';

export default function MensualScreen() {
  const navigation = useNavigation<DrawerNavigationProp<any>>();
  const { cierres, cargando, cargar, realizarCierre } = useMensualStore();
  const { historial } = useHistorialStore();
  const { gastos: gastosAdmon, cargar: cargarGastos } = useGastosStore();
  const [procesando, setProcesando] = useState(false);

  // Fecha actual para el botón de cierre
  const mesActual = new Date().toISOString().slice(0, 7); // YYYY-MM
  const yaCerrado = cierres.some(c => c.mes === mesActual);

  // Calculamos una vista previa "en vivo" a partir del historial actual
  const [preview, setPreview] = useState<any>(null);

  useEffect(() => {
    cargar();
    cargarGastos(mesActual);
  }, []);

  // Recalcular la vista previa cuando el historial cambie
  useEffect(() => {
    if (historial.length > 0) {
      const { generarCierreMensual } = require('../../utils/calcular');
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

  // Datos a mostrar: Priorizar el cierre guardado si existe, de lo contrario la vista previa
  const actual = cierres.find(c => c.mes === mesActual) || preview;
  const anteriorClave = () => {
    const [y, m] = mesActual.split('-').map(Number);
    const prevM = m === 1 ? 12 : m - 1;
    const prevY = m === 1 ? y - 1 : y;
    return `${prevY}-${String(prevM).padStart(2, '0')}`;
  };
  const anterior = cierres.find(c => c.mes === anteriorClave());

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
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header con Gradiente Premium */}
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

      {/* Tarjeta Principal de Mes Actual */}
      <View style={styles.card}>
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
            <Text style={[styles.statValue, { color: Colors.green }]}>
              {fmt(actual?.venta_total || 0)}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Compras</Text>
            <Text style={[styles.statValue, { color: Colors.blue }]}>
              {fmt(actual?.compras_total || 0)}
            </Text>
          </View>
        </View>

        <View style={[styles.statsGrid, { marginTop: 15 }]}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Gastos</Text>
            <Text style={[styles.statValue, { color: Colors.orange }]}>
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
          <Text style={styles.utilidadValue}>{fmt(actual?.utilidad || 0)}</Text>
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
      </View>

      {/* Histórico */}
      <Text style={styles.sectionTitle}>Historial de Meses</Text>
      {cierres.length === 0 ? (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="database-off" size={40} color={Colors.gray} />
          <Text style={styles.emptyText}>No hay cierres registrados aún</Text>
        </View>
      ) : (
        cierres.map((c, i) => (
          <View key={c.mes} style={styles.histItem}>
            <View style={styles.histDot} />
            <View style={styles.histContent}>
              <View style={styles.histHeader}>
                <Text style={styles.histMes}>{c.mes}</Text>
                <Text style={styles.histUtilidad}>{fmt(c.utilidad)}</Text>
              </View>
              <Text style={styles.histSub}>
                V: {fmt(c.venta_total)} • C: {fmt(c.compras_total)} • G: {fmt(c.gasto_total)}
              </Text>
              <Text style={[styles.histSub, { marginTop: 2, color: '#b45309', fontWeight: '600' }]}>
                💼 Ret: {fmt(c.retiros_total)} • 👤 Prést: {fmt(c.prestamos_total)} • 💰 Ing: {fmt(c.ingresos_total)}
              </Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
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
  emptyText: { color: Colors.gray, marginTop: 10, fontSize: 14, fontWeight: '600' }
});
