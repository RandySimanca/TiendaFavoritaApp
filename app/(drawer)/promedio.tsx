import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from 'expo-router';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { useHistorialStore } from '../../store/historialStore';
import { Colors } from '../../constants/Colors';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { formatCurrency } from '../../utils/format';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PromedioScreen() {
  const navigation = useNavigation<DrawerNavigationProp<any>>();
  const historial = useHistorialStore(s => s.historial);
  
  // Calcular promedios
  const totalVentas = historial.reduce((acc, dia) => acc + (dia.total || 0), 0);
  const diasConVentas = historial.filter(dia => (dia.total || 0) > 0).length;
  const promedioDiario = diasConVentas > 0 ? totalVentas / diasConVentas : 0;

  // Día de mayor y menor venta
  const diasValidos = historial.filter(dia => (dia.total || 0) > 0);
  const diaMax = diasValidos.length > 0 ? diasValidos.reduce((max, d) => (d.total || 0) > (max.total || 0) ? d : max, diasValidos[0]) : null;
  const diaMin = diasValidos.length > 0 ? diasValidos.reduce((min, d) => (d.total || 0) < (min.total || 0) ? d : min, diasValidos[0]) : null;

  function formatFechaCorta(fecha: string) {
    if (!fecha) return '—';
    return new Date(fecha + 'T12:00:00').toLocaleDateString('es-CO', {
      day: 'numeric', month: 'short'
    });
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8F9FA' }} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.btnMenu} onPress={() => navigation.openDrawer()}>
          <MaterialCommunityIcons name="menu" size={24} color={Colors.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📊 Promedio Diario</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons name="trending-up" size={40} color={Colors.green} />
        </View>
        <Text style={styles.label}>Promedio de Ventas Diarias</Text>
        <Text style={styles.value}>{formatCurrency(promedioDiario)}</Text>
        <Text style={styles.subtitle}>Basado en {diasConVentas} días registrados</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Venta Máxima</Text>
          <Text style={[styles.statValue, { color: Colors.greenDark }]}>{diaMax ? formatCurrency(diaMax.total) : '—'}</Text>
          <Text style={styles.statDate}>{diaMax ? formatFechaCorta(diaMax.fecha) : ''}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Venta Mínima</Text>
          <Text style={[styles.statValue, { color: Colors.orange }]}>{diaMin ? formatCurrency(diaMin.total) : '—'}</Text>
          <Text style={styles.statDate}>{diaMin ? formatFechaCorta(diaMin.fecha) : ''}</Text>
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Total Registrado</Text>
          <Text style={styles.statValue}>{formatCurrency(totalVentas)}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Días Operados</Text>
          <Text style={styles.statValue}>{diasConVentas}</Text>
        </View>
      </View>

      <View style={styles.infoBox}>
        <MaterialCommunityIcons name="information-outline" size={20} color={Colors.gray} />
        <Text style={styles.infoText}>
          Esta métrica se calcula promediando el total vendido de todos los días cerrados en tu historial.
        </Text>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    backgroundColor: '#F8F9FA',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.dark,
  },
  btnMenu: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: Colors.white,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  container: {
    padding: 20,
    backgroundColor: '#F8F9FA',
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    marginBottom: 20,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    color: Colors.gray,
    fontWeight: '600',
    marginBottom: 10,
  },
  value: {
    fontSize: 32,
    fontWeight: '900',
    color: Colors.green,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    color: '#999',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statBox: {
    backgroundColor: Colors.white,
    borderRadius: 15,
    padding: 15,
    width: '48%',
    elevation: 2,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.gray,
    marginBottom: 5,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statDate: {
    fontSize: 10,
    color: Colors.gray,
    marginTop: 2,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.03)',
    padding: 15,
    borderRadius: 10,
  },
  infoText: {
    fontSize: 13,
    color: Colors.gray,
    marginLeft: 10,
    flex: 1,
    fontStyle: 'italic',
  },
});
