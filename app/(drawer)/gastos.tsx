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
  { id: 'arriendo', nombre: 'Arriendo', icon: 'home-city' },
  { id: 'luz', nombre: 'Servicio de Luz', icon: 'lightning-bolt' },
  { id: 'agua', nombre: 'Servicio de Agua', icon: 'water' },
  { id: 'nomina', nombre: 'Nómina/Pagos', icon: 'account-cash' },
  { id: 'mantenimiento', nombre: 'Mantenimiento', icon: 'tools' },
  { id: 'otros', nombre: 'Otros Gastos', icon: 'dots-horizontal' },
];

export default function GastosScreen() {
  const navigation = useNavigation<DrawerNavigationProp<any>>();
  const { gastos, cargando, cargar, agregarGasto, eliminarGasto } = useGastosStore();
  
  const [mesFiltro, setMesFiltro] = useState(new Date().toISOString().slice(0, 7));
  const [modalVisible, setModalVisible] = useState(false);

  // Formulario
  const [concepto, setConcepto] = useState('');
  const [monto, setMonto] = useState('0');
  const [catSel, setCatSel] = useState(CATEGORIAS[0]);
  const [fuente, setFuente] = useState<'Caja' | 'Banco'>('Caja');

  useEffect(() => {
    cargar(mesFiltro);
  }, [mesFiltro]);

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
            <View>
              <Text style={styles.headerTitle}>Gastos Administrativos</Text>
              <Text style={styles.headerSubtitle}>Control de Gastos Operacionales</Text>
            </View>
          </View>
          
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Gastos ({mesFiltro})</Text>
            <Text style={styles.summaryValue}>{fmt(totalMes)}</Text>
          </View>
        </LinearGradient>

        {/* Selector de Mes y Botón Agregar */}
        <View style={styles.actionRow}>
          <View style={styles.mesPicker}>
            <MaterialCommunityIcons name="calendar-month" size={20} color={Colors.gray} />
            <Text style={styles.mesText}>{mesFiltro}</Text>
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
            
            <Text style={styles.inputLabel}>Concepto (ej: Pago de Energía)</Text>
            <TextInput 
              style={styles.input} 
              value={concepto} 
              onChangeText={setConcepto} 
              placeholder="Nombre del servicio o gasto" 
            />

            <Text style={styles.inputLabel}>Monto Pagado</Text>
            <TextInput 
              style={styles.input} 
              value={monto} 
              onChangeText={t => setMonto(formatInput(t))} 
              keyboardType="numeric" 
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
                <Text style={[styles.sourceBtnText, fuente === 'Banco' && styles.sourceBtnTextActive]}>Banco/Otros</Text>
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
  emptyText: { color: Colors.gray, marginTop: 10, fontWeight: '600' }
});

