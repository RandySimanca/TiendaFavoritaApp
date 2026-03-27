// ═══════════════════════════════════════════════════
// Pantalla Retiros — historial de retiros del administrador
// Equipamiento para la gestión de fondos personales
// Solo accesible para el Admin
// ═══════════════════════════════════════════════════

import React from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { useNavigation } from 'expo-router';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useHistorialStore } from '../../store/historialStore';
import { useAuthStore } from '../../store/authStore';
import { fmt } from '../../utils/calcular';
import { Colors } from '../../constants/Colors';
import { useRouter } from 'expo-router';

export default function RetirosScreen() {
  const navigation = useNavigation<DrawerNavigationProp<any>>();
  const esAdmin = useAuthStore(s => s.esDuena());
  const { retiros, ingresos, historial, eliminarRetiro, eliminarIngreso } = useHistorialStore();
  const router = useRouter();

  // Si un trabajador llega aquí, redirigir (doble protección)
  if (!esAdmin) {
    router.replace('/(drawer)/hoy');
    return null;
  }

  // Suma totales
  const totalRetirado = retiros.reduce((s, r) => s + (r.valor || 0), 0);
  const totalIngresado = ingresos.reduce((s, i) => s + (i.valor || 0), 0);

  // Préstamos del mes en curso
  const mesActual = new Date().toISOString().slice(0, 7);
  const prestamosMes = historial.filter(d => d.fecha && d.fecha.startsWith(mesActual) && (d.prestamo || 0) > 0);
  const totalPrestamosMes = prestamosMes.reduce((s, d) => s + (d.prestamo || 0), 0);

  // Formatea la fecha en texto legible
  function fechaLegible(fecha: string) {
    if (!fecha) return 'Sin fecha';
    return new Date(fecha + 'T12:00:00').toLocaleDateString('es-CO', {
      weekday: 'long', day: 'numeric', month: 'long',
    });
  }

  // Confirma y elimina un registro
  function handleEliminar(id: number, tipo: 'retiro' | 'ingreso') {
    const titulo = tipo === 'retiro' ? '¿Eliminar retiro?' : '¿Eliminar ingreso?';
    Alert.alert(titulo, 'Esta acción no se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      { 
        text: 'Eliminar', 
        style: 'destructive', 
        onPress: () => tipo === 'retiro' ? eliminarRetiro(id) : eliminarIngreso(id) 
      },
    ]);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.white }} edges={['top']}>
      {/* Encabezado Fijo */}
      <View style={[estilos.encHead, { paddingHorizontal: 16, marginTop: 16, marginBottom: 8 }]}>
        <TouchableOpacity style={estilos.btnMenu} onPress={() => navigation.openDrawer()}>
          <MaterialCommunityIcons name="menu" size={24} color={Colors.dark} />
        </TouchableOpacity>
        <Text style={estilos.encTitulo}>💼 Caja: Retiros e Ingresos</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={estilos.scroll} contentContainerStyle={estilos.contenido}>

      {/* Resumen Totales */}
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
        <LinearGradient colors={['#14532d', '#16a34a']} style={[estilos.totalBox, { flex: 1 }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Text style={estilos.totalLabel}>Retiros</Text>
          <Text style={estilos.totalValorSmall}>{fmt(totalRetirado)}</Text>
        </LinearGradient>
        <LinearGradient colors={['#1e3a8a', '#2563eb']} style={[estilos.totalBox, { flex: 1 }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Text style={estilos.totalLabel}>Ingresos</Text>
          <Text style={estilos.totalValorSmall}>{fmt(totalIngresado)}</Text>
        </LinearGradient>
      </View>
      <LinearGradient colors={['#9a3412', '#ea580c']} style={[estilos.totalBox, { marginBottom: 16 }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <Text style={estilos.totalLabel}>Préstamos a empleados (Este Mes)</Text>
        <Text style={estilos.totalValorSmall}>{fmt(totalPrestamosMes)}</Text>
      </LinearGradient>

      {/* Sección Retiros */}
      <Text style={estilos.seccionTitulo}>💼 Historial de Retiros</Text>
      {retiros.length === 0 ? (
        <View style={estilos.vacio}>
          <Text style={estilos.vacioTexto}>No hay retiros registrados.</Text>
        </View>
      ) : (
        retiros.map((r, i) => (
          <View key={`ret-${i}`} style={estilos.item}>
            <View style={{ flex: 1 }}>
              <Text style={estilos.itemFecha}>{fechaLegible(r.fecha)}</Text>
              <Text style={r.nota ? estilos.itemNota : estilos.itemSub}>
                {r.nota ? `📝 ${r.nota}` : 'Retiro para caja personal'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={estilos.itemValorRet}>{fmt(r.valor)}</Text>
              <TouchableOpacity style={estilos.btnDel} onPress={() => r.id !== undefined && handleEliminar(r.id, 'retiro')}>
                <Text style={{ color: Colors.red, fontSize: 18, fontWeight: '800' }}>×</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}

      {/* Sección Ingresos */}
      <View style={{ marginTop: 20 }} />
      <Text style={estilos.seccionTitulo}>💰 Historial de Ingresos</Text>
      {ingresos.length === 0 ? (
        <View style={estilos.vacio}>
          <Text style={estilos.vacioTexto}>No hay ingresos registrados.</Text>
        </View>
      ) : (
        ingresos.map((ing, i) => (
          <View key={`ing-${i}`} style={estilos.item}>
            <View style={{ flex: 1 }}>
              <Text style={estilos.itemFecha}>{fechaLegible(ing.fecha)}</Text>
              <Text style={ing.nota ? estilos.itemNotaIng : estilos.itemSub}>
                {ing.nota ? `📝 ${ing.nota}` : 'Abono a base de caja'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={estilos.itemValorIng}>{fmt(ing.valor)}</Text>
              <TouchableOpacity style={estilos.btnDel} onPress={() => ing.id !== undefined && handleEliminar(ing.id, 'ingreso')}>
                <Text style={{ color: Colors.red, fontSize: 18, fontWeight: '800' }}>×</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}

      {/* Sección Préstamos */}
      <View style={{ marginTop: 20 }} />
      <Text style={estilos.seccionTitulo}>👤 Préstamos a Empleados (Mes Actual)</Text>
      {prestamosMes.length === 0 ? (
        <View style={estilos.vacio}>
          <Text style={estilos.vacioTexto}>No hay préstamos registrados este mes.</Text>
        </View>
      ) : (
        prestamosMes.map((d, i) => (
          <View key={`pres-${i}`} style={estilos.item}>
            <View style={{ flex: 1 }}>
              <Text style={estilos.itemFecha}>{fechaLegible(d.fecha)}</Text>
              <Text style={d.notaPrestamo ? estilos.itemNotaPres : estilos.itemSub}>
                {d.notaPrestamo ? `👤 ${d.notaPrestamo}` : 'Préstamo empleado'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={estilos.itemValorPres}>{fmt(d.prestamo)}</Text>
            </View>
          </View>
        ))
      )}

      <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  scroll:    { flex: 1, backgroundColor: Colors.bg },
  contenido: { padding: 12, paddingTop: 20 },
  encHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 40 },
  btnMenu: { padding: 5, borderRadius: 8, backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.border },
  encTitulo: { fontSize: 16, fontWeight: '900', color: Colors.dark },

  // Caja de total
  totalBox: { borderRadius: 12, padding: 12, alignItems: 'center', justifyContent: 'center' },
  totalLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', marginBottom: 2 },
  totalValorSmall: { color: Colors.white, fontSize: 18, fontWeight: '900' },
  totalCount: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '700', marginTop: 4 },

  seccionTitulo: { fontSize: 13, fontWeight: '800', color: Colors.gray, marginBottom: 10, textTransform: 'uppercase' },

  // Ítem de lista
  item: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 12,
    marginBottom: 8, flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 1,
  },
  itemFecha: { fontSize: 13, fontWeight: '800', color: Colors.dark },
  itemSub:   { fontSize: 11, color: Colors.gray, fontWeight: '700', marginTop: 1 },
  itemNota:  { fontSize: 11, color: '#92400e', fontWeight: '700', marginTop: 1 },
  itemNotaIng: { fontSize: 11, color: '#166534', fontWeight: '700', marginTop: 1 },
  itemNotaPres: { fontSize: 11, color: '#c2410c', fontWeight: '700', marginTop: 1 },
  itemValorRet: { fontSize: 16, fontWeight: '900', color: Colors.red },
  itemValorIng: { fontSize: 16, fontWeight: '900', color: Colors.green },
  itemValorPres: { fontSize: 16, fontWeight: '900', color: '#c2410c' },
  btnDel: { backgroundColor: Colors.redLight, borderRadius: 8, width: 26, height: 26, alignItems: 'center', justifyContent: 'center' },

  // Pantalla vacía
  vacio: { alignItems: 'center', padding: 40 },
  vacioTexto: { color: Colors.gray, fontSize: 14, fontWeight: '700', textAlign: 'center', marginTop: 10 },
});
