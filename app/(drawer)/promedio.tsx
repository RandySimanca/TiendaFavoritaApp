import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useHistorialStore } from '../../store/historialStore';
import { Colors } from '../../constants/Colors';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function PromedioScreen() {
  const historial = useHistorialStore(s => s.historial);
  
  // Calcular promedios
  const totalVentas = historial.reduce((acc, dia) => acc + (dia.total || 0), 0);
  const diasConVentas = historial.filter(dia => (dia.total || 0) > 0).length;
  const promedioDiario = diasConVentas > 0 ? totalVentas / diasConVentas : 0;

  // Formatear moneda
  const fmt = (v: number) => 
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons name="trending-up" size={40} color={Colors.green} />
        </View>
        <Text style={styles.label}>Promedio de Ventas Diarias</Text>
        <Text style={styles.value}>{fmt(promedioDiario)}</Text>
        <Text style={styles.subtitle}>Basado en {diasConVentas} días registrados</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Total Registrado</Text>
          <Text style={styles.statValue}>{fmt(totalVentas)}</Text>
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    padding: 20,
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
