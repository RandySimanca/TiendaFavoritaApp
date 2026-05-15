import { MaterialCommunityIcons } from '@expo/vector-icons';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView, Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { useGastosStore } from '../../store/gastosStore';
import { useHistorialStore } from '../../store/historialStore';
import { useInventarioStore } from '../../store/inventarioStore';
import { useMensualStore } from '../../store/mensualStore';
import { usePreciosStore } from '../../store/preciosStore';
import { calcularDia, fmt, formatInput, generarCierreMensual, parseInput } from '../../utils/calcular';


export default function ContabilidadScreen() {
  const navigation = useNavigation<DrawerNavigationProp<any>>();
  const [tab, setTab] = useState<'RESULTADOS' | 'BALANCE' | 'INVENTARIO' | 'AUDITORIA'>('RESULTADOS');
  const [mesSeleccionado, setMesSeleccionado] = useState<string>('');

  const { retiros, ingresos, historial, cargando: cHistorial } = useHistorialStore();
  const { cierres, cargar: cMensual, cargando: cCierres } = useMensualStore();
  const { gastos, cargar: cargarGastos, cargando: cGastos } = useGastosStore();
  const { valorInventario, setValorInventario, cargar: cPrecios, precios: catalogo } = usePreciosStore();
  const {
    items: itemsInv, movimientos: movsInv,
    cargar: cInventario, calcularResumen,
    registrarConteoFisico,
    sincronizarConCatalogo
  } = useInventarioStore();

  const [editandoInv, setEditandoInv] = useState(false);
  const [modalConteo, setModalConteo] = useState(false);
  const [cantidadesConteo, setCantidadesConteo] = useState<Record<string, string>>({});
  const [inpInventario, setInpInventario] = useState('');

  useEffect(() => {
    cMensual();
    cargarGastos();
    cPrecios();
    cInventario();
  }, [cMensual, cargarGastos, cPrecios, cInventario]);

  useEffect(() => {
    if (valorInventario > 0 && !inpInventario) {
      setInpInventario(formatInput(valorInventario));
    }
  }, [valorInventario, inpInventario]);

  // Determinar la lista de meses disponibles
  const mesesHistoricos = Array.from(new Set(historial.map((d: any) => d.fecha?.substring(0, 7)).filter(Boolean))).sort().reverse();

  useEffect(() => {
    if (mesesHistoricos.length > 0 && !mesSeleccionado) {
      setMesSeleccionado(mesesHistoricos[0]);
    }
  }, [mesesHistoricos, mesSeleccionado]);

  useEffect(() => {
    setInpInventario(formatInput(valorInventario));
  }, [valorInventario]);

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
    const resultadoBase = {
      ventas: dataMes.venta_total,
      costos: dataMes.compras_total,
      utilidadBruta: dataMes.venta_total - dataMes.compras_total,
      gastosOperativos: dataMes.gasto_total,
      utilidadNeta: dataMes.utilidad
    };

    const calcularCMV = (mes: string): number => {
      const salidas = movsInv.filter(
        m => m.fecha.startsWith(mes) && (m.tipo === 'SALIDA' || m.tipo === 'MERMA')
      );
      if (salidas.length > 0) {
        return salidas.reduce((acc, m) => acc + m.valor_total, 0);
      }

      // FALLBACK MANUAL: CMV = Inv Inicial + Compras - Inv Final
      const actual = cierres.find(c => c.mes === mes);
      if (actual && actual.inventario_final > 0) {
        // Buscar el mes anterior para el inventario inicial
        const mesFecha = new Date(mes + '-15');
        mesFecha.setMonth(mesFecha.getMonth() - 1);
        const mesAntStr = mesFecha.toISOString().slice(0, 7);
        const anterior = cierres.find(c => c.mes === mesAntStr);

        const invInicial = anterior ? anterior.inventario_final : 0;
        const invFinal = actual.inventario_final;

        // CMV = Inicial + Compras - Final
        // Solo si el usuario ingresó los valores, si no, regresamos -1 para fallback total
        return Math.max(0, invInicial + resultadoBase.costos - invFinal);
      }

      return -1; // fallback: usar compras del historial
    };

    const cmvReal = calcularCMV(mesSeleccionado);
    const cmv = cmvReal >= 0 ? cmvReal : resultadoBase.costos;

    return {
      ...resultadoBase,
      costos: cmv,
      utilidadBruta: resultadoBase.ventas - cmv,
      utilidadNeta: resultadoBase.ventas - cmv - resultadoBase.gastosOperativos
    };
  };

  const resultados = generarEstadoResultados();

  // ===== DATOS: BALANCE GENERAL =====
  const generarBalanceGeneral = () => {
    const efectivoEnCaja = historial.length > 0 ? historial[0].cierre || 0 : 0;
    const prestamosAcumulados = historial.reduce((acc, d) => acc + (d.prestamo || 0), 0);
    const pasivosTotales = 0;

    const primerDia = historial.length > 0 ? [...historial].sort((a, b) => a.fecha.localeCompare(b.fecha))[0] : null;
    const capitalInicial = primerDia?.base || 0;

    const resumenInv = calcularResumen();
    // Priorizar el valor más alto entre el cálculo automático y la valoración manual
    const valorInvFinal = Math.max(resumenInv.valorCosto, valorInventario);

    const ventasHistoricas = historial.reduce((acc, d) => acc + (calcularDia(d as any).total || 0), 0);
    const comprasHistoricas = historial.reduce((acc, d) => acc + (calcularDia(d as any).compras || 0), 0);
    const gastosCajaHistoricos = historial.reduce((acc, d) => acc + (calcularDia(d as any).totalGastos || 0), 0);
    const gastosAdmonTotales = gastos.reduce((acc, g) => acc + (g.monto || 0), 0);

    const utilidadHistorica = ventasHistoricas - comprasHistoricas - gastosCajaHistoricos - gastosAdmonTotales;
    const retirosBrutos = retiros.reduce((acc, r) => acc + (r.valor || 0), 0);
    const capitalAportado = ingresos.reduce((acc, i) => acc + (i.valor || 0), 0);

    // El dinero en banco es lo que salió de caja pero no se usó para gastos administrativos
    const dineroEnBanco = Math.max(0, retirosBrutos - gastosAdmonTotales);

    const totalActivos = efectivoEnCaja + prestamosAcumulados + valorInvFinal + dineroEnBanco;
    const patrimonio = capitalInicial + utilidadHistorica + valorInvFinal + capitalAportado;

    return {
      efectivoEnCaja,
      prestamosAcumulados,
      valorInventario: valorInvFinal,
      dineroEnBanco,
      totalActivosLíquidos: totalActivos,
      pasivosTotales,
      capitalInicial,
      primerFecha: primerDia?.fecha || '',
      utilidadHistorica,
      retirosSocios: retirosBrutos,
      capitalAportado,
      gastosAdmonTotales,
      patrimonio,
      descuadre: totalActivos - (patrimonio + pasivosTotales)
    };
  };

  const balance = generarBalanceGeneral();

  // ===== DATOS: RECUPERACIÓN DE CAPITAL =====
  const inversionTotal = (balance.capitalInicial || 0) + (balance.capitalAportado || 0);
  const retirosBrutos = balance.retirosSocios;
  const pagosGastos = balance.gastosAdmonTotales;
  const retirosReales = retirosBrutos - pagosGastos;
  
  // Faltante solo en Efectivo (Sin contar mercancía)
  const faltanteEfectivo = inversionTotal - retirosReales;
  const valorMercancia = balance.valorInventario;
  
  // Resultado Real Final (Teniendo en cuenta la mercancía)
  const capitalPendienteReal = faltanteEfectivo - valorMercancia;
  const recuperado = capitalPendienteReal <= 0;
  
  const riquezaTotal = retirosReales + valorMercancia;
  const porcentajeRecuperado = inversionTotal > 0 ? Math.min(100, (riquezaTotal / inversionTotal) * 100) : 0;

  // ===== DATOS: AUDITORÍA =====
  const generarAuditoria = () => {
    const logs: any[] = [];
    const diasOrdenados = [...historial].sort((a, b) => a.fecha.localeCompare(b.fecha));

    let saldoAnterior = -1;

    diasOrdenados.forEach((dia, i) => {
      // 1. Detectar saltos de base (si la apertura de hoy no es lo que cerró ayer)
      // Este es el único lugar donde se generan descuadres reales en este modelo contable
      if (saldoAnterior !== -1 && Math.abs(dia.base - saldoAnterior) > 100) {
        logs.push({
          fecha: dia.fecha,
          tipo: 'SALTO',
          monto: dia.base - saldoAnterior,
          nota: `Cerró con ${fmt(saldoAnterior)} pero abrió con ${fmt(dia.base)}`
        });
      }

      saldoAnterior = dia.cierre || 0;
    });

    return logs.sort((a, b) => b.fecha.localeCompare(a.fecha)); // Orden cronológico inverso
  };

  const auditoria = generarAuditoria();

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
            <Text style={styles.headerSubtitle}>Control y Auditoría de tu Negocio</Text>
          </View>
        </View>

        {/* Segmented Control with 3 options */}
        <View style={styles.segmentContainer}>
          <TouchableOpacity
            style={[styles.segmentBtn, tab === 'RESULTADOS' && styles.segmentBtnActive]}
            onPress={() => setTab('RESULTADOS')}
          >
            <Text style={[styles.segmentText, tab === 'RESULTADOS' && styles.segmentTextActive]}>P&G</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, tab === 'BALANCE' && styles.segmentBtnActive]}
            onPress={() => setTab('BALANCE')}
          >
            <Text style={[styles.segmentText, tab === 'BALANCE' && styles.segmentTextActive]}>Balance</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, tab === 'INVENTARIO' && styles.segmentBtnActive]}
            onPress={() => setTab('INVENTARIO')}
          >
            <Text style={[styles.segmentText, tab === 'INVENTARIO' && styles.segmentTextActive]}>Inventario</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, tab === 'AUDITORIA' && styles.segmentBtnActive]}
            onPress={() => setTab('AUDITORIA')}
          >
            <Text style={[styles.segmentText, tab === 'AUDITORIA' && styles.segmentTextActive]}>Auditoría</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView contentContainerStyle={{ paddingBottom: 300 }} keyboardShouldPersistTaps="handled">

          {tab === 'RESULTADOS' && (
            <View style={styles.tabContent}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthScroll} contentContainerStyle={{ paddingHorizontal: 20 }}>
                {mesesHistoricos.map(m => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.monthChip, mesSeleccionado === m && styles.monthChipActive]}
                    onPress={() => setMesSeleccionado(m)}
                  >
                    <Text style={[styles.monthChipText, mesSeleccionado === m && styles.monthChipTextActive]}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>


              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <MaterialCommunityIcons name="movie-roll" size={24} color={Colors.blue} />
                  <Text style={styles.cardTitle}>Estado de Resultados ({mesSeleccionado || 'N/A'})</Text>
                </View>
                {resultados ? (
                  <View style={styles.reportContainer}>
                    <View style={styles.row}><Text style={styles.rowLabel}>Ingresos (Ventas)</Text><Text style={[styles.rowValuePos, resultados.ventas < 0 && { color: Colors.red }]}>{fmt(resultados.ventas)}</Text></View>
                    <View style={styles.row}><Text style={styles.rowLabel}>(-) Costo (Compras)</Text><Text style={[styles.rowValueNeg, { color: Colors.red }]}>{fmt(resultados.costos)}</Text></View>
                    <View style={styles.dividerBold} />
                    <View style={styles.row}><Text style={styles.rowLabelBold}>Utilidad Bruta</Text><Text style={[styles.rowValueBold, resultados.utilidadBruta < 0 && { color: Colors.red }]}>{fmt(resultados.utilidadBruta)}</Text></View>
                    <View style={styles.row}><Text style={styles.rowLabel}>(-) Gastos Operacionales</Text><Text style={[styles.rowValueNeg, { color: Colors.red }]}>{fmt(resultados.gastosOperativos)}</Text></View>
                    <View style={styles.dividerBold} />
                    <View style={styles.rowPrimary}><Text style={styles.rowPrimaryLabel}>UTILIDAD NETA</Text><Text style={[styles.rowPrimaryValue, resultados.utilidadNeta < 0 && { color: Colors.red }]}>{fmt(resultados.utilidadNeta)}</Text></View>
                  </View>
                ) : (
                  <Text style={styles.emptyText}>No hay datos para este mes.</Text>
                )}

                {/* Ajuste de Inventario Final para el P&G del mes */}
                <View style={[styles.reportContainer, { marginTop: 15, backgroundColor: '#f0f9ff', borderColor: '#bae6fd', borderWidth: 1 }]}>
                  <Text style={[styles.sectionHeader, { color: '#0369a1' }]}>AJUSTE DE INVENTARIO PARA ESTE MES</Text>
                  <View style={styles.row}>
                    <Text style={{ fontSize: 13, color: '#0c4a6e', flex: 1 }}>Ingresa el valor total de mercancía al final de este mes para calcular el costo real:</Text>
                    <TextInput
                      style={[styles.invInput, { borderColor: '#7dd3fc', width: 130, color: '#000000', fontSize: 16 }]}
                      placeholder="$ 0"
                      placeholderTextColor="#94a3b8"
                      cursorColor="#000000"
                      selectionColor="#cbd5e1"
                      keyboardType="numeric"
                      defaultValue={formatInput(cierres.find(c => c.mes === mesSeleccionado)?.inventario_final || 0)}
                      onEndEditing={(e) => {
                        const val = parseInput(e.nativeEvent.text);
                        useMensualStore.getState().realizarCierre(mesSeleccionado, historial, val);
                      }}
                    />
                  </View>
                  <Text style={{ fontSize: 10, color: '#0369a1', marginTop: 5, fontStyle: 'italic' }}>
                    * Esto calculará el CMV como: (Inv. Mes Anterior + Compras - Inv. Final)
                  </Text>
                </View>
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
                <View style={styles.reportContainer}>
                  <Text style={styles.sectionHeader}>ACTIVOS (Lo que el negocio tiene)</Text>
                  <View style={styles.row}><Text style={styles.rowLabel}>Efectivo en Caja</Text><Text style={styles.rowValue}>{fmt(balance.efectivoEnCaja)}</Text></View>
                  <View style={styles.row}>
                    <Text style={styles.rowLabel}>Banco / Reservas (Retiros)</Text>
                    <Text style={styles.rowValuePos}>{fmt(balance.dineroEnBanco)}</Text>
                  </View>
                  <View style={styles.row}><Text style={styles.rowLabel}>Préstamos (Por Cobrar)</Text><Text style={styles.rowValue}>{fmt(balance.prestamosAcumulados)}</Text></View>
                  <View style={styles.row}>
                    <Text style={styles.rowLabel}>Inventario (Mercancía)</Text>
                    {editandoInv ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <TextInput
                          style={[styles.invInput, { color: '#000000' }]}
                          value={inpInventario}
                          onChangeText={t => setInpInventario(formatInput(t))}
                          keyboardType="numeric"
                          autoFocus
                          cursorColor="#000000"
                        />
                        <TouchableOpacity onPress={() => {
                          const val = parseInput(inpInventario);
                          setValorInventario(val);
                          setEditandoInv(false);
                          const mesActual = new Date().toISOString().slice(0, 7);
                          useMensualStore.getState().realizarCierre(mesActual, historial, val);
                        }}>
                          <MaterialCommunityIcons name="check-circle" size={24} color={Colors.green} />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }} onPress={() => setEditandoInv(true)}>
                        <Text style={[styles.rowValue, { color: Colors.blue }]}>{fmt(balance.valorInventario)}</Text>
                        <MaterialCommunityIcons name="pencil" size={14} color={Colors.blue} />
                      </TouchableOpacity>
                    )}
                  </View>
                  <View style={styles.dividerBold} />
                  <View style={styles.row}><Text style={styles.rowLabelBold}>TOTAL ACTIVOS</Text><Text style={styles.rowValueBold}>{fmt(balance.totalActivosLíquidos)}</Text></View>

                  <Text style={[styles.sectionHeader, { marginTop: 20 }]}>PATRIMONIO (Valor Total del Negocio)</Text>
                  <View style={styles.row}><Text style={styles.rowLabel}>Capital Inicial + Aportes</Text><Text style={styles.rowValuePos}>{fmt(balance.capitalInicial + balance.capitalAportado)}</Text></View>
                  <View style={styles.row}><Text style={styles.rowLabel}>Utilidad Neta Histórica</Text><Text style={styles.rowValuePos}>{fmt(balance.utilidadHistorica + balance.valorInventario)}</Text></View>
                  <View style={styles.dividerBold} />
                  <View style={styles.rowPrimary}><Text style={styles.rowPrimaryLabel}>VALOR TOTAL NEGOCIO</Text><Text style={styles.rowPrimaryValue}>{fmt(balance.patrimonio)}</Text></View>

                  {Math.abs(balance.descuadre) > 1000 && (
                    <View style={styles.descuadreBox}>
                      <MaterialCommunityIcons name="alert" size={16} color="#dc2626" />
                      <Text style={styles.descuadreText}>Descuadre Histórico: {fmt(balance.descuadre)}</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Tarjeta: Recuperación de Capital */}
              <View style={[styles.card, { marginTop: 20 }]}>
                <View style={styles.cardHeader}>
                  <MaterialCommunityIcons
                    name={recuperado ? "trophy-outline" : "finance"}
                    size={24}
                    color={recuperado ? Colors.green : Colors.gold}
                  />
                  <Text style={styles.cardTitle}>Recuperación de Capital</Text>
                </View>
                <View style={styles.reportContainer}>
                  <View style={styles.row}>
                    <Text style={styles.rowLabel}>Inversión Inicial + Aportes</Text>
                    <Text style={styles.rowValue}>{fmt(inversionTotal)}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.rowLabel}>(+) Retiros Brutos de Caja</Text>
                    <Text style={styles.rowValuePos}>{fmt(retirosBrutos)}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.rowLabel}>(-) Pago de Gastos (Servicios/Nómina)</Text>
                    <Text style={[styles.rowValueNeg, { color: Colors.red }]}>{fmt(balance.gastosAdmonTotales)}</Text>
                  </View>
                  <View style={styles.dividerBold} />
                  <View style={styles.row}>
                    <Text style={styles.rowLabelBold}>Retiro Neto (Caja/Banco)</Text>
                    <Text style={styles.rowValueBold}>{fmt(retirosReales)}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.rowLabel}>Faltante (Solo Efectivo)</Text>
                    <Text style={styles.rowValue}>{fmt(Math.max(0, faltanteEfectivo))}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.rowLabel}>(-) Valor de Mercancía Actual</Text>
                    <Text style={styles.rowValuePos}>{fmt(valorMercancia)}</Text>
                  </View>
                  <View style={styles.dividerBold} />

                  <View style={capitalPendienteReal > 0 ? styles.rowPending : styles.rowSuccess}>
                    <Text style={styles.rowLabelBold}>
                      {capitalPendienteReal > 0 ? 'Faltante Real por Recuperar' : 'Excedente (Ganancia Real)'}
                    </Text>
                    <Text style={[styles.rowValueBold, capitalPendienteReal > 0 && { color: Colors.red }]}>{fmt(Math.abs(capitalPendienteReal))}</Text>
                  </View>
                  <View style={styles.progressBg}>
                    <LinearGradient colors={recuperado ? [Colors.green, '#22c55e'] : [Colors.gold, '#f59e0b']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.progressBar, { width: `${porcentajeRecuperado}%` }]} />
                  </View>
                  <Text style={styles.progressText}>
                    {recuperado 
                      ? '¡Felicidades! El valor de tu negocio supera tu inversión inicial.' 
                      : `Has asegurado el ${porcentajeRecuperado.toFixed(1)}% de tu inversión entre efectivo e inventario.`}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {tab === 'INVENTARIO' && (
            <View style={styles.tabContent}>
              <View style={[styles.card, { marginTop: 20 }]}>
                <View style={styles.cardHeader}>
                  <MaterialCommunityIcons name="calculator" size={24} color={Colors.green} />
                  <Text style={styles.cardTitle}>Valorización Manual</Text>
                </View>
                <Text style={styles.cardDesc}>
                  Ingresa el valor total estimado de toda tu mercancía actual en dinero. Este valor se usará para el Balance General.
                </Text>
                <View style={styles.reportContainer}>
                  <View style={styles.row}>
                    <Text style={styles.rowLabelBold}>Mercancía Total (Hoy)</Text>
                    <TextInput
                      style={[styles.invInput, { width: 150, fontSize: 18 }]}
                      value={inpInventario}
                      onChangeText={t => setInpInventario(formatInput(t))}
                      onEndEditing={() => {
                        const val = parseInput(inpInventario);
                        setValorInventario(val);
                        // Vincular con el cierre del mes actual automáticamente
                        const mesActual = new Date().toISOString().slice(0, 7);
                        useMensualStore.getState().realizarCierre(mesActual, historial, val);
                      }}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              </View>

              {/* KPIs del Inventario (Calculados desde el valor manual o items) */}
              {(() => {
                const valManual = valorInventario;
                return (
                  <View style={styles.inventoryKpiRow}>
                    <View style={[styles.kpiCard, { borderLeftColor: Colors.blue }]}>
                      <Text style={styles.kpiLabel}>Valor en Stock</Text>
                      <Text style={styles.kpiValue}>{fmt(valManual)}</Text>
                    </View>
                    <View style={[styles.kpiCard, { borderLeftColor: Colors.gold }]}>
                      <Text style={styles.kpiLabel}>Utilidad Est.</Text>
                      <Text style={styles.kpiValue}>{fmt(valManual * 0.3)}</Text>
                      <Text style={{ fontSize: 8, color: Colors.gray }}>Est. 30% margen</Text>
                    </View>
                  </View>
                );
              })()}

              <View style={[styles.card, { marginTop: 20 }]}>
                <View style={styles.cardHeader}>
                  <MaterialCommunityIcons name="format-list-bulleted" size={20} color={Colors.gray} />
                  <Text style={[styles.cardTitle, { fontSize: 16 }]}>Control de Artículos (Opcional)</Text>
                </View>
                <Text style={styles.cardDesc}>
                  Si deseas llevar un conteo detallado por producto, puedes usar las herramientas de abajo.
                </Text>

                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: Colors.blue }]}
                    onPress={() => sincronizarConCatalogo(catalogo)}
                  >
                    <MaterialCommunityIcons name="sync" size={18} color="white" />
                    <Text style={styles.actionBtnText}>Cargar Catálogo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: Colors.green }]}
                    onPress={() => {
                      const initial: Record<string, string> = {};
                      itemsInv.forEach(i => initial[i.id] = String(i.cantidad));
                      setCantidadesConteo(initial);
                      setModalConteo(true);
                    }}
                  >
                    <MaterialCommunityIcons name="clipboard-check" size={18} color="white" />
                    <Text style={styles.actionBtnText}>Conteo Físico</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {tab === 'AUDITORIA' && (
            <View style={styles.tabContent}>
              <View style={[styles.card, { marginTop: 20 }]}>
                <View style={styles.cardHeader}>
                  <MaterialCommunityIcons name="magnify-expand" size={24} color={Colors.red} />
                  <Text style={styles.cardTitle}>Auditoría de Errores</Text>
                </View>
                <Text style={styles.cardDesc}>
                  Aquí puedes ver exactamente qué días el dinero no cuadró. Los errores negativos indican que &quot;faltó&quot; dinero respecto a las ventas.
                </Text>

                {auditoria.length > 0 ? (
                  auditoria.map((log, i) => (
                    <View key={i} style={styles.auditLog}>
                      <View style={styles.auditRow}>
                        <Text style={styles.auditDate}>{log.fecha}</Text>
                        <Text style={[styles.auditMonto, { color: log.monto > 0 ? Colors.green : Colors.orange }]}>
                          {log.monto > 0 ? '+' : ''}{fmt(log.monto)}
                        </Text>
                      </View>
                      <Text style={styles.auditNote}>{log.nota}</Text>
                      <View style={styles.auditBadge}>
                        <Text style={styles.auditBadgeText}>{log.tipo === 'SALTO' ? 'SALTO DE BASE' : 'DESCUADRE CIERRE'}</Text>
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyText}>¡Felicidades! No se han detectado inconsistencias importantes en el historial.</Text>
                )}
              </View>
            </View>
          )}
          {modalConteo && (
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Conteo Físico Real</Text>
                <Text style={styles.modalSub}>Ingresa lo que tienes físicamente en la tienda hoy.</Text>

                <ScrollView style={{ maxHeight: 400 }} keyboardShouldPersistTaps="handled">
                  {itemsInv.filter(i => i.activo).map(item => (
                    <View key={item.id} style={styles.conteoRow}>
                      <Text style={styles.conteoName}>{item.nombre}</Text>
                      <TextInput
                        style={styles.conteoInput}
                        keyboardType="numeric"
                        value={cantidadesConteo[item.id]}
                        onChangeText={v => setCantidadesConteo(prev => ({ ...prev, [item.id]: v }))}
                      />
                    </View>
                  ))}
                </ScrollView>
                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setModalConteo(false)}>
                    <Text style={styles.modalBtnText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalBtnOk} onPress={() => {
                    const data = Object.entries(cantidadesConteo).map(([id, cant]) => ({
                      id,
                      cantidad: parseFloat(cant) || 0
                    }));
                    registrarConteoFisico(data);
                    setModalConteo(false);
                  }}>
                    <Text style={styles.modalBtnText}>Guardar Conteo</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 20, paddingTop: 60, paddingBottom: 20 },
  headerTitle: { color: Colors.white, fontSize: 24, fontWeight: '900' },
  headerSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 4 },
  segmentContainer: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: 4, marginTop: 20 },
  segmentBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  segmentBtnActive: { backgroundColor: Colors.white, elevation: 3 },
  segmentText: { color: 'rgba(255,255,255,0.8)', fontWeight: '700', fontSize: 14 },
  segmentTextActive: { color: Colors.green, fontWeight: '900' },
  tabContent: { flex: 1 },
  monthScroll: { marginVertical: 15, maxHeight: 40 },
  monthChip: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', marginRight: 10 },
  monthChipActive: { backgroundColor: Colors.green, borderColor: Colors.green },
  monthChipText: { color: Colors.gray, fontWeight: '700' },
  monthChipTextActive: { color: Colors.white, fontWeight: '900' },
  card: { backgroundColor: Colors.white, borderRadius: 20, marginHorizontal: 16, padding: 20, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 15 },
  cardTitle: { fontSize: 18, fontWeight: '900', color: Colors.dark },
  cardDesc: { fontSize: 13, color: Colors.gray, marginBottom: 20, lineHeight: 18 },
  reportContainer: { backgroundColor: '#f8fafc', padding: 15, borderRadius: 16 },
  sectionHeader: { fontSize: 11, fontWeight: '800', color: Colors.gray, marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  rowLabel: { fontSize: 14, color: Colors.dark, flex: 1, marginRight: 10 },
  rowValue: { fontSize: 14, color: Colors.dark, fontWeight: '600', textAlign: 'right' },
  rowValuePos: { fontSize: 14, color: Colors.green, fontWeight: '700', textAlign: 'right' },
  rowValueNeg: { fontSize: 14, color: Colors.red, fontWeight: '700', textAlign: 'right' },
  rowLabelBold: { fontSize: 15, fontWeight: '800', flex: 1, marginRight: 10 },
  rowValueBold: { fontSize: 15, fontWeight: '900', textAlign: 'right' },
  dividerBold: { height: 1, backgroundColor: '#cbd5e1', marginVertical: 8 },
  rowPrimary: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#ecfdf5', padding: 12, borderRadius: 10, marginTop: 5, borderWidth: 1, borderColor: '#a7f3d0' },
  rowPrimaryLabel: { fontSize: 14, color: '#065f46', fontWeight: '900', flex: 1, marginRight: 10 },
  rowPrimaryValue: { fontSize: 16, color: '#065f46', fontWeight: '900', textAlign: 'right' },
  emptyText: { textAlign: 'center', color: Colors.gray, marginTop: 20, fontSize: 13 },
  descuadreBox: { flexDirection: 'row', gap: 8, backgroundColor: '#fef2f2', padding: 10, borderRadius: 8, marginTop: 15 },
  descuadreText: { color: '#dc2626', fontSize: 12, fontWeight: '700' },
  auditLog: { backgroundColor: '#fff', borderLeftWidth: 4, borderLeftColor: Colors.red, padding: 12, borderRadius: 8, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  auditRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  auditDate: { fontWeight: '800', color: Colors.dark, fontSize: 14 },
  auditMonto: { fontWeight: '900', fontSize: 15 },
  auditNote: { fontSize: 12, color: Colors.gray, marginTop: 4 },
  auditBadge: { alignSelf: 'flex-start', backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginTop: 6 },
  auditBadgeText: { fontSize: 9, fontWeight: '800', color: Colors.gray },
  invInput: { backgroundColor: '#fff', borderWidth: 1, borderColor: Colors.gray, borderRadius: 8, paddingHorizontal: 10, fontSize: 14, width: 100, textAlign: 'right', color: Colors.dark },
  rowPending: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fff7ed', padding: 10, borderRadius: 8, marginTop: 5, borderWidth: 1, borderColor: '#ffedd5' },
  rowSuccess: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#f0fdf4', padding: 10, borderRadius: 8, marginTop: 5, borderWidth: 1, borderColor: '#dcfce7' },
  progressBg: { height: 10, backgroundColor: '#e2e8f0', borderRadius: 5, marginTop: 15, overflow: 'hidden' },
  progressBar: { height: '100%', borderRadius: 5 },
  progressText: { fontSize: 12, color: Colors.gray, marginTop: 8, textAlign: 'center', fontWeight: '600' },

  // Estilos Inventario
  inventoryKpiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16, marginTop: 15 },
  kpiCard: { flex: 1, minWidth: '45%', backgroundColor: 'white', padding: 12, borderRadius: 12, borderLeftWidth: 4, elevation: 1 },
  kpiLabel: { fontSize: 10, color: Colors.gray, fontWeight: '800', textTransform: 'uppercase' },
  kpiValue: { fontSize: 15, fontWeight: '900', color: Colors.dark, marginTop: 2 },
  actionButtons: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginVertical: 15 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10 },
  actionBtnText: { color: 'white', fontWeight: '800', fontSize: 13 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  itemName: { fontSize: 14, fontWeight: '800', color: Colors.dark },
  itemSub: { fontSize: 11, color: Colors.gray },
  itemQty: { fontSize: 14, fontWeight: '900', color: Colors.dark },
  itemValue: { fontSize: 10, color: Colors.gray },
  movRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  movName: { fontSize: 13, fontWeight: '700', color: Colors.dark },
  movDetail: { fontSize: 11, color: Colors.gray },
  movQty: { fontSize: 14, fontWeight: '900' },

  // Modal
  modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', borderRadius: 20, padding: 20, elevation: 5 },
  modalTitle: { fontSize: 18, fontWeight: '900', color: Colors.dark },
  modalSub: { fontSize: 13, color: Colors.gray, marginBottom: 15 },
  conteoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  conteoName: { fontSize: 14, fontWeight: '600', flex: 1 },
  conteoInput: { backgroundColor: '#f1f5f9', padding: 8, borderRadius: 8, width: 80, textAlign: 'right', fontWeight: '800', color: Colors.dark },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  modalBtnCancel: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: Colors.gray, alignItems: 'center' },
  modalBtnOk: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: Colors.green, alignItems: 'center' },
  modalBtnText: { color: 'white', fontWeight: '900' }
});