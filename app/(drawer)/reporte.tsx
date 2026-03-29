import React, { useState, useMemo } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform 
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRouter } from 'expo-router';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';

import { useHistorialStore } from '../../store/historialStore';
import { useAuthStore } from '../../store/authStore';
import { calcularDia } from '../../utils/calcular';
import { fmt } from '../../utils/calcular';
import { Colors } from '../../constants/Colors';

export default function ReporteFechasScreen() {
  const navigation = useNavigation<DrawerNavigationProp<any>>();
  const router = useRouter();
  const esAdmin = useAuthStore(s => s.esDuena());
  
  // Redirigir si no es admin
  if (!esAdmin) {
    router.replace('/(drawer)/hoy');
    return null;
  }

  const { historial } = useHistorialStore();

  // Fechas de estado (por defecto los últimos 7 días)
  const hoy = new Date();
  const semanaPasada = new Date();
  semanaPasada.setDate(hoy.getDate() - 7);

  const [fechaInicio, setFechaInicio] = useState(semanaPasada);
  const [fechaFin, setFechaFin] = useState(hoy);
  
  // Controladores del calendario emergente
  const [showPicker, setShowPicker] = useState<'inicio' | 'fin' | null>(null);

  const formatF = (d: Date) => d.toISOString().slice(0, 10);
  const fInicioStr = formatF(fechaInicio);
  const fFinStr = formatF(fechaFin);

  const onChangeDate = (event: any, selectedDate?: Date) => {
    const currentMode = showPicker;
    setShowPicker(null); // cierra picker en Android

    if (selectedDate) {
      if (currentMode === 'inicio') setFechaInicio(selectedDate);
      if (currentMode === 'fin') setFechaFin(selectedDate);
    }
  };

  // Filtrar y calcular
  const datosFiltrados = useMemo(() => {
    // 1. Filtrar por rango
    const filtrados = historial.filter(dia => {
      if (!dia.fecha) return false;
      return dia.fecha >= fInicioStr && dia.fecha <= fFinStr;
    });

    // 2. Recalcular métricas actuales para precisión absoluta
    const procesados = filtrados.map(dia => {
      const res = calcularDia(dia as any);
      return {
        ...dia,
        _totalReal: res.total,
        _comprasReales: res.compras,
        _gastosReales: res.totalGastos,
      };
    });

    // Ordenar de más reciente a más viejo
    procesados.sort((a, b) => b.fecha.localeCompare(a.fecha));

    // Consolidar Resumen
    const totalVendido = procesados.reduce((acc, d) => acc + d._totalReal, 0);
    const totalCompras = procesados.reduce((acc, d) => acc + d._comprasReales, 0);
    const totalGastos = procesados.reduce((acc, d) => acc + d._gastosReales, 0);
    const utilidades = totalVendido * 0.15;
    const diasOperados = procesados.filter(d => d._totalReal > 0).length;
    const promedio = diasOperados > 0 ? totalVendido / diasOperados : 0;

    return {
      dias: procesados,
      totalVendido,
      totalCompras,
      totalGastos,
      utilidades,
      diasOperados,
      promedio
    };
  }, [historial, fInicioStr, fFinStr]);

  function formatFechaCorta(f: string) {
    if (!f) return '';
    return new Date(f + 'T12:00:00').toLocaleDateString('es-CO', {
      weekday: 'short', day: '2-digit', month: 'short'
    });
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.white }} edges={['top']}>
      {/* Encabezado Fijo */}
      <View style={[estilos.encHead, { paddingHorizontal: 16, marginTop: 16, marginBottom: 8 }]}>
        <TouchableOpacity style={estilos.btnMenu} onPress={() => navigation.openDrawer()}>
          <MaterialCommunityIcons name="menu" size={24} color={Colors.dark} />
        </TouchableOpacity>
        <Text style={estilos.encTitulo}>📊 Reporte por Fechas</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={{ flex: 1, backgroundColor: Colors.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        
        {/* Selector de Rango */}
        <View style={estilos.dateContainer}>
          <View style={estilos.dateBox}>
            <Text style={estilos.dateLabel}>Desde</Text>
            <TouchableOpacity style={estilos.dateBtn} onPress={() => setShowPicker('inicio')}>
              <MaterialCommunityIcons name="calendar-start" size={20} color={Colors.greenDark} />
              <Text style={estilos.dateValue}>{fechaInicio.toLocaleDateString()}</Text>
            </TouchableOpacity>
          </View>
          <View style={estilos.dateBox}>
            <Text style={estilos.dateLabel}>Hasta</Text>
            <TouchableOpacity style={estilos.dateBtn} onPress={() => setShowPicker('fin')}>
              <MaterialCommunityIcons name="calendar-end" size={20} color={Colors.greenDark} />
              <Text style={estilos.dateValue}>{fechaFin.toLocaleDateString()}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tarjeta de Resumen */}
        <LinearGradient colors={['#0f172a', '#1e293b']} style={estilos.tarjetaResumen} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Text style={estilos.resTitle}>
            Resumen del periodo ({datosFiltrados.diasOperados} días)
          </Text>

          <View style={estilos.flexRow}>
            <View>
              <Text style={estilos.resLabel}>Total Vendido</Text>
              <Text style={estilos.resGigaValue}>{fmt(datosFiltrados.totalVendido)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={estilos.resLabel}>Promedio Diario</Text>
              <Text style={[estilos.resGigaValue, { color: '#60a5fa' }]}>{fmt(datosFiltrados.promedio)}</Text>
            </View>
          </View>

          <View style={[estilos.flexRow, { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 12, marginTop: 12 }]}>
            <View>
              <Text style={estilos.resLabel}>Total Compras</Text>
              <Text style={[estilos.resMiniValue, { color: '#f87171' }]}>{fmt(datosFiltrados.totalCompras)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={estilos.resLabel}>Total Gastos</Text>
              <Text style={[estilos.resMiniValue, { color: '#fbbf24' }]}>{fmt(datosFiltrados.totalGastos)}</Text>
            </View>
          </View>

          <View style={[estilos.flexRow, { marginTop: 10 }]}>
            <View>
              <Text style={estilos.resLabel}>Utilidad (15% estimado)</Text>
              <Text style={[estilos.resMiniValue, { color: '#34d399' }]}>{fmt(datosFiltrados.utilidades)}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Detalles de Días */}
        <Text style={estilos.sectionTitle}>Detalles diarios</Text>
        
        {datosFiltrados.dias.length === 0 ? (
          <View style={estilos.vacio}>
            <MaterialCommunityIcons name="calendar-blank" size={40} color={Colors.gray} />
            <Text style={estilos.vacioText}>No hay ventas registradas en este rango de fechas.</Text>
          </View>
        ) : (
          datosFiltrados.dias.map((d, i) => (
            <View key={i} style={estilos.diaCard}>
              <View style={estilos.diaColLeft}>
                <Text style={estilos.diaFecha}>{formatFechaCorta(d.fecha)}</Text>
                <Text style={estilos.diaSub}>Gastos: {fmt(d._gastosReales)}</Text>
              </View>
              <View style={estilos.diaColRight}>
                <Text style={estilos.diaTotal}>{fmt(d._totalReal)}</Text>
                <Text style={estilos.diaCompras}>C: {fmt(d._comprasReales)}</Text>
              </View>
            </View>
          ))
        )}

      </ScrollView>

      {/* Selector Navito de Fecha */}
      {showPicker && (
        <DateTimePicker
          value={showPicker === 'inicio' ? fechaInicio : fechaFin}
          mode="date"
          display="default"
          onChange={onChangeDate}
          maximumDate={new Date()} // No dejar escoger días futuros
        />
      )}
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  encHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  btnMenu: { padding: 5, borderRadius: 8, backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.border },
  encTitulo: { fontSize: 16, fontWeight: '900', color: Colors.dark },

  dateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20
  },
  dateBox: {
    flex: 1,
    marginHorizontal: 5
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.gray,
    marginBottom: 5,
    textTransform: 'uppercase'
  },
  dateBtn: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, shadowOffset: { width:0, height:1 }
  },
  dateValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.dark
  },

  tarjetaResumen: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width:0, height:4 }
  },
  resTitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 15
  },
  flexRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  resLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2
  },
  resGigaValue: {
    color: Colors.white,
    fontSize: 22,
    fontWeight: '900'
  },
  resMiniValue: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '800'
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.dark,
    marginBottom: 10,
    marginLeft: 5
  },

  vacio: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40
  },
  vacioText: {
    color: Colors.gray,
    fontWeight: '600',
    marginTop: 10,
    textAlign: 'center'
  },

  diaCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 2, shadowOffset: { width:0, height:1 },
    borderWidth: 1,
    borderColor: '#f1f5f9'
  },
  diaColLeft: { flex: 1 },
  diaColRight: { alignItems: 'flex-end' },
  diaFecha: { fontSize: 14, fontWeight: '800', color: Colors.dark },
  diaSub: { fontSize: 11, color: Colors.gray, fontWeight: '600', marginTop: 2 },
  diaTotal: { fontSize: 16, fontWeight: '900', color: Colors.greenDark },
  diaCompras: { fontSize: 11, color: '#f87171', fontWeight: '700', marginTop: 2 }
});
