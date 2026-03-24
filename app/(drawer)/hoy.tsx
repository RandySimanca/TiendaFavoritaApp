import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  TextInput, Alert, KeyboardAvoidingView, Platform, 
  ActivityIndicator, Image 
} from 'react-native';
import { useNavigation } from 'expo-router';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { useDiaStore } from '../../store/diaStore';
import { useAuthStore } from '../../store/authStore';
import { useHistorialStore } from '../../store/historialStore';
import { Colors } from '../../constants/Colors';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { formatNum, parseNum } from '../../utils/format';

export default function HoyScreen() {
  const navigation = useNavigation<DrawerNavigationProp<any>>();
  const { 
    fecha, base, cierre, retiro, notaRetiro, ingreso, notaIngreso,
    compras, gastos, creditos, pagos, transferenciaVentas, transferenciaPagos,
    procesarFacturaIA, guardarLocal, limpiar, cargarDiaActual
  } = useDiaStore();
  
  const [cargandoIA, setCargandoIA] = useState(false);

  useEffect(() => {
    cargarDiaActual();
  }, []);

  const handleTomarFoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permiso denegado', 'Se necesita acceso a la cámara.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      base64: true,
      quality: 0.5,
    });

    if (!result.canceled && result.assets[0].base64) {
      setCargandoIA(true);
      try {
        const data = await procesarFacturaIA(result.assets[0].base64);
        Alert.alert('Factura procesada', `${data.proveedor}: ${formatNum(data.total)}`);
      } catch (err: any) {
        Alert.alert('Error IA', err.message);
      } finally {
        setCargandoIA(false);
      }
    }
  };

  const handleGuardar = async () => {
    try {
      await useHistorialStore.getState().guardarDia(useDiaStore.getState());
      Alert.alert('Éxito', 'Día guardado correctamente.');
    } catch (err) {
      Alert.alert('Error', 'No se pudo guardar el día.');
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header personalizado con botón de hamburguesa */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.openDrawer()}>
            <MaterialCommunityIcons name="menu" size={28} color={Colors.white} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle} adjustsFontSizeToFit numberOfLines={1}>
              TIENDA FAVORITA
            </Text>
            <Text style={styles.headerSubtitle}>{fecha}</Text>
          </View>
          <TouchableOpacity onPress={handleTomarFoto}>
            {cargandoIA ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <MaterialCommunityIcons name="camera-plus" size={28} color={Colors.white} />
            )}
          </TouchableOpacity>
        </View>

        {/* Sección de Caja */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💰 FLUJO DE CAJA</Text>
          <View style={styles.row}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Base Inicial</Text>
              <TextInput 
                style={styles.input} 
                value={formatNum(base)}
                onChangeText={(v) => useDiaStore.setState({ base: parseNum(v) })}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Cierre Efectivo</Text>
              <TextInput 
                style={styles.input} 
                value={formatNum(cierre)}
                onChangeText={(v) => useDiaStore.setState({ cierre: parseNum(v) })}
                keyboardType="numeric"
                placeholder="Caja actual"
              />
            </View>
          </View>
        </View>

        {/* Compras / Facturas */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🛒 COMPRAS (IA)</Text>
          <Text style={styles.totalLabel}>Total Compras: {formatNum(compras)}</Text>
          <TouchableOpacity style={styles.btnIA} onPress={handleTomarFoto}>
            <MaterialCommunityIcons name="robot" size={20} color={Colors.white} />
            <Text style={styles.btnIAText}>Escanear Ticket con IA</Text>
          </TouchableOpacity>
        </View>

        {/* Botón Guardar */}
        <TouchableOpacity style={styles.btnGuardar} onPress={handleGuardar}>
          <Text style={styles.btnGuardarText}>GUARDAR DÍA</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btnLimpiar} onPress={() => {
           Alert.alert('Limpiar', '¿Borrar todo lo de hoy?', [
             { text: 'No' },
             { text: 'Si, Limpiar', onPress: limpiar }
           ]);
        }}>
          <Text style={styles.btnLimpiarText}>Limpiar Formulario</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scroll: {
    paddingBottom: 40,
  },
  header: {
    backgroundColor: Colors.green,
    padding: 20,
    paddingTop: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleContainer: {
    flex: 1,
    paddingHorizontal: 15,
    alignItems: 'center',
  },
  headerTitle: {
    color: Colors.white,
    fontSize: 22,
    fontWeight: '900',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.gray,
    marginBottom: 15,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inputContainer: {
    width: '48%',
  },
  label: {
    fontSize: 13,
    color: '#666',
    marginBottom: 5,
  },
  input: {
    borderWidth: 2,
    borderColor: '#eee',
    borderRadius: 10,
    padding: 10,
    fontSize: 16,
    fontWeight: 'bold',
  },
  totalLabel: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.green,
    marginBottom: 10,
  },
  btnIA: {
    backgroundColor: Colors.green,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 12,
  },
  btnIAText: {
    color: Colors.white,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  btnGuardar: {
    backgroundColor: '#000',
    margin: 20,
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
  },
  btnGuardarText: {
    color: Colors.white,
    fontWeight: '900',
    fontSize: 18,
  },
  btnLimpiar: {
    alignItems: 'center',
  },
  btnLimpiarText: {
    color: 'red',
    fontWeight: 'bold',
  },
});
