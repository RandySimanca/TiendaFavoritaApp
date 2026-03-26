// ═══════════════════════════════════════════════════
// Pantalla Historial — días guardados con detalles
// Equipamiento para la revisión de cuentas pasadas
// Solo el Admin ve el resumen mensual y el botón eliminar
// ═══════════════════════════════════════════════════

import React, { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, Alert, Platform,
} from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useHistorialStore, DiaGuardado } from '../../store/historialStore';
import { useAuthStore } from '../../store/authStore';
import { fmt, resumenPorMes, calcularDia } from '../../utils/calcular';
import { Colors } from '../../constants/Colors';
import { PDFService } from '../../utils/pdfService';

export default function HistorialScreen() {
  const navigation = useNavigation<DrawerNavigationProp<any>>();
  const router = useRouter();
  const { historial, eliminarDia } = useHistorialStore();
  const esAdmin = useAuthStore(s => s.esDuena());
  // Índice del día expandido (-1 significa ninguno)
  const [expandido, setExpandido] = useState<number>(-1);

  // Formatea la fecha en texto legible: "lunes, 10 de marzo"
  function fechaLegible(fecha: string) {
    if (!fecha) return 'Sin fecha';
    return new Date(fecha + 'T12:00:00').toLocaleDateString('es-CO', {
      weekday: 'long', day: 'numeric', month: 'long',
    });
  }

  // Pide confirmación y elimina un día del historial
  function handleEliminar(fecha: string) {
    Alert.alert('¿Eliminar este día?', 'Esta acción no se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => eliminarDia(fecha) },
    ]);
  }

  // Renderiza el desglose completo de un día guardado
  function renderDetalle(d: DiaGuardado) {
    const seccion = (titulo: string, filas: { nombre: string; valor: number }[]) => {
      if (!filas?.length) return null;
      return (
        <View style={estilos.detSeccion} key={titulo}>
          <Text style={estilos.detTitulo}>{titulo}</Text>
          {filas.map((f, i) => (
            <View key={i} style={estilos.detFila}>
              <Text style={estilos.detNombre}>{f.nombre || '—'}</Text>
              <Text style={estilos.detValor}>{fmt(f.valor || 0)}</Text>
            </View>
          ))}
        </View>
      );
    };

    return (
      <View style={estilos.detalle}>
        {seccion('🛒 Compras', (d.facturas || []).map(f => ({ nombre: `${f.proveedor}: ${f.resumen}`, valor: f.total })))}
        {/*seccion('📤 Gastos', d.gastos)*/}
        {/*{seccion('👥 Fiados', d.creditos)}*/}
        {seccion('💵 Pagos efectivo recibidos', d.pagos)}
        {seccion('📲 Ventas por transferencia', d.transferenciaVentas)}
        {seccion('📲 Pagos deuda transferencia', d.transferenciaPagos)}

        {/* Mensaje explicativo de Pagos en efectivo recibidos */}
        {(d.totalPagos > 0) && (
          <View style={{ backgroundColor: '#e0e7ff', padding: 8, borderRadius: 8, marginBottom: 8, flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ color: '#3730a3', fontSize: 12.5, fontWeight: '700', lineHeight: 18 }}>
              ℹ️ Nota: El TOTAL VENDIDO incluye {fmt(d.totalPagos)} de pagos en efectivo recibidos por ventas fiadas.
            </Text>
          </View>
        )}

        {/* Totales del día */}
        <View style={[estilos.detTotalBox, { marginTop: 4 }]}>
          <Text style={estilos.detTotalLabel}>💰 Base al abrir:</Text>
          <Text style={estilos.detTotalValor}>{fmt(d.base || 0)}</Text>
        </View>
        <View style={estilos.detTotalBox}>
          <Text style={estilos.detTotalLabel}>🔒 Plata al cerrar:</Text>
          <Text style={estilos.detTotalValor}>{fmt(d.cierre || 0)}</Text>
        </View>
        <View style={[estilos.detTotalBox, { marginTop: 6 }]}>
          <Text style={estilos.detTotalLabel}>⭐ TOTAL VENDIDO:</Text>
          <Text style={estilos.detTotalValor}>{fmt(Math.max(0, d.total || 0))}</Text>
        </View>

        {/* Retiro del día (si hay) */}
        {(d.retiro || 0) > 0 && (
          <View style={[estilos.detTotalBox, { backgroundColor: '#fef3c7', marginTop: 4 }]}>
            <View style={{ flex: 1 }}>
              <Text style={[estilos.detTotalLabel, { color: '#92400e' }]}>💼 Retiro del día:</Text>
              {d.notaRetiro ? (
                <Text style={{ fontSize: 11, color: '#a16207', fontWeight: '600', marginTop: 2 }}>
                  📝 {d.notaRetiro}
                </Text>
              ) : null}
            </View>
            <Text style={[estilos.detTotalValor, { color: '#92400e' }]}>{fmt(d.retiro || 0)}</Text>
          </View>
        )}

        {/* Ingreso del día (si hay) */}
        {(d.ingreso || 0) > 0 && (
          <View style={[estilos.detTotalBox, { backgroundColor: '#dcfce7', marginTop: 4 }]}>
            <View style={{ flex: 1 }}>
              <Text style={[estilos.detTotalLabel, { color: '#166534' }]}>💰 Ingreso a caja:</Text>
              {d.notaIngreso ? (
                <Text style={{ fontSize: 11, color: '#15803d', fontWeight: '600', marginTop: 2 }}>
                  📝 {d.notaIngreso}
                </Text>
              ) : null}
            </View>
            <Text style={[estilos.detTotalValor, { color: '#166534' }]}>{fmt(d.ingreso || 0)}</Text>
          </View>
        )}

        {/* Prestamo del día (si hay) */}
        {(d.prestamo || 0) > 0 && (
          <View style={[estilos.detTotalBox, { backgroundColor: '#ffedd5', marginTop: 4 }]}>
            <View style={{ flex: 1 }}>
              <Text style={[estilos.detTotalLabel, { color: '#9a3412' }]}>👤 Préstamo empleado:</Text>
              {d.notaPrestamo ? (
                <Text style={{ fontSize: 11, color: '#c2410c', fontWeight: '600', marginTop: 2 }}>
                  👤 {d.notaPrestamo}
                </Text>
              ) : null}
            </View>
            <Text style={[estilos.detTotalValor, { color: '#9a3412' }]}>{fmt(d.prestamo || 0)}</Text>
          </View>
        )}

        {/* Botón eliminar solo para el admin */}
        {esAdmin && (
          <TouchableOpacity
            style={estilos.btnEliminarDia}
            onPress={() => handleEliminar(d.fecha)}
          >
            <Text style={{ color: Colors.red, fontSize: 13, fontWeight: '800' }}>
              🗑️ Eliminar este día
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // Muestra el historial vacío
  if (!historial.length) {
    return (
      <View style={estilos.vacio}>
        <Text style={estilos.vacioIcono}>📭</Text>
        <Text style={estilos.vacioTexto}>Aún no hay días guardados.{'\n'}Guarda el primer día desde la pestaña "Hoy".</Text>
      </View>
    );
  }

  // Resumen mensual agrupado (solo admin)
  const meses = esAdmin ? resumenPorMes(historial) : {};
  const clavesMeses = Object.keys(meses).sort().reverse();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.white }} edges={['top']}>
      <ScrollView style={estilos.scroll} contentContainerStyle={estilos.contenido}>

      {/* Encabezado */}
      <View style={estilos.encHead}>
        <TouchableOpacity style={estilos.btnMenu} onPress={() => navigation.openDrawer()}>
          <MaterialCommunityIcons name="menu" size={24} color={Colors.dark} />
        </TouchableOpacity>
        <Text style={estilos.encTitulo}>📅 Historial</Text>
        <View style={{ width: 40 }} /> 
      </View>

      {/* Resumen mensual (solo admin) */}
      {esAdmin && clavesMeses.map(clave => {
        const [anio, mes] = clave.split('-');
        const nomMes = new Date(+anio, +mes - 1, 1).toLocaleDateString('es-CO', {
          month: 'long', year: 'numeric',
        });
        const datos = meses[clave];
        return (
          <LinearGradient key={clave} colors={['#1a5e2a', '#2d8a3e']} style={estilos.mesBloq} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Text style={estilos.mesNombre}>📆 {nomMes.toUpperCase()} — {datos.dias} día{datos.dias !== 1 ? 's' : ''}</Text>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
              <View>
                <Text style={estilos.mesEtiq}>💰 Total vendido</Text>
                <Text style={estilos.mesValor}>{fmt(datos.ventas)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={estilos.mesEtiq}>📈 Utilidades 15%</Text>
                <Text style={[estilos.mesValor, { color: '#ffe066' }]}>{fmt(datos.ventas * 0.15)}</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)', paddingTop: 10 }}>
              <View>
                <Text style={estilos.mesEtiq}>📊 Promedio de venta</Text>
                <Text style={[estilos.mesValor, { fontSize: 17 }]}>{fmt(datos.ventas / datos.dias)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={estilos.mesEtiq}>🛒 Total compras</Text>
                <Text style={[estilos.mesValor, { fontSize: 17, color: '#bbf7d0' }]}>{fmt(datos.compras)}</Text>
              </View>
            </View>
          </LinearGradient>
        );
      })}

      {/* Lista de días individuales */}
      {[...historial].sort((a,b) => b.fecha.localeCompare(a.fecha)).map((d, i) => {
        // Forzamos recalculo para aplicar la nueva fórmula matemática (que incluye pagos y omite créditos) a los días ya guardados
        const res = calcularDia(d as any);
        const total = res.total;
        const vEfectivo = res.ventasEfectivo;

        const montoTotal = Math.max(0, total);
        const abierto = expandido === i;
        return (
          <View key={i} style={estilos.histItem}>
            {/* Cabecera del ítem — toca para expandir */}
            <TouchableOpacity
              style={estilos.histHead}
              onPress={() => setExpandido(abierto ? -1 : i)}
              activeOpacity={0.8}
            >
              <View style={{ flex: 1 }}>
                <Text style={estilos.histFecha}>📅 {fechaLegible(d.fecha)}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={estilos.histTotal}>{fmt(montoTotal)}</Text>
                
                <TouchableOpacity 
                   style={estilos.btnMiniEdit} 
                   onPress={(e) => {
                     e.stopPropagation();
                     router.push({ pathname: '/(drawer)/hoy', params: { fecha: d.fecha } });
                   }}
                >
                  <Text style={{ fontSize: 13 }}>✏️</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                   style={estilos.btnMiniExportar} 
                   onPress={(e) => {
                     e.stopPropagation();
                     PDFService.reporteCuadreDia(d);
                   }}
                >
                  <Text style={{ fontSize: 13 }}>📄</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>

            {/* Píldoras de resumen */}
            <View style={estilos.pillRow}>
              {d.totalGastos   > 0 && <View style={[estilos.pill, { backgroundColor: Colors.orangeLight }]}><Text style={[estilos.pillTxt, { color: Colors.orange  }]}>📤 {fmt(d.totalGastos)}</Text></View>}
              {d.totalCreditos > 0 && <View style={[estilos.pill, { backgroundColor: Colors.blueLight   }]}><Text style={[estilos.pillTxt, { color: Colors.blue    }]}>👥 {fmt(d.totalCreditos)}</Text></View>}
              {d.totalPagos    > 0 && <View style={[estilos.pill, { backgroundColor: Colors.purpleLight }]}><Text style={[estilos.pillTxt, { color: Colors.purple  }]}>💵 {fmt(d.totalPagos)}</Text></View>}
              {d.totalTv       > 0 && <View style={[estilos.pill, { backgroundColor: Colors.tealLight   }]}><Text style={[estilos.pillTxt, { color: Colors.teal    }]}>📲 {fmt(d.totalTv)}</Text></View>}
              {(d.prestamo || 0) > 0 && <View style={[estilos.pill, { backgroundColor: '#ffedd5' }]}><Text style={[estilos.pillTxt, { color: '#9a3412' }]}>👤 {fmt(d.prestamo)}</Text></View>}
              <View style={[estilos.pill, { backgroundColor: Colors.greenLight }]}>
                <Text style={[estilos.pillTxt, { color: Colors.greenDark }]}>💵 {fmt(vEfectivo)}</Text>
              </View>
            </View>

            {/* Detalle expandible */}
            {abierto && renderDetalle({ ...d, total: montoTotal, ventasEf: vEfectivo })}
          </View>
        );
      })}

      <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  scroll:    { flex: 1, backgroundColor: Colors.bg },
  contenido: { padding: 12, paddingTop: 20 },
  encHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 40 },
  btnMenu: { padding: 5, borderRadius: 8, backgroundColor: Colors.grayLight },
  encTitulo: { fontSize: 16, fontWeight: '900', color: Colors.dark },

  // Resumen mensual
  mesBloq: { borderRadius: 14, padding: 16, marginBottom: 10 },
  mesNombre: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginBottom: 6 },
  mesEtiq: { color: 'rgba(255,255,255,0.8)', fontSize: 11 },
  mesValor: { color: Colors.white, fontSize: 22, fontWeight: '800' },

  // Ítem del historial
  histItem: { backgroundColor: Colors.white, borderRadius: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2, overflow: 'hidden' },
  histHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12 },
  histFecha: { fontSize: 14, fontWeight: '900', color: Colors.dark },
  histTotal: { fontSize: 16, fontWeight: '900', color: Colors.green },

  // Píldoras
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 12, paddingBottom: 12 },
  pill: { borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3 },
  pillTxt: { fontSize: 11, fontWeight: '700' },

  // Detalle del día
  detalle: { backgroundColor: Colors.grayLight, padding: 12, borderTopWidth: 1, borderTopColor: Colors.border },
  detSeccion: { marginBottom: 10 },
  detTitulo: { fontSize: 12, fontWeight: '800', color: Colors.gray, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 },
  detFila: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, borderBottomWidth: 1, borderBottomColor: Colors.border },
  detNombre: { fontSize: 13, color: Colors.dark },
  detValor: { fontSize: 13, fontWeight: '800' },
  detTotalBox: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: Colors.greenLight, borderRadius: 9, padding: 9, marginBottom: 4 },
  detTotalLabel: { fontSize: 14, fontWeight: '900', color: Colors.greenDark },
  detTotalValor: { fontSize: 14, fontWeight: '900', color: Colors.greenDark },
  btnEliminarDia: { backgroundColor: Colors.redLight, borderRadius: 8, padding: 10, alignItems: 'center', marginTop: 10 },

  // Pantalla vacía
  vacio: { flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center', padding: 40 },
  vacioIcono: { fontSize: 40, marginBottom: 10 },
  vacioTexto: { fontSize: 14, fontWeight: '700', color: Colors.gray, textAlign: 'center' },
  btnMiniExportar: {
    backgroundColor: '#f1f5f9',
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  btnMiniEdit: {
    backgroundColor: '#eff6ff',
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
});
