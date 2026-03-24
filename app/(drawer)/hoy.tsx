import React, { useRef, useState, useEffect } from 'react';
import {
  ScrollView, View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView, Platform, Modal,
  ActivityIndicator, SafeAreaView
} from 'react-native';
import { useNavigation } from 'expo-router';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
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
import { PDFService }    from '../../utils/pdfService';

export default function HoyScreen() {
  const navigation = useNavigation<DrawerNavigationProp<any>>();
  const scrollRef = useRef<ScrollView>(null);
  const esAdmin = useAuthStore(s => s.esDuena());
  const rol = useAuthStore(s => s.rol);
  const perfil = useAuthStore(s => s.perfil);

  const {
    fecha, base, cierre, retiro, notaRetiro, ingreso, notaIngreso,
    facturas, gastos, creditos, pagos, transferenciaVentas, transferenciaPagos,
    setBase, setCierre, setRetiro, setIngreso, setFecha,
    agregarFactura, eliminarFactura, procesarFacturaIA,
    limpiar, cargarDiaActual
  } = useDiaStore();

  const [resultado, setResultado] = useState<any>(null);
  const [modalCompra, setModalCompra] = useState(false);
  const [compraProveedor, setCompraProveedor] = useState('');
  const [compraTotal, setCompraTotal] = useState('');
  const [guardandoStore, setGuardandoStore] = useState(false);
  const [perfilVisible, setPerfilVisible] = useState(false);

  useEffect(() => {
    cargarDiaActual();
  }, []);

  useEffect(() => {
    const res = calcularDia(useDiaStore.getState());
    setResultado(res);
  }, [base, cierre, retiro, ingreso, facturas, gastos, creditos, pagos, transferenciaVentas, transferenciaPagos]);

  const handleTomarFoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Error', 'Acceso a camara denegado.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      base64: true,
      quality: 0.5,
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
      await useHistorialStore.getState().guardarDia(useDiaStore.getState());
      Alert.alert('Guardado', 'El cuadre del dia se ha sincronizado correctamente.');
    } catch (err) {
      Alert.alert('Error', 'No se pudo guardar el historial.');
    }
  };

  const handleNuevoDia = () => {
    Alert.alert('Nuevo dia?', 'Se limpiara el formulario y se usara el cierre de hoy como base de manana.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Confirmar', onPress: () => limpiar(cierre) }
    ]);
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
      <Modal visible={modalCompra} transparent animationType="slide">
        <View style={estilos.modalFondo}>
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
          <Text style={estilos.fechaLabel}>Fecha:</Text>
          <TextInput
            style={estilos.fechaInput}
            value={fecha}
            onChangeText={v => setFecha(v)}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={Colors.gray}
            keyboardType="numeric"
            maxLength={10}
          />
          <TouchableOpacity style={estilos.fechaHoyBtn} onPress={() => setFecha(new Date().toISOString().slice(0, 10))}>
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
          )}
        </CardSection>

        <CardSection icono="🛒" titulo="PASO 2 — Compras del día" color="blue" badge={facturas.length}>
          <TouchableOpacity style={estilos.fotoBtn} onPress={handleTomarFoto} disabled={guardandoStore}>
            {guardandoStore ? (
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <ActivityIndicator color={Colors.white} size="small" />
                <Text style={estilos.fotoBtnTexto}>La IA está leyendo...</Text>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Text style={{ fontSize: 22 }}>📷</Text>
                <Text style={estilos.fotoBtnTexto}>Tomar foto de factura</Text>
              </View>
            )}
          </TouchableOpacity>

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

        <CardSection icono="👥" titulo="PASO 4 — Créditos (fiados)" color="blue">
          {renderFilas('creditos', 'Nombre cliente...', Colors.blue)}
        </CardSection>

        <CardSection icono="💵" titulo="PASO 5 — Pagos recibidos (efectivo)" color="purple">
          <View style={estilos.notaCont}>
            <Text style={estilos.notaTexto}>⚠️ Clientes que pagan deuda en EFECTIVO. Entra a caja pero NO es venta.</Text>
          </View>
          {renderFilas('pagos', 'Nombre cliente...', Colors.purple)}
        </CardSection>

        <CardSection icono="📲" titulo="PASO 6 — Transferencias" color="teal">
          <View style={estilos.notaContTeal}>
            <Text style={estilos.notaTextoTeal}>📲 Dinero que llega al celular/cuenta — NO entra a caja física.</Text>
          </View>
          
          <Text style={estilos.subSeccion}>VENTAS por transferencia:</Text>
          {renderFilas('transferenciaVentas', 'Cliente / producto...', Colors.teal)}

          <View style={{ height: 20 }} />

          <Text style={estilos.subSeccion}>PAGOS de deuda por transferencia:</Text>
          {renderFilas('transferenciaPagos', 'Nombre cliente...', Colors.teal)}
        </CardSection>

        <CardSection icono="🔒" titulo="PASO 7 — Plata al CERRAR" color="green">
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

        {resultado && <ResultadoDia base={base} cierre={cierre} retiro={retiro} resultado={resultado} esDuena={esAdmin} />}

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
  fechaRow: { backgroundColor: Colors.white, borderRadius: 12, padding: 11, marginBottom: 11, flexDirection: 'row', alignItems: 'center', gap: 8, elevation: 2 },
  fechaLabel:  { fontWeight: '800', fontSize: 13, color: Colors.gray },
  fechaInput: { flex: 1, fontSize: 14, fontWeight: '700', color: Colors.dark, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 8, paddingVertical: 5, paddingHorizontal: 9, backgroundColor: Colors.grayLight },
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
  modalFondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCaja: { backgroundColor: Colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
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
