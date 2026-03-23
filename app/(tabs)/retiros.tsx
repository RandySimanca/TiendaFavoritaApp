// ═══════════════════════════════════════════════════
// Pantalla Retiros — historial de retiros del administrador
// Equipamiento para la gestión de fondos personales
// Solo accesible para el Admin
// ═══════════════════════════════════════════════════

import React from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useHistorialStore } from '../../store/historialStore';
import { useAuthStore } from '../../store/authStore';
import { fmt } from '../../utils/calcular';
import { Colors } from '../../constants/Colors';
import { useRouter } from 'expo-router';

export default function RetirosScreen() {
  const esAdmin = useAuthStore(s => s.esDuena());
  const { retiros, eliminarRetiro } = useHistorialStore();
  const router = useRouter();

  // Si un trabajador llega aquí, redirigir (doble protección)
  if (!esAdmin) {
    router.replace('/(tabs)/hoy');
    return null;
  }

  // Suma total histórico de retiros
  const totalRetirado = retiros.reduce((s, r) => s + (r.valor || 0), 0);

  // Formatea la fecha en texto legible
  function fechaLegible(fecha: string) {
    if (!fecha) return 'Sin fecha';
    return new Date(fecha + 'T12:00:00').toLocaleDateString('es-CO', {
      weekday: 'long', day: 'numeric', month: 'long',
    });
  }

  // Confirma y elimina un retiro
  function handleEliminar(id: number) {
    Alert.alert('¿Eliminar retiro?', 'Esta acción no se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => eliminarRetiro(id) },
    ]);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.white }} edges={['top']}>
      <ScrollView style={estilos.scroll} contentContainerStyle={estilos.contenido}>

      {/* Encabezado */}
      <View style={estilos.encHead}>
        <Text style={estilos.encTitulo}>💼 Mis Retiros (Admin)</Text>
      </View>

      {/* Resumen total retirado */}
      <LinearGradient colors={['#14532d', '#16a34a']} style={estilos.totalBox} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <Text style={estilos.totalLabel}>Total retirado (histórico)</Text>
        <Text style={estilos.totalValor}>{fmt(totalRetirado)}</Text>
        <Text style={estilos.totalCount}>
          {retiros.length} {retiros.length === 1 ? 'retiro registrado' : 'retiros registrados'}
        </Text>
      </LinearGradient>

      {/* Lista de retiros */}
      {retiros.length === 0 ? (
        <View style={estilos.vacio}>
          <Text style={{ fontSize: 40 }}>💼</Text>
          <Text style={estilos.vacioTexto}>
            No hay retiros aún.{'\n'}Anote un retiro en la pestaña "Hoy" al cerrar el día.
          </Text>
        </View>
      ) : (
        retiros.map((r, i) => (
          <View key={i} style={estilos.item}>
            <View style={{ flex: 1 }}>
              <Text style={estilos.itemFecha}>💼 {fechaLegible(r.fecha)}</Text>
              {r.nota ? (
                <Text style={estilos.itemNota}>📝 {r.nota}</Text>
              ) : (
                <Text style={estilos.itemSub}>Retiro para caja personal</Text>
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={estilos.itemValor}>{fmt(r.valor)}</Text>
              <TouchableOpacity style={estilos.btnDel} onPress={() => r.id !== undefined && handleEliminar(r.id)}>
                <Text style={{ color: Colors.red, fontSize: 18, fontWeight: '800' }}>×</Text>
              </TouchableOpacity>
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
  contenido: { padding: 12, paddingTop: 50 },
  encHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  encTitulo: { fontSize: 16, fontWeight: '900', color: Colors.dark },

  // Caja de total
  totalBox: { borderRadius: 14, padding: 16, marginBottom: 12, alignItems: 'center' },
  totalLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  totalValor: { color: Colors.white, fontSize: 28, fontWeight: '900' },
  totalCount: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '700', marginTop: 4 },

  // Ítem de retiro
  item: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 12,
    marginBottom: 10, flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2,
  },
  itemFecha: { fontSize: 14, fontWeight: '900', color: Colors.dark },
  itemSub:   { fontSize: 11, color: Colors.gray, fontWeight: '700', marginTop: 2 },
  itemNota:  { fontSize: 12, color: '#92400e', fontWeight: '700', marginTop: 2 },
  itemValor: { fontSize: 18, fontWeight: '900', color: Colors.green },
  btnDel: { backgroundColor: Colors.redLight, borderRadius: 8, width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },

  // Pantalla vacía
  vacio: { alignItems: 'center', padding: 40 },
  vacioTexto: { color: Colors.gray, fontSize: 14, fontWeight: '700', textAlign: 'center', marginTop: 10 },
});
