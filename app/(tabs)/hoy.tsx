// ═══════════════════════════════════════════════════
// Pantalla "Hoy" — Cuadre diario de ventas
// Equivalente al tab-hoy del HTML original
// Contiene los 7 pasos del cuadre de caja
// ═══════════════════════════════════════════════════

import React, { useRef, useState } from 'react';
import {
  ScrollView, View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView, Platform, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator } from 'react-native';
import { CardSection }   from '../../components/ui/CardSection';
import { ItemRow }       from '../../components/ui/ItemRow';
import { ResultadoDia }  from '../../components/ui/ResultadoDia';
import { TotalBox }      from '../../components/ui/TotalBox';
import { useDiaStore }   from '../../store/diaStore';
import { useHistorialStore } from '../../store/historialStore';
import { useAuthStore }  from '../../store/authStore';
import { Colors }        from '../../constants/Colors';
import { fmt }           from '../../utils/calcular';
import { PerfilModal }   from '../../components/modals/PerfilModal';
import { PDFService }    from '../../utils/pdfService';

// Listas de filas dinámicas disponibles en el store
type ListaKey = 'gastos' | 'creditos' | 'pagos' | 'transferenciaVentas' | 'transferenciaPagos';

export default function HoyScreen() {
  // Suscripción granular al store para evitar re-renders innecesarios
  const base               = useDiaStore(s => s.base);
  const cierre             = useDiaStore(s => s.cierre);
  const retiro             = useDiaStore(s => s.retiro);
  const fecha              = useDiaStore(s => s.fecha);
  const facturas           = useDiaStore(s => s.facturas);
  const gastos             = useDiaStore(s => s.gastos);
  const creditos           = useDiaStore(s => s.creditos);
  const pagos              = useDiaStore(s => s.pagos);
  const transferenciaVentas = useDiaStore(s => s.transferenciaVentas);
  const transferenciaPagos  = useDiaStore(s => s.transferenciaPagos);
  const resultado          = useDiaStore(s => s.resultado);
  const setBase            = useDiaStore(s => s.setBase);
  const setCierre          = useDiaStore(s => s.setCierre);
  const setRetiro          = useDiaStore(s => s.setRetiro);
  const notaRetiro         = useDiaStore(s => s.notaRetiro);
  const setNotaRetiro      = useDiaStore(s => s.setNotaRetiro);
  const agregarFactura     = useDiaStore(s => s.agregarFactura);
  const eliminarFactura    = useDiaStore(s => s.eliminarFactura);
  const agregarFila        = useDiaStore(s => s.agregarFila);
  const eliminarFila       = useDiaStore(s => s.eliminarFila);
  const actualizarFila     = useDiaStore(s => s.actualizarFila);
  const calcular           = useDiaStore(s => s.calcular);
  const limpiar            = useDiaStore(s => s.limpiar);
  const capturarEstado     = useDiaStore(s => s.capturarEstado);
  const procesarIA         = useDiaStore(s => s.procesarFacturaIA);
  const guardandoStore     = useDiaStore(s => s.guardando);

  const guardarDiaHist = useHistorialStore(s => s.guardarDia);
  const rol        = useAuthStore(s => s.rol);
  const perfil     = useAuthStore(s => s.perfil);

  const [perfilVisible, setPerfilVisible] = useState(false);
  const esAdmin = rol === 'admin';
  const scrollRef = useRef<ScrollView>(null);

  // Estado local para el modal de agregar compra manual
  const [modalCompra, setModalCompra] = useState(false);
  const [compraProveedor, setCompraProveedor] = useState('');
  const [compraTotal, setCompraTotal] = useState('');

  // Mapa de listas para acceder fácilmente a cada sección
  const listasMap: Record<ListaKey, { nombre: string; valor: number }[]> = {
    gastos, creditos, pagos, transferenciaVentas, transferenciaPagos
  };

  // Ejecuta una vibración sutil
  function vibrar() {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }

  // Renderiza un grupo de filas dinámicas (gastos, créditos, etc.)
  function renderFilas(lista: ListaKey, placeholder: string, colorBoton: string) {
    const filas = listasMap[lista];
    return (
      <>
        {filas.map((fila, idx) => (
          <ItemRow
            key={idx}
            nombre={fila.nombre}
            valor={fila.valor}
            placeholderNombre={placeholder}
            mostrarEliminar={esAdmin && filas.length > 1}
            onChangeNombre={v => actualizarFila(lista, idx, 'nombre', v)}
            onChangeValor={v  => actualizarFila(lista, idx, 'valor', parseFloat(v) || 0)}
            onEliminar={() => eliminarFila(lista, idx)}
          />
        ))}
        {/* Botón para agregar una fila nueva */}
        <TouchableOpacity
          style={[estilos.btnAgregar, { borderColor: colorBoton }]}
          onPress={() => agregarFila(lista)}
        >
          <Text style={[estilos.btnAgregarTexto, { color: colorBoton }]}>+ Agregar</Text>
        </TouchableOpacity>
        {/* Subtotal de la sección */}
        <TotalBox
          label="Total de esta sección:"
          valor={filas.reduce((s, f) => s + (f.valor || 0), 0)}
          color={colorBoton}
        />
      </>
    );
  }

  // Guarda la compra manual y cierra el modal
  function guardarCompraManual() {
    if (!compraProveedor.trim()) return;
    agregarFactura({
      id: Date.now(),
      proveedor: compraProveedor.trim(),
      resumen: '',
      total: parseFloat(compraTotal) || 0,
    });
    vibrar();
    setCompraProveedor('');
    setCompraTotal('');
    setModalCompra(false);
  }

  // Capturar foto y procesar con IA
  async function handleTomarFoto() {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Necesitamos acceso a la cámara para leer facturas.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.5,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        vibrar();
        const uri = result.assets[0].uri;
        
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: 'base64',
        });

        await procesarIA(`data:image/jpeg;base64,${base64}`);
        Alert.alert('✅ Éxito', 'Factura procesada correctamente.');
      }
    } catch (error: any) {
      console.error("[IA] Error en captura:", error.message || error);
      Alert.alert('Error', 'No se pudo procesar la imagen. Verifica tu conexión.');
    }
  }

  // Guardar el día en el historial
  async function handleGuardar() {
    if (!esAdmin) return;
    const estado = capturarEstado();
    if (estado.total === 0 && estado.base === 0 && estado.cierre === 0) {
      Alert.alert('Sin datos', 'No hay datos para guardar aún.');
      return;
    }
    await guardarDiaHist(estado);
    Alert.alert('✅ Guardado', 'El día fue guardado en el historial.');
  }

  // Limpiar formulario para empezar un nuevo día
  async function handleNuevoDia() {
    if (!esAdmin) return;
    Alert.alert(
      '¿Nuevo día?',
      'Se guardará el día actual y se limpiará el formulario.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, guardar y limpiar',
          onPress: async () => {
            await handleGuardar();
            await limpiar();
          },
        },
      ]
    );
  }

  // Generar y compartir PDF del día actual
  async function handleExportarPDF() {
    try {
      const estado = capturarEstado();
      await PDFService.reporteCuadreDia(estado);
    } catch (error) {
      Alert.alert('Error', 'No se pudo generar el reporte PDF.');
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.white }} edges={['top']}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

      {/* Modal para agregar compra manual (compatible con Android y Web) */}
      <Modal visible={modalCompra} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={estilos.modalFondo}>
            <View style={estilos.modalCaja}>
              <Text style={estilos.modalTitulo}>🛒 Agregar compra</Text>
              <Text style={estilos.modalLabel}>Proveedor:</Text>
              <TextInput
                style={estilos.modalInput}
                value={compraProveedor}
                onChangeText={setCompraProveedor}
                placeholder="Ej: Wilian Ocampo..."
                placeholderTextColor={Colors.gray}
                autoFocus
              />
              <Text style={estilos.modalLabel}>Total ($):</Text>
              <TextInput
                style={estilos.modalInput}
                value={compraTotal}
                onChangeText={setCompraTotal}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={Colors.gray}
              />
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <TouchableOpacity style={estilos.modalBtnCancel} onPress={() => setModalCompra(false)}>
                  <Text style={{ fontWeight: '800', color: Colors.dark }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={estilos.modalBtnOk} onPress={guardarCompraManual}>
                  <Text style={{ color: Colors.white, fontWeight: '900' }}>Agregar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Encabezado verde con nombre de la tienda */}
      <LinearGradient colors={['#14532d', '#16a34a', '#22c55e']} style={estilos.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <TouchableOpacity style={estilos.btnExportar} onPress={handleExportarPDF}>
          <Text style={estilos.btnExportarIcon}>📄</Text>
        </TouchableOpacity>
        <TouchableOpacity style={estilos.btnPerfil} onPress={() => setPerfilVisible(true)}>
          <Text style={estilos.btnPerfilIcon}>👤</Text>
        </TouchableOpacity>
        <Text style={estilos.headerTitulo}>🏪 TIENDA FAVORITA</Text>
        <Text style={estilos.headerSub}>Control Diario de Ventas</Text>
        <View style={estilos.rolBadge}>
          <Text style={estilos.rolTexto}>
            {perfil?.nombre ? `Hola, ${perfil.nombre}` : 
             (esAdmin ? '👑 Admin — acceso completo' : '👤 Trabajador — solo anotar')}
          </Text>
        </View>
        <TouchableOpacity style={estilos.btnExportar} onPress={handleExportarPDF}>
          <Text style={estilos.btnExportarIcon}>📄</Text>
        </TouchableOpacity>
      </LinearGradient>

      <PerfilModal visible={perfilVisible} onClose={() => setPerfilVisible(false)} />

      <ScrollView
        ref={scrollRef}
        style={estilos.scroll}
        contentContainerStyle={estilos.contenido}
        keyboardShouldPersistTaps="handled"
      >

        {/* Fecha del día */}
        <View style={estilos.fechaRow}>
          <Text style={estilos.fechaLabel}>📅 Fecha:</Text>
          <Text style={estilos.fechaValor}>{fecha}</Text>
        </View>

        {/* ── PASO 1: Base al abrir ── */}
        <CardSection icono="💰" titulo="PASO 1 — Plata al ABRIR" color="green">
          <View style={estilos.inputGroup}>
            <Text style={estilos.inputLabel}>Base con la que abrió:</Text>
            <Text style={estilos.prefijo}>$</Text>
            <TextInput
              style={estilos.inputNumerico}
              value={base === 0 ? '' : String(base)}
              onChangeText={v => setBase(parseFloat(v) || 0)}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={Colors.gray}
              textAlign="right"
            />
          </View>
        </CardSection>

        {/* ── PASO 2: Compras del día ── */}
        <CardSection icono="🛒" titulo="PASO 2 — Compras del día" color="blue" badge={facturas.length}>
          {facturas.length === 0 && (
            <Text style={{ color: Colors.gray, fontSize: 13, marginBottom: 8, fontStyle: 'italic' }}>
              Usa la IA para leer tickets o agrégalos manualmente.
            </Text>
          )}

          {/* Botones de acción para compras */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            <TouchableOpacity
              style={[estilos.btnAccionCompra, { backgroundColor: Colors.blue }]}
              onPress={handleTomarFoto}
              disabled={guardandoStore}
            >
              {guardandoStore ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <Text style={estilos.btnAccionCompraTexto}>📸 Leer Factura (IA)</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[estilos.btnAccionCompra, { backgroundColor: Colors.grayLight, borderWidth: 1, borderColor: Colors.border }]}
              onPress={() => setModalCompra(true)}
            >
              <Text style={[estilos.btnAccionCompraTexto, { color: Colors.dark }]}>➕ Manual</Text>
            </TouchableOpacity>
          </View>

          {facturas.map(f => (
            <View key={f.id} style={estilos.facturaItem}>
              <View style={{ flex: 1 }}>
                <Text style={estilos.factProv}>🏭 {f.proveedor}</Text>
                <Text style={estilos.factDesc}>{f.resumen}</Text>
                <Text style={estilos.factValor}>{fmt(f.total)}</Text>
              </View>
              {esAdmin && (
                <TouchableOpacity style={estilos.btnEliminar} onPress={() => eliminarFactura(f.id)}>
                  <Text style={{ color: Colors.red, fontSize: 18 }}>×</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
          {/* Botón para agregar compra manual */}
          <TouchableOpacity
            style={[estilos.btnAgregar, { borderColor: Colors.blue }]}
            onPress={() => setModalCompra(true)}
          >
            <Text style={[estilos.btnAgregarTexto, { color: Colors.blue }]}>+ Agregar compra</Text>
          </TouchableOpacity>
          {/* Total de compras */}
          <TotalBox
            label="Total compras:"
            valor={facturas.reduce((s, f) => s + f.total, 0)}
            color={Colors.blue}
          />
        </CardSection>

        {/* ── PASO 3: Gastos del día (desactivado temporalmente) ──
        <CardSection icono="📤" titulo="PASO 3 — Gastos del día" color="orange">
          {renderFilas('gastos', 'Para qué fue...', Colors.orange)}
        </CardSection>
        */}

        {/* ── PASO 4: Créditos/Fiados (desactivado temporalmente) ──
        <CardSection icono="👥" titulo="PASO 4 — Créditos (fiados)" color="blue">
          {renderFilas('creditos', 'Nombre cliente...', Colors.blue)}
        </CardSection>
        */}

        {/* ── PASO 5: Pagos recibidos en efectivo ── */}
        <CardSection icono="💵" titulo="PASO 5 — Pagos recibidos (efectivo)" color="purple">
          <View style={[estilos.notaBox, { backgroundColor: Colors.purpleLight }]}>
            <Text style={{ color: Colors.purple, fontSize: 12, fontWeight: '700' }}>
              ⚠️ Clientes que pagan deuda en <Text style={{ fontWeight: '900' }}>efectivo</Text>. Entra a caja pero <Text style={{ fontWeight: '900' }}>NO es venta</Text>.
            </Text>
          </View>
          {renderFilas('pagos', 'Nombre cliente...', Colors.purple)}
        </CardSection>

        {/* ── PASO 6: Transferencias ── */}
        <CardSection icono="📲" titulo="PASO 6 — Transferencias" color="teal">
          <View style={[estilos.notaBox, { backgroundColor: Colors.tealLight }]}>
            <Text style={{ color: Colors.teal, fontSize: 12, fontWeight: '700' }}>
              📲 Dinero que llega al celular/cuenta — <Text style={{ fontWeight: '900' }}>NO entra a caja física</Text>.
            </Text>
          </View>

          <Text style={estilos.subLabel}>VENTAS por transferencia:</Text>
          {renderFilas('transferenciaVentas', 'Cliente / producto...', Colors.teal)}

          <Text style={[estilos.subLabel, { marginTop: 14 }]}>
            PAGOS de deuda recibidos por transferencia: <Text style={{ color: Colors.teal }}>(se suman como venta ✅)</Text>
          </Text>
          {renderFilas('transferenciaPagos', 'Nombre cliente...', Colors.teal)}
        </CardSection>

        {/* ── PASO 7: Cierre + Retiro (solo dueña ve retiro) ── */}
        <CardSection icono="🔒" titulo="PASO 7 — Plata al CERRAR" color="green">
          <View style={estilos.inputGroup}>
            <Text style={estilos.inputLabel}>Plata contada al cerrar:</Text>
            <Text style={estilos.prefijo}>$</Text>
            <TextInput
              style={estilos.inputNumerico}
              value={cierre === 0 ? '' : String(cierre)}
              onChangeText={v => setCierre(parseFloat(v) || 0)}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={Colors.gray}
              textAlign="right"
            />
          </View>

          {/* Retiro solo visible para la dueña */}
          {esAdmin && (
            <>
              <View style={estilos.inputGroup}>
                <Text style={estilos.inputLabel}>💼 Retiro del día (caja personal):</Text>
                <Text style={estilos.prefijo}>$</Text>
                <TextInput
                  style={estilos.inputNumerico}
                  value={retiro === 0 ? '' : String(retiro)}
                  onChangeText={v => setRetiro(parseFloat(v) || 0)}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={Colors.gray}
                  textAlign="right"
                />
              </View>
              <TextInput
                style={[estilos.inputNotaRetiro]}
                value={notaRetiro}
                onChangeText={setNotaRetiro}
                placeholder="📝 Nota del retiro (opcional)..."
                placeholderTextColor={Colors.gray}
                maxLength={100}
              />
              <Text style={{ fontSize: 11, color: Colors.gray, fontWeight: '700' }}>
                El retiro se registra por separado — solo visible para usted.
              </Text>
            </>
          )}
        </CardSection>

        {/* ── Botón calcular ── */}
        <TouchableOpacity
          style={estilos.btnCalc}
          onPress={() => { calcular(); scrollRef.current?.scrollToEnd({ animated: true }); }}
          activeOpacity={0.85}
        >
          <LinearGradient colors={['#15803d', '#16a34a']} style={estilos.btnCalcGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Text style={estilos.btnCalcTexto}>🧮 VER TOTAL VENDIDO HOY</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* ── Resultado del cuadre ── */}
        {resultado && (
          <ResultadoDia
            base={base}
            cierre={cierre}
            retiro={retiro}
            resultado={resultado}
            esDuena={esAdmin}
          />
        )}

        {/* ── Botones Guardar / Nuevo día (solo admin) ── */}
        {esAdmin && (
          <View style={estilos.accionBtns}>
            <TouchableOpacity style={estilos.btnGuardar} onPress={handleGuardar} activeOpacity={0.85}>
              <Text style={estilos.btnGuardarTexto}>💾 Guardar día</Text>
            </TouchableOpacity>
            <TouchableOpacity style={estilos.btnNuevo} onPress={handleNuevoDia} activeOpacity={0.85}>
              <Text style={estilos.btnNuevoTexto}>🔄 Nuevo día</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  // Encabezado
  header: {
    paddingTop: 48,
    paddingBottom: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  btnPerfil: {
    position: 'absolute',
    top: 48,
    right: 14,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 8,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnExportar: {
    position: 'absolute',
    top: 48,
    left: 14,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 8,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnExportarIcon: { fontSize: 18 },
  btnPerfilIcon: { fontSize: 18 },
  headerTitulo: { color: Colors.white, fontSize: 20, fontWeight: '900' },
  headerSub:    { color: 'rgba(255,255,255,0.82)', fontSize: 12, marginTop: 2 },
  rolBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingVertical: 3,
    paddingHorizontal: 10,
    marginTop: 5,
  },
  rolTexto: { color: Colors.white, fontSize: 11, fontWeight: '800' },

  // Scroll y contenido
  scroll:    { flex: 1, backgroundColor: Colors.bg },
  contenido: { padding: 12 },

  // Fila de fecha
  fechaRow: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 11,
    marginBottom: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  fechaLabel: { fontWeight: '800', fontSize: 13, color: Colors.gray },
  fechaValor: { flex: 1, fontSize: 14, fontWeight: '700', color: Colors.dark },

  // Inputs
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 9,
  },
  inputLabel:   { flex: 1, fontSize: 13, fontWeight: '700', color: Colors.gray },
  prefijo:      { fontWeight: '900', fontSize: 15, color: '#94a3b8' },
  inputNumerico: {
    width: 145,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 11,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'right',
    color: Colors.dark,
    backgroundColor: Colors.grayLight,
  },

  // Compras
  facturaItem: {
    flexDirection: 'row',
    gap: 9,
    backgroundColor: Colors.blueLight,
    borderWidth: 1.5,
    borderColor: '#bfdbfe',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  btnAccionCompra: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  btnAccionCompraTexto: { fontSize: 13, fontWeight: '900', color: Colors.white },
  factProv:  { fontSize: 12, fontWeight: '800', color: Colors.blueDark },
  factDesc:  { fontSize: 11, color: '#475569' },
  factValor: { fontSize: 16, fontWeight: '900', color: Colors.blue, marginTop: 4 },
  btnEliminar: {
    backgroundColor: Colors.redLight,
    borderRadius: 8,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Botón agregar fila
  btnAgregar: {
    width: '100%',
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 2,
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
    alignItems: 'center',
    marginTop: 3,
  },
  btnAgregarTexto: { fontSize: 13, fontWeight: '800' },

  // Subtotal de sección
  subtotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    borderRadius: 10,
    marginTop: 8,
  },
  subtotalTexto: { fontSize: 13, fontWeight: '800' },

  // Caja de total de compras
  totalBox: {
    borderRadius: 11,
    padding: 11,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  totalBoxLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '700' },
  totalBoxValor: { color: Colors.white, fontSize: 18, fontWeight: '900' },

  // Notas informativas
  notaBox: {
    borderRadius: 9,
    padding: 10,
    marginBottom: 11,
  },
  inputNotaRetiro: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    fontWeight: '700',
    color: Colors.dark,
    backgroundColor: Colors.grayLight,
    marginBottom: 8,
  },
  subLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.gray,
    marginBottom: 8,
  },

  // Botón calcular
  btnCalc: {
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 11,
    shadowColor: Colors.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 4,
  },
  btnCalcGrad:  { padding: 15, alignItems: 'center' },
  btnCalcTexto: { color: Colors.white, fontSize: 17, fontWeight: '900' },

  // Botones guardar / nuevo día
  accionBtns: { flexDirection: 'row', gap: 8, marginBottom: 11 },
  btnGuardar: {
    flex: 1,
    backgroundColor: Colors.green,
    borderRadius: 13,
    padding: 13,
    alignItems: 'center',
    shadowColor: Colors.green,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 3,
  },
  btnGuardarTexto: { color: Colors.white, fontSize: 14, fontWeight: '800' },
  btnNuevo: {
    flex: 1,
    backgroundColor: Colors.blue,
    borderRadius: 13,
    padding: 13,
    alignItems: 'center',
  },
  btnNuevoTexto: { color: Colors.white, fontSize: 14, fontWeight: '800' },

  // Modal de agregar compra
  modalFondo: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCaja: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalTitulo: { fontSize: 15, fontWeight: '900', color: Colors.blueDark, marginBottom: 14 },
  modalLabel:  { fontSize: 13, fontWeight: '700', color: Colors.gray, marginBottom: 5 },
  modalInput: {
    borderWidth: 2, borderColor: Colors.border, borderRadius: 10,
    padding: 10, fontSize: 14, fontWeight: '700', color: Colors.dark,
    backgroundColor: Colors.grayLight, marginBottom: 10,
  },
  modalBtnCancel: { flex: 1, padding: 11, borderRadius: 10, backgroundColor: Colors.grayLight, alignItems: 'center' },
  modalBtnOk:     { flex: 2, padding: 11, borderRadius: 10, backgroundColor: Colors.blue, alignItems: 'center' },
});
