import React, { useRef, useState, useEffect } from 'react';
import {
  ScrollView, View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView, Platform, Modal,
  ActivityIndicator, SafeAreaView
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation, useLocalSearchParams } from 'expo-router';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';

import { CardSection }   from '../../components/ui/CardSection';
import { ItemRow }       from '../../components/ui/ItemRow';
import { ResultadoDia }  from '../../components/ui/ResultadoDia';
import { TotalBox }      from '../../components/ui/TotalBox';
import { useDiaStore }   from '../../store/diaStore';
import { useHistorialStore } from '../../store/historialStore';
import { useAuthStore }  from '../../store/authStore';
import { Colors }        from '../../constants/Colors';
import { fmt, formatInput, parseInput, calcularDia } from '../../utils/calcular';
import { PerfilModal }   from '../../components/modals/PerfilModal';

export default function HoyScreen() {
  const navigation = useNavigation<DrawerNavigationProp<any>>();
  const scrollRef = useRef<ScrollView>(null);
  const { fecha: fechaParam } = useLocalSearchParams();
  const esAdmin = useAuthStore(s => s.esDuena());
  const perfil = useAuthStore(s => s.perfil);

  const {
    fecha, base, cierre, retiro, notaRetiro, ingreso, notaIngreso, prestamo, notaPrestamo,
    facturas, gastos, creditos, pagos, transferenciaVentas, transferenciaPagos,
    setBase, setCierre, setRetiro, setIngreso, setFecha, setPrestamo, setNotaPrestamo,
    agregarFactura, eliminarFactura, procesarFacturaIA,
    limpiar, cargarDiaActual
  } = useDiaStore();

  const [resultado, setResultado] = useState<any>(null);
  const [modalCompra, setModalCompra] = useState(false);
  const [compraProveedor, setCompraProveedor] = useState('');
  const [compraTotal, setCompraTotal] = useState('');
  const [guardandoStore, setGuardandoStore] = useState(false);
  const [perfilVisible, setPerfilVisible] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    cargarDiaActual(fechaParam as string);
  }, [fechaParam, cargarDiaActual]);

  useEffect(() => {
    const res = calcularDia(useDiaStore.getState());
    setResultado(res);
  }, [base, cierre, retiro, ingreso, prestamo, facturas, gastos, creditos, pagos, transferenciaVentas, transferenciaPagos]);

  const handleSeleccionarGaleria = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Error', 'Acceso a galeria denegado.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      base64: true,
      quality: 0.4,
    });

    if (!result.canceled && result.assets[0].base64) {
      setGuardandoStore(true);
      try {
        await procesarFacturaIA(result.assets[0].base64);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (err: any) {
        Alert.alert('Error IA', err.message);
      } finally {
        setGuardandoStore(false);
      }
    }
  };

  const handleTomarFoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Error', 'Acceso a camara denegado.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      base64: true,
      quality: 0.4,
    });

    if (!result.canceled && result.assets[0].base64) {
      setGuardandoStore(true);
      try {
        await procesarFacturaIA(result.assets[0].base64);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (err: any) {
        Alert.alert('Error IA', err.message);
      } finally {
        setGuardandoStore(false);
      }
    }
  };

  const guardarCompraManual = () => {
    const total = parseInput(compraTotal);
    if (!compraProveedor || total <= 0) {
      Alert.alert('Error', 'Ingresa proveedor y valor valido.');
      return;
    }
    agregarFactura({
      id: Date.now(),
      proveedor: compraProveedor,
      resumen: 'Compra manual',
      total: total
    });
    setCompraProveedor('');
    setCompraTotal('');
    setModalCompra(false);
  };

  const handleGuardar = async () => {
    try {
      const estadoCompleto = useDiaStore.getState().capturarEstado();
      await useHistorialStore.getState().guardarDia(estadoCompleto);
      Alert.alert('Guardado', 'El cuadre del dia se ha sincronizado correctamente.');
    } catch {
      Alert.alert('Error', 'No se pudo guardar el historial.');
    }
  };

  const handleNuevoDia = () => {
    Alert.alert('Nuevo dia?', 'Se limpiara el formulario y se usara el cierre de hoy como base de manana.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Confirmar', onPress: () => limpiar(cierre) }
    ]);
  };

  const onFechaChange = (event: any, selectedDate?: Date) => {
    setShowPicker(false);
    if (selectedDate) {
      const nuevaFecha = selectedDate.toISOString().slice(0, 10);
      setFecha(nuevaFecha);
      cargarDiaActual(nuevaFecha);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const renderFilas = (tipo: any, placeholder: string, color: any) => {
    const filas = (useDiaStore.getState() as any)[tipo] || [];
    return (
      <View>
        {filas.map((f: any, i: number) => (
          <ItemRow
            key={i}
            nombre={f.nombre}
            valor={f.valor}
            placeholderNombre={placeholder}
            mostrarEliminar={esAdmin}
            onChangeNombre={(t) => useDiaStore.getState().actualizarFila(tipo, i, 'nombre', t)}
            onChangeValor={(v) => useDiaStore.getState().actualizarFila(tipo, i, 'valor', v)}
            onEliminar={() => useDiaStore.getState().eliminarFila(tipo, i)}
          />
        ))}
        <TouchableOpacity 
          style={[estilos.btnAgregar, { borderColor: color }]} 
          onPress={() => useDiaStore.getState().agregarFila(tipo)}
        >
          <Text style={[estilos.btnAgregarTexto, { color }]}>+ Agregar fila</Text>
        </TouchableOpacity>
        <TotalBox 
          label={`Total ${tipo}:`} 
          valor={filas.reduce((acc: number, f: any) => acc + (f.valor || 0), 0)} 
          color={color} 
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#14532d' }}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <Modal visible={modalCompra} transparent animationType="fade">
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={estilos.modalFondo}
        >
          <View style={estilos.modalCaja}>
            <Text style={estilos.modalTitulo}>Agregar compra</Text>
            <Text style={estilos.modalLabel}>Proveedor:</Text>
            <TextInput
              style={estilos.modalInput}
              value={compraProveedor}
              onChangeText={setCompraProveedor}
              placeholder="Ej: cliente..."
              placeholderTextColor={Colors.gray}
              autoFocus
            />
            <Text style={estilos.modalLabel}>Total ($):</Text>
            <TextInput
              style={estilos.modalInput}
              value={compraTotal}
              onChangeText={v => setCompraTotal(formatInput(v))}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={Colors.gray}
            />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <TouchableOpacity style={estilos.modalBtnCancel} onPress={() => setModalCompra(false)}>
                <Text style={{ fontWeight: '800', color: Colors.dark }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={estilos.modalBtnOk} onPress={guardarCompraManual}>
                <Text style={{ color: Colors.white, fontWeight: '900' }}>Agregar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <LinearGradient colors={['#14532d', '#16a34a', '#22c55e']} style={estilos.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <TouchableOpacity style={estilos.btnMenu} onPress={() => navigation.openDrawer()}>
          <MaterialCommunityIcons name="menu" size={24} color={Colors.white} />
        </TouchableOpacity>
        
        <TouchableOpacity style={estilos.btnPerfil} onPress={() => setPerfilVisible(true)}>
          <Text style={estilos.btnPerfilIcon}>👤</Text>
        </TouchableOpacity>
        
        <Text style={estilos.headerTitulo}>🏪 TIENDA FAVORITA</Text>
        <Text style={estilos.headerSub}>Control Diario de Ventas</Text>

        <View style={estilos.rolBadge}>
          <Text style={estilos.rolTexto}>
            {perfil?.nombre ? `Hola, ${perfil.nombre}` : 
             (esAdmin ? '👑 Admin' : '👤 Trabajador')}
          </Text>
        </View>
      </LinearGradient>

      <PerfilModal visible={perfilVisible} onClose={() => setPerfilVisible(false)} />

      <ScrollView
        ref={scrollRef}
        style={estilos.scroll}
        contentContainerStyle={estilos.contenido}
        keyboardShouldPersistTaps="handled"
      >
        <View style={estilos.fechaRow}>
          <Text style={estilos.fechaLabel}>📅 Fecha de trabajo:</Text>
          <TouchableOpacity style={estilos.fechaSelect} onPress={() => setShowPicker(true)}>
            <Text style={estilos.fechaTexto}>{fecha || 'Seleccionar...'}</Text>
            <MaterialCommunityIcons name="calendar-edit" size={18} color={Colors.blue} />
          </TouchableOpacity>
          {showPicker && (
            <DateTimePicker
              value={new Date(fecha + 'T12:00:00')}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onFechaChange}
            />
          )}
          <TouchableOpacity style={estilos.fechaHoyBtn} onPress={() => {
            const hoy = new Date().toISOString().slice(0, 10);
            setFecha(hoy);
            cargarDiaActual(hoy);
          }}>
            <Text style={estilos.fechaHoyTxt}>Hoy</Text>
          </TouchableOpacity>
        </View>

        <CardSection icono="💰" titulo="PASO 1 — Plata al ABRIR" color="green">
          <View style={estilos.inputGroup}>
            <Text style={estilos.inputLabel}>Base con la que abrió:</Text>
            <Text style={estilos.prefijo}>$</Text>
            <TextInput 
              style={estilos.inputNumerico} 
              value={formatInput(base)} 
              onChangeText={v => setBase(parseInput(v))} 
              keyboardType="numeric" 
              textAlign="right" 
            />
          </View>
          {esAdmin && (
            <>
              <View style={estilos.inputGroup}>
                <Text style={estilos.inputLabel}>Otros ingresos (base):</Text>
                <Text style={estilos.prefijo}>$</Text>
                <TextInput 
                  style={estilos.inputNumerico} 
                  value={formatInput(ingreso)} 
                  onChangeText={v => setIngreso(parseInput(v))} 
                  keyboardType="numeric" 
                  textAlign="right" 
                />
              </View>
              <TextInput 
                style={estilos.inputNotaRetiro} 
                placeholder="Nota del ingreso (por qué entró plata)..." 
                value={notaIngreso} 
                onChangeText={v => useDiaStore.setState({ notaIngreso: v })} 
              />
            </>
          )}
        </CardSection>

        <CardSection icono="🛒" titulo="PASO 2 — Compras del día" color="blue" badge={facturas.length}>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
            <TouchableOpacity style={[estilos.fotoBtn, { flex: 1, marginBottom: 0 }]} onPress={handleTomarFoto} disabled={guardandoStore}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Text style={{ fontSize: 20 }}>📷</Text>
                <Text style={[estilos.fotoBtnTexto, { fontSize: 13 }]}>Cámara</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[estilos.fotoBtn, { flex: 1, marginBottom: 0, backgroundColor: Colors.teal }]} 
              onPress={handleSeleccionarGaleria} 
              disabled={guardandoStore}
            >
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Text style={{ fontSize: 20 }}>🖼️</Text>
                <Text style={[estilos.fotoBtnTexto, { fontSize: 13 }]}>Galería</Text>
              </View>
            </TouchableOpacity>
          </View>

          {guardandoStore && (
            <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'center', marginBottom: 12 }}>
              <ActivityIndicator color={Colors.blue} size="small" />
              <Text style={{ color: Colors.blue, fontWeight: '800', fontSize: 13 }}>La IA está leyendo...</Text>
            </View>
          )}

          <TouchableOpacity 
            style={[estilos.btnManual, { marginBottom: 12 }]} 
            onPress={() => setModalCompra(true)}
          >
            <Text style={estilos.btnManualTexto}>✍️ Ingreso manual</Text>
          </TouchableOpacity>

          {facturas.map(f => (
            <View key={f.id} style={estilos.facturaItem}>
              <View style={{ flex: 1 }}>
                <Text style={estilos.factProv}>🏭 {f.proveedor}</Text>
                <Text style={estilos.factResumen} numberOfLines={1}>{f.resumen}</Text>
                <Text style={estilos.factValor}>{fmt(f.total)}</Text>
              </View>
              {esAdmin && (
                <TouchableOpacity style={estilos.btnEliminar} onPress={() => eliminarFactura(f.id)}>
                  <Text style={{ color: Colors.red, fontSize: 18, fontWeight: '800' }}>×</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
          <TotalBox label="Total compras:" valor={facturas.reduce((s, f) => s + f.total, 0)} color="blue" />
        </CardSection>

       <CardSection icono="📤" titulo="PASO 3 — Gastos del día" color="orange">
          {renderFilas('gastos', 'Para qué fue...', Colors.orange)}
        </CardSection>

        {/*<CardSection icono="👥" titulo="PASO 4 — Créditos (fiados)" color="blue">
          {renderFilas('creditos', 'Nombre cliente...', Colors.blue)}
        </CardSection> */}

        <CardSection 
          icono="💵" 
          titulo="PASO 3 — Pagos recibidos (efectivo)" 
          color="purple"
          expandible
          inicialmenteExpandido={false}
        >
          <View style={estilos.notaCont}>
            <Text style={estilos.notaTexto}>⚠️ Clientes que pagan deuda en EFECTIVO. Entra a caja pero NO es venta.</Text>
          </View>
          {renderFilas('pagos', 'Nombre cliente...', Colors.purple)}
        </CardSection>

        <CardSection 
          icono="📲" 
          titulo="PASO 4 — Transferencias" 
          color="teal"
          expandible
          inicialmenteExpandido={false}
        >
          <View style={estilos.notaContTeal}>
            <Text style={estilos.notaTextoTeal}>📲 Dinero que llega al celular/cuenta — NO entra a caja física.</Text>
          </View>
          
          <Text style={estilos.subSeccion}>VENTAS por transferencia:</Text>
          {renderFilas('transferenciaVentas', 'Cliente / producto...', Colors.teal)}

          <View style={{ height: 20 }} />
          <Text style={estilos.subSeccion}>PAGOS de deuda por transferencia:</Text>
          {renderFilas('transferenciaPagos', 'Nombre cliente...', Colors.teal)}
        </CardSection>

        <CardSection 
          icono="👤" 
          titulo="PASO 5 — Préstamos a empleados" 
          color="orange"
          expandible
          inicialmenteExpandido={false}
        >
          <View style={estilos.notaCont}>
            <Text style={estilos.notaTexto}>👤 Dinero prestado a empleados hoy. NO afecta la venta pero sale de caja.</Text>
          </View>
          <View style={estilos.inputGroup}>
            <Text style={estilos.inputLabel}>Valor del préstamo:</Text>
            <Text style={estilos.prefijo}>$</Text>
            <TextInput
              style={estilos.inputNumerico}
              placeholder="0"
              keyboardType="numeric"
              value={formatInput(prestamo)}
              onChangeText={(v) => setPrestamo(parseInput(v))}
              textAlign="right"
            />
          </View>
          <View style={estilos.inputGroup}>
            <Text style={estilos.inputLabel}>Nombre del empleado:</Text>
            <TextInput
              style={estilos.inputNotaRetiro}
              placeholder="Ej: Juan Pérez"
              value={notaPrestamo}
              onChangeText={setNotaPrestamo}
            />
          </View>
        </CardSection>

        <CardSection icono="🔒" titulo="PASO 6 — Plata al CERRAR" color="green">
          <View style={estilos.inputGroup}>
            <Text style={estilos.inputLabel}>Plata contada al cerrar:</Text>
            <Text style={estilos.prefijo}>$</Text>
            <TextInput 
              style={[estilos.inputNumerico, { borderColor: Colors.green, borderWidth: 3 }]} 
              value={formatInput(cierre)} 
              onChangeText={v => setCierre(parseInput(v))} 
              keyboardType="numeric" 
              textAlign="right" 
            />
          </View>
          {esAdmin && (
            <>
              <View style={estilos.inputGroup}>
                <Text style={estilos.inputLabel}>💼 Retiro del día (personal):</Text>
                <Text style={estilos.prefijo}>$</Text>
                <TextInput 
                  style={estilos.inputNumerico} 
                  value={formatInput(retiro)} 
                  onChangeText={v => setRetiro(parseInput(v))} 
                  keyboardType="numeric" 
                  textAlign="right" 
                />
              </View>
              <TextInput 
                style={estilos.inputNotaRetiro} 
                placeholder="Nota del retiro..." 
                value={notaRetiro} 
                onChangeText={v => useDiaStore.setState({ notaRetiro: v })} 
              />
              <Text style={estilos.ayudaTexto}>El retiro se resta de la plata en caja — solo visible para usted.</Text>
            </>
          )}
        </CardSection>

        {resultado && (
          <ResultadoDia 
            base={base} 
            cierre={cierre} 
            retiro={retiro} 
            ingreso={ingreso}
            prestamo={prestamo} 
            resultado={resultado} 
            esDuena={esAdmin} 
          />
        )}

        {esAdmin && (
          <View style={estilos.accionBtns}>
            <TouchableOpacity style={estilos.btnGuardar} onPress={handleGuardar}><Text style={estilos.btnGuardarTexto}>Guardar dia</Text></TouchableOpacity>
            <TouchableOpacity style={estilos.btnNuevo} onPress={handleNuevoDia}><Text style={estilos.btnNuevoTexto}>Nuevo dia</Text></TouchableOpacity>
          </View>
        )}
        <View style={{ height: 30 }} />
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  header: { paddingTop: 48, paddingBottom: 20, paddingHorizontal: 16, alignItems: 'center' },
  btnMenu: { position: 'absolute', top: 48, left: 14, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 8, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  btnPerfil: { position: 'absolute', top: 48, right: 14, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 8, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  btnPerfilIcon: { fontSize: 18 },
  headerTitulo: { color: Colors.white, fontSize: 18, fontWeight: '900', textAlign: 'center' },
  headerSub:    { color: 'rgba(255,255,255,0.82)', fontSize: 12, marginTop: 2 },
  rolBadge: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingVertical: 3, paddingHorizontal: 10, marginTop: 5 },
  rolTexto: { color: Colors.white, fontSize: 11, fontWeight: '800' },
  scroll:    { flex: 1, backgroundColor: Colors.bg },
  contenido: { padding: 12 },
  fechaRow: { backgroundColor: Colors.white, borderRadius: 12, padding: 11, marginBottom: 11, flexDirection: 'row', alignItems: 'center', gap: 10, elevation: 2 },
  fechaLabel:  { fontWeight: '800', fontSize: 13, color: Colors.gray },
  fechaSelect: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5, borderColor: Colors.border, borderRadius: 8, paddingVertical: 5, paddingHorizontal: 12, backgroundColor: Colors.grayLight },
  fechaTexto: { fontSize: 14, fontWeight: '700', color: Colors.blueDark },
  fechaHoyBtn: { backgroundColor: Colors.green, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 11 },
  fechaHoyTxt: { color: Colors.white, fontSize: 12, fontWeight: '900' },
  // Estilos Base Requeridos
  inputGroup: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 9 },
  inputLabel: { flex: 1, fontSize: 13, fontWeight: '700', color: Colors.gray },
  prefijo: { fontWeight: '900', fontSize: 15, color: '#94a3b8' },
  inputNumerico: { width: 145, borderWidth: 2, borderColor: Colors.border, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 11, fontSize: 16, fontWeight: '800', textAlign: 'right', color: Colors.dark, backgroundColor: Colors.grayLight },
  facturaItem: { flexDirection: 'row', gap: 9, backgroundColor: Colors.blueLight, borderWidth: 1.5, borderColor: '#bfdbfe', borderRadius: 12, padding: 10, marginBottom: 8, alignItems: 'flex-start' },
  btnEliminar: { backgroundColor: Colors.redLight, borderRadius: 8, width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  btnAgregar: { width: '100%', paddingVertical: 9, borderRadius: 10, borderWidth: 2, borderStyle: 'dashed', backgroundColor: 'transparent', alignItems: 'center', marginTop: 3 },
  btnAgregarTexto: { fontSize: 13, fontWeight: '800' },
  totalBox: { borderRadius: 11, padding: 11, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  inputNotaRetiro: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: 10, padding: 10, fontSize: 13, fontWeight: '700', color: Colors.dark, backgroundColor: Colors.grayLight, marginBottom: 8 },
  accionBtns: { flexDirection: 'row', gap: 8, marginBottom: 11 },
  btnGuardar: { flex: 1, backgroundColor: Colors.green, borderRadius: 13, padding: 13, alignItems: 'center', elevation: 3 },
  btnGuardarTexto: { color: Colors.white, fontSize: 14, fontWeight: '800' },
  btnNuevo: { flex: 1, backgroundColor: Colors.blue, borderRadius: 13, padding: 13, alignItems: 'center' },
  btnNuevoTexto: { color: Colors.white, fontSize: 14, fontWeight: '800' },
  modalFondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalCaja: { backgroundColor: Colors.white, borderRadius: 20, padding: 20, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
  modalTitulo: { fontSize: 15, fontWeight: '900', color: Colors.blueDark, marginBottom: 14 },
  modalLabel: { fontSize: 13, fontWeight: '700', color: Colors.gray, marginBottom: 5 },
  modalInput: { borderWidth: 2, borderColor: Colors.border, borderRadius: 10, padding: 10, fontSize: 14, fontWeight: '700', color: Colors.dark, backgroundColor: Colors.grayLight, marginBottom: 10 },
  modalBtnCancel: { flex: 1, padding: 11, borderRadius: 10, backgroundColor: Colors.grayLight, alignItems: 'center' },
  modalBtnOk: { flex: 2, padding: 11, borderRadius: 10, backgroundColor: Colors.blue, alignItems: 'center' },

  // Estilos del rediseño HTML v5
  fotoBtn: {
    backgroundColor: Colors.blue,
    borderRadius: 13,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 11,
    elevation: 4,
    shadowColor: Colors.blue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
  },
  fotoBtnTexto: { color: Colors.white, fontSize: 15, fontWeight: '800' },
  btnManual: {
    width: '100%',
    padding: 10,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  btnManualTexto: { color: Colors.gray, fontSize: 13, fontWeight: '800' },
  factProv: { fontSize: 13, fontWeight: '800', color: Colors.blueDark, marginBottom: 2 },
  factResumen: { fontSize: 11, color: '#475569', lineHeight: 14 },
  factValor: { fontSize: 17, fontWeight: '900', color: Colors.blue, marginTop: 4 },
  notaCont: { backgroundColor: Colors.purpleLight, padding: 10, borderRadius: 10, marginBottom: 12 },
  notaContTeal: { backgroundColor: Colors.tealLight, padding: 10, borderRadius: 10, marginBottom: 12 },
  notaTexto: { fontSize: 12, color: Colors.purple, fontWeight: '700', fontStyle: 'italic' },
  notaTextoTeal: { fontSize: 12, color: Colors.teal, fontWeight: '700', fontStyle: 'italic' },
  subSeccion: { fontSize: 12, fontWeight: '800', color: Colors.gray, marginBottom: 8, textTransform: 'uppercase' },
  ayudaTexto: { fontSize: 11, color: Colors.gray, fontWeight: '700', marginTop: 2, marginBottom: 10 },
});
