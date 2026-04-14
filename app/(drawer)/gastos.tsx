import React, { useEffect, useState } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  TextInput, Alert, ActivityIndicator, FlatList,
  KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from 'expo-router';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { useGastosStore } from '../../store/gastosStore';
import { fmt, parseInput, formatInput } from '../../utils/calcular';
import { Colors } from '../../constants/Colors';

const CATEGORIAS = [
  {/*{ id: 'arriendo', nombre: 'Arriendo', icon: 'home-city' },*/},
  { id: 'luz', nombre: 'Servicio de Luz', icon: 'lightning-bolt' },
  { id: 'agua', nombre: 'Servicio de Agua', icon: 'water' },
  { id: 'nomina', nombre: 'Nómina/Pagos', icon: 'account-cash' },
  { id: 'mantenimiento', nombre: 'Mantenimiento', icon: 'tools' },
  { id: 'otros', nombre: 'Otros Gastos', icon: 'dots-horizontal' },
];

const GASTOS_COMUNES = [
  { id: 'arr', nombre: 'Arriendo', cat: 'arriendo', icon: 'home-city', defaultMonto: '1000000' },
  { id: 'ene', nombre: 'Servicio de Energía', cat: 'luz', icon: 'lightning-bolt' },
  { id: 'agu', nombre: 'Servicio de Agua', cat: 'agua', icon: 'water' },
  { id: 'int', nombre: 'Servicio de Internet', cat: 'otros', icon: 'wifi' },
];

export default function GastosScreen() {
  const navigation = useNavigation<DrawerNavigationProp<any>>();
  const { gastos, gastosRecurrentes, cargando, cargar, cargarRecurrentes, guardarRecurrentes, agregarGasto, eliminarGasto } = useGastosStore();
  
  const [mesFiltro, setMesFiltro] = useState(new Date().toISOString().slice(0, 7));
  const [modalVisible, setModalVisible] = useState(false);
  const [configModalVisible, setConfigModalVisible] = useState(false);
  const [pendientesVisible, setPendientesVisible] = useState(false);

  // Formulario Normal
  const [concepto, setConcepto] = useState('');
  const [monto, setMonto] = useState('0');
  const [catSel, setCatSel] = useState(CATEGORIAS[0]);
  const [fuente, setFuente] = useState<'Caja' | 'Banco'>('Caja');

  // Formulario Recurrente 
  const [recConcepto, setRecConcepto] = useState('');
  const [recMonto, setRecMonto] = useState('0');
  const [recDia, setRecDia] = useState('1');

  // Evalua los gastos pendientes
  const gastosPendientes = gastosRecurrentes.filter(r => 
    r.activo && !gastos.some(g => g.concepto === r.concepto && g.mes === mesFiltro)
  );

  useEffect(() => {
    const init = async () => {
      await cargar(mesFiltro);
      await cargarRecurrentes();
    };
    init();
  }, [mesFiltro]);

  const cambiarMes = (k: number) => {
    // Usamos el día 15 para estar seguros y evitar problemas de huso horario al sumar/restar meses
    const d = new Date(`${mesFiltro}-15T12:00:00`);
    d.setMonth(d.getMonth() + k);
    setMesFiltro(d.toISOString().slice(0, 7));
  };

  const handleGuardar = async () => {
    const valor = parseInput(monto);
    if (!concepto || valor <= 0) {
      Alert.alert("Error", "Debes ingresar un concepto y un monto válido.");
      return;
    }

    await agregarGasto({
      id: Math.random().toString(36).substring(7),
      mes: mesFiltro,
      concepto,
      monto: valor,
      categoria: catSel.id,
      fuente: fuente
    });

    if (fuente === 'Caja') {
      const hoyStr = new Date().toISOString().slice(0, 10);
      const { useHistorialStore } = require('../../store/historialStore');
      const { useDiaStore } = require('../../store/diaStore');
      
      await useHistorialStore.getState().inyectarGastoOperacional({ 
        nombre: `[Admin] ${concepto}`, 
        valor: valor, 
        fechaStr: hoyStr 
      });
      
      // Si el usuario tiene el día de hoy abierto en la Store, lo recargamos para que se refleje de inmediato
      if (useDiaStore.getState().fecha === hoyStr) {
         useDiaStore.getState().cargarDiaActual(hoyStr);
      }
    }

    setConcepto('');
    setMonto('0');
    setModalVisible(false);
    Keyboard.dismiss();
    Alert.alert("Guardado", "Gasto administrativo registrado con éxito.");
  };

  const confirmarEliminar = (id: string) => {
    Alert.alert("Eliminar", "¿Estás seguro de eliminar este registro?", [
      { text: "No", style: "cancel" },
      { text: "Sí, eliminar", style: "destructive", onPress: () => eliminarGasto(id) }
    ]);
  };

  const totalMes = gastos.reduce((acc, g) => acc + g.monto, 0);

  // ── Lógica de Gastos Fijos (Recurrentes) ──
  const handleGuardarRecurrente = async () => {
    const valor = parseInput(recMonto);
    if (!recConcepto || valor <= 0) return Alert.alert("Error", "Concepto y monto obligatorios.");
    const diaNum = parseInt(recDia) || 1;
    if (diaNum < 1 || diaNum > 31) return Alert.alert("Error", "Día inválido");

    const nr: import('../../store/gastosStore').GastoRecurrente = {
      id: Math.random().toString(36).substring(7),
      concepto: recConcepto,
      monto: valor,
      categoria: 'arriendo', // Default por simplicidad
      fuente: fuente,
      dia: diaNum,
      activo: true
    };
    await guardarRecurrentes([...gastosRecurrentes, nr]);
    setRecConcepto('');
    setRecMonto('0');
  };

  const handleEliminarRecurrente = async (id: string) => {
    await guardarRecurrentes(gastosRecurrentes.filter(r => r.id !== id));
  };

  const handleAprobarPendiente = async (r: import('../../store/gastosStore').GastoRecurrente) => {
    const year = parseInt(mesFiltro.split('-')[0]);
    const month = parseInt(mesFiltro.split('-')[1]) - 1;
    const paymentDate = new Date(year, month, r.dia, 12, 0, 0);
    
    await agregarGasto({
      id: Math.random().toString(36).substring(7),
      mes: mesFiltro,
      concepto: r.concepto,
      monto: r.monto,
      categoria: r.categoria,
      fuente: r.fuente,
      timestamp: paymentDate.getTime()
    });

    if (r.fuente === 'Caja') {
      const { useHistorialStore } = require('../../store/historialStore');
      const { useDiaStore } = require('../../store/diaStore');
      const targetDateStr = paymentDate.toISOString().slice(0, 10);
      
      await useHistorialStore.getState().inyectarGastoOperacional({ 
        nombre: `[Admin] ${r.concepto}`, 
        valor: r.monto, 
        fechaStr: targetDateStr 
      });
      if (useDiaStore.getState().fecha === targetDateStr) {
         useDiaStore.getState().cargarDiaActual(targetDateStr);
      }
    }
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <View style={styles.container}>
        {/* Header */}
        <LinearGradient colors={['#1e293b', '#334155']} style={styles.header}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => navigation.openDrawer()}>
              <MaterialCommunityIcons name="menu" size={28} color={Colors.white} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Gastos Admon</Text>
              <Text style={styles.headerSubtitle}>Control Operacional</Text>
            </View>
            <TouchableOpacity onPress={() => setConfigModalVisible(true)} style={{ backgroundColor: 'rgba(255,255,255,0.15)', padding: 8, borderRadius: 10 }}>
              <MaterialCommunityIcons name="cog" size={24} color={Colors.white} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Gastos ({mesFiltro})</Text>
            <Text style={styles.summaryValue}>{fmt(totalMes)}</Text>
          </View>
        </LinearGradient>

        {gastosPendientes.length > 0 && !modalVisible && !configModalVisible && (
          <TouchableOpacity 
             style={{ margin: 16, marginBottom: 0, backgroundColor: '#fef3c7', padding: 15, borderRadius: 15, flexDirection: 'row', alignItems: 'center', elevation: 2 }}
             onPress={() => setPendientesVisible(true)}
          >
            <MaterialCommunityIcons name="alert-circle-outline" size={24} color="#d97706" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={{ fontWeight: '800', color: '#92400e', fontSize: 13 }}>Tienes {gastosPendientes.length} Gasto{gastosPendientes.length > 1 ? 's' : ''} Fijo{gastosPendientes.length > 1 ? 's' : ''} Pendiente{gastosPendientes.length > 1 ? 's' : ''}</Text>
              <Text style={{ color: '#b45309', fontSize: 12 }}>Toca aquí para revisar y aprobar.</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#d97706" />
          </TouchableOpacity>
        )}

        {/* Selector de Mes y Botón Agregar */}
        <View style={styles.actionRow}>
          <View style={styles.mesPicker}>
            <TouchableOpacity onPress={() => cambiarMes(-1)} style={{ padding: 5 }}>
              <MaterialCommunityIcons name="chevron-left" size={24} color={Colors.gray} />
            </TouchableOpacity>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 5 }}>
              <MaterialCommunityIcons name="calendar-month" size={18} color={Colors.gray} />
              <Text style={styles.mesText}>{mesFiltro}</Text>
            </View>

            <TouchableOpacity onPress={() => cambiarMes(1)} style={{ padding: 5 }}>
              <MaterialCommunityIcons name="chevron-right" size={24} color={Colors.gray} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.btnAdd} onPress={() => setModalVisible(!modalVisible)}>
            <MaterialCommunityIcons name={modalVisible ? "close" : "plus"} size={22} color={Colors.white} />
            <Text style={styles.btnAddText}>{modalVisible ? "Cerrar" : "Nuevo Gasto"}</Text>
          </TouchableOpacity>
        </View>

        {modalVisible ? (
          <ScrollView 
            style={styles.formCard} 
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 30 }}
          >
            <Text style={styles.formTitle}>Registrar Nuevo Pago</Text>
            
            <Text style={styles.inputLabel}>Gastos Frecuentes</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 5, marginBottom: 15 }}>
              {GASTOS_COMUNES.map(g => (
                <TouchableOpacity 
                  key={g.id} 
                  style={[styles.pillGasto, concepto === g.nombre && styles.pillGastoActivo]}
                  onPress={() => {
                    setConcepto(g.nombre);
                    setCatSel(CATEGORIAS.find(c => c.id === g.cat) || CATEGORIAS[0]);
                    if (g.defaultMonto) setMonto(formatInput(g.defaultMonto));
                  }}
                >
                  <MaterialCommunityIcons 
                    name={g.icon as any} 
                    size={16} 
                    color={concepto === g.nombre ? Colors.white : Colors.dark} 
                  />
                  <Text style={[styles.pillGastoTxt, concepto === g.nombre && { color: Colors.white }]}>
                    {g.nombre}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Concepto (ej: Pago de Energía)</Text>
            <TextInput 
              style={styles.input} 
              value={concepto} 
              onChangeText={setConcepto} 
              placeholder="Nombre del servicio o gasto" 
              placeholderTextColor="#94a3b8"
            />

            <Text style={styles.inputLabel}>Monto Pagado</Text>
            <TextInput 
              style={styles.input} 
              value={monto} 
              onChangeText={t => setMonto(formatInput(t))} 
              keyboardType="numeric" 
              placeholderTextColor="#94a3b8"
            />

            <Text style={styles.inputLabel}>Categoría</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
              {CATEGORIAS.map(cat => (
                <TouchableOpacity 
                  key={cat.id} 
                  style={[styles.catItem, catSel.id === cat.id && styles.catItemActive]}
                  onPress={() => setCatSel(cat)}
                >
                  <MaterialCommunityIcons 
                    name={cat.icon as any} 
                    size={20} 
                    color={catSel.id === cat.id ? Colors.white : Colors.gray} 
                  />
                  <Text style={[styles.catText, catSel.id === cat.id && styles.catTextActive]}>
                    {cat.nombre}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.inputLabel}>¿De dónde salió el dinero?</Text>
            <View style={styles.sourceRow}>
              <TouchableOpacity 
                style={[styles.sourceBtn, fuente === 'Caja' && styles.sourceBtnActive]} 
                onPress={() => setFuente('Caja')}
              >
                <MaterialCommunityIcons name="wallet-outline" size={20} color={fuente === 'Caja' ? Colors.white : Colors.dark} />
                <Text style={[styles.sourceBtnText, fuente === 'Caja' && styles.sourceBtnTextActive]}>Caja Hoy</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.sourceBtn, fuente === 'Banco' && styles.sourceBtnActive]} 
                onPress={() => setFuente('Banco')}
              >
                <MaterialCommunityIcons name="bank-outline" size={20} color={fuente === 'Banco' ? Colors.white : Colors.dark} />
                <Text style={[styles.sourceBtnText, fuente === 'Banco' && styles.sourceBtnTextActive]}>Fondo guardado / Banco</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.btnSave} onPress={handleGuardar}>
              <Text style={styles.btnSaveText}>Guardar Gasto</Text>
            </TouchableOpacity>
          </ScrollView>
        ) : (
          <FlatList
            data={gastos}
            keyExtractor={item => item.id}
            contentContainerStyle={{ padding: 16 }}
            ListEmptyComponent={
              <View style={styles.empty}>
                <MaterialCommunityIcons name="file-document-edit-outline" size={50} color={Colors.gray} />
                <Text style={styles.emptyText}>No hay gastos registrados en este mes</Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.gastoItem}>
                <View style={[styles.iconBox, { backgroundColor: '#f1f5f9' }]}>
                  <MaterialCommunityIcons 
                    name={(CATEGORIAS.find(c => c.id === item.categoria)?.icon || 'cash') as any} 
                    size={24} color="#475569" 
                  />
                </View>
                <View style={styles.gastoInfo}>
                  <Text style={styles.gastoConcepto}>{item.concepto}</Text>
                  <Text style={styles.gastoCat}>
                    {CATEGORIAS.find(c => c.id === item.categoria)?.nombre} • {item.fuente}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: 4 }}>
                    <Text style={{ fontSize: 11, color: '#64748b' }}>
                      📅 {new Date(item.timestamp).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    {gastosRecurrentes.some(r => r.concepto === item.concepto) && (
                      <Text style={{ fontSize: 10, color: 'green', fontWeight: '800' }}>
                        • 🔄 Fijo
                      </Text>
                    )}
                  </View>
                </View>
                <View style={styles.gastoRight}>
                  <Text style={styles.gastoMonto}>{fmt(item.monto)}</Text>
                  <TouchableOpacity onPress={() => confirmarEliminar(item.id)}>
                    <MaterialCommunityIcons name="trash-can-outline" size={20} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        )}
        
        {pendientesVisible && (
          <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
            <View style={{ backgroundColor: Colors.white, padding: 20, borderRadius: 20, maxHeight: '80%' }}>
              <Text style={{ fontSize: 18, fontWeight: '900', color: Colors.dark, marginBottom: 15 }}>Aprobar Gastos Fijos</Text>
              <ScrollView>
                {gastosPendientes.map(r => (
                  <View key={r.id} style={{ backgroundColor: '#f8fafc', padding: 15, borderRadius: 15, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' }}>
                    <Text style={{ fontSize: 16, fontWeight: '800' }}>{r.concepto}</Text>
                    <Text style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>📍 Se pagará el: Día {r.dia} del {mesFiltro}</Text>
                    <Text style={{ fontSize: 13, color: '#64748b' }}>🏦 Fuente: {r.fuente}</Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                      <Text style={{ fontSize: 16, fontWeight: '900', color: '#ef4444' }}>{fmt(r.monto)}</Text>
                      <TouchableOpacity onPress={() => handleAprobarPendiente(r)} style={{ backgroundColor: Colors.green, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10 }}>
                        <Text style={{ color: Colors.white, fontWeight: '800' }}>Aprobar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </ScrollView>
              <TouchableOpacity onPress={() => setPendientesVisible(false)} style={{ backgroundColor: Colors.gray, padding: 15, borderRadius: 12, marginTop: 10, alignItems: 'center' }}>
                <Text style={{ color: Colors.white, fontWeight: '900' }}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {configModalVisible && (
          <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
            <View style={{ backgroundColor: Colors.white, padding: 20, borderRadius: 20, maxHeight: '90%' }}>
              <Text style={{ fontSize: 18, fontWeight: '900', color: Colors.dark, marginBottom: 15 }}>Configurar Gastos Fijos</Text>
              <ScrollView>
                <Text style={styles.inputLabel}>Lista de Gastos Fijos Activos</Text>
                {gastosRecurrentes.map(r => (
                  <View key={r.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#e2e8f0' }}>
                    <View>
                      <Text style={{ fontWeight: '800' }}>{r.concepto}</Text>
                      <Text style={{ fontSize: 11, color: '#64748b' }}>Día {r.dia} • {r.fuente} • {fmt(r.monto)}</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleEliminarRecurrente(r.id)} style={{ alignSelf: 'center' }}>
                      <MaterialCommunityIcons name="trash-can-outline" size={20} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ))}

                <Text style={[styles.formTitle, { marginTop: 25, fontSize: 15 }]}>+ Agregar Gasto Fijo</Text>
                <TextInput style={styles.input} placeholder="Concepto (ej: Arriendo)" placeholderTextColor="#94a3b8" value={recConcepto} onChangeText={setRecConcepto} />
                <TextInput style={[styles.input, {marginTop: 10}]} placeholder="Monto" placeholderTextColor="#94a3b8" value={recMonto} onChangeText={t => setRecMonto(formatInput(t))} keyboardType="numeric" />
                <TextInput style={[styles.input, {marginTop: 10}]} placeholder="Día del mes (1 al 31)" placeholderTextColor="#94a3b8" value={recDia} onChangeText={setRecDia} keyboardType="numeric" />
                
                <Text style={styles.inputLabel}>¿De dónde sale este pago fijo?</Text>
                <View style={styles.sourceRow}>
                  <TouchableOpacity style={[styles.sourceBtn, fuente === 'Caja' && styles.sourceBtnActive]} onPress={() => setFuente('Caja')}>
                    <Text style={[styles.sourceBtnText, fuente === 'Caja' && styles.sourceBtnTextActive]}>Caja Diaria</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.sourceBtn, fuente === 'Banco' && styles.sourceBtnActive]} onPress={() => setFuente('Banco')}>
                    <Text style={[styles.sourceBtnText, fuente === 'Banco' && styles.sourceBtnTextActive]}>Fondo/Banco</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={[styles.btnSave, {marginTop:15}]} onPress={handleGuardarRecurrente}>
                  <Text style={styles.btnSaveText}>Añadir Gasto Fijo</Text>
                </TouchableOpacity>
              </ScrollView>
              <TouchableOpacity onPress={() => setConfigModalVisible(false)} style={{ backgroundColor: Colors.gray, padding: 15, borderRadius: 12, marginTop: 15, alignItems: 'center' }}>
                <Text style={{ color: Colors.white, fontWeight: '900' }}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 25, paddingTop: 60, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 20 },
  headerTitle: { color: Colors.white, fontSize: 22, fontWeight: '900' },
  headerSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  summaryCard: { backgroundColor: 'rgba(255,255,255,0.1)', padding: 15, borderRadius: 15, alignItems: 'center' },
  summaryLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  summaryValue: { color: Colors.white, fontSize: 28, fontWeight: '900' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, alignItems: 'center' },
  mesPicker: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.white, padding: 10, borderRadius: 10 },
  mesText: { fontSize: 15, fontWeight: '800', color: Colors.dark },
  btnAdd: { backgroundColor: '#3b82f6', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  btnAddText: { color: Colors.white, fontWeight: '800' },
  formCard: { backgroundColor: Colors.white, margin: 16, borderRadius: 20, padding: 20, elevation: 4 },
  formTitle: { fontSize: 18, fontWeight: '900', color: Colors.dark, marginBottom: 15 },
  inputLabel: { fontSize: 12, fontWeight: '700', color: Colors.gray, marginBottom: 6, marginTop: 10 },
  input: { backgroundColor: '#f1f5f9', padding: 12, borderRadius: 10, fontSize: 16, color: Colors.dark },
  catScroll: { marginVertical: 10 },
  catItem: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f1f5f9', marginRight: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  catItemActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  catText: { fontSize: 12, fontWeight: '700', color: Colors.gray },
  catTextActive: { color: Colors.white },
  sourceRow: { flexDirection: 'row', gap: 10, marginTop: 5 },
  sourceBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderRadius: 10, backgroundColor: '#f1f5f9' },
  sourceBtnActive: { backgroundColor: '#3b82f6' },
  sourceBtnText: { fontWeight: '800', fontSize: 13 },
  sourceBtnTextActive: { color: Colors.white },
  btnSave: { backgroundColor: Colors.green, padding: 15, borderRadius: 12, marginTop: 25, alignItems: 'center' },
  btnSaveText: { color: Colors.white, fontWeight: '900', fontSize: 16 },
  gastoItem: { backgroundColor: Colors.white, borderRadius: 15, padding: 15, flexDirection: 'row', alignItems: 'center', marginBottom: 12, elevation: 2 },
  iconBox: { width: 45, height: 45, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  gastoInfo: { flex: 1, marginLeft: 15 },
  gastoConcepto: { fontSize: 15, fontWeight: '800', color: Colors.dark },
  gastoCat: { fontSize: 12, color: Colors.gray, marginTop: 2 },
  gastoRight: { alignItems: 'flex-end', gap: 5 },
  gastoMonto: { fontSize: 16, fontWeight: '900', color: '#ef4444' },
  empty: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: Colors.gray, marginTop: 10, fontWeight: '600' },
  pillGasto: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', gap: 6 },
  pillGastoActivo: { backgroundColor: Colors.green, borderColor: Colors.green },
  pillGastoTxt: { fontSize: 13, fontWeight: '700', color: Colors.gray },
});

