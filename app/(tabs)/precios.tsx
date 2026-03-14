// ═══════════════════════════════════════════════════
// Pantalla Precios — lista de productos de la tienda
// Equipamiento para la gestión de inventario y costos
// El Admin puede agregar, editar y eliminar productos
// ═══════════════════════════════════════════════════

import React, { useState } from 'react';
import {
  ScrollView, View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { usePreciosStore } from '../../store/preciosStore';
import { useAuthStore } from '../../store/authStore';
import { fmt } from '../../utils/calcular';
import { Colors } from '../../constants/Colors';
import { PDFService } from '../../utils/pdfService';
import { Precio } from '../../store/preciosStore';

// Precio en blanco para el formulario de nuevo producto
const PRECIO_VACIO: Precio = { nombre: '', proveedor: '', compra: 0, venta: 0, unidad: '' };

export default function PreciosScreen() {
  const { precios, agregar, editar, eliminar } = usePreciosStore();
  const esAdmin = useAuthStore(s => s.esDuena());

  const [busqueda,    setBusqueda]    = useState('');
  const [modalVisible, setModal]     = useState(false);
  const [editIdx,     setEditIdx]     = useState<number>(-1); // -1 = nuevo producto
  const [form,        setForm]        = useState<Precio>(PRECIO_VACIO);

  // Filtra la lista según el texto de búsqueda
  const listaFiltrada = busqueda
    ? precios.filter(p =>
        p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.proveedor.toLowerCase().includes(busqueda.toLowerCase())
      )
    : precios;

  // Agrupa los productos por proveedor
  const grupos: Record<string, { precio: Precio; idxReal: number }[]> = {};
  listaFiltrada.forEach(p => {
    const idxReal = precios.indexOf(p);
    if (!grupos[p.proveedor]) grupos[p.proveedor] = [];
    grupos[p.proveedor].push({ precio: p, idxReal });
  });

  // Abre el formulario para agregar o editar
  function abrirFormulario(idx = -1) {
    if (idx >= 0) {
      setForm({ ...precios[idx] });
      setEditIdx(idx);
    } else {
      setForm(PRECIO_VACIO);
      setEditIdx(-1);
    }
    setModal(true);
  }

  // Guarda el producto nuevo o editado
  async function guardar() {
    if (!form.nombre.trim()) {
      Alert.alert('Falta el nombre', 'Escribe el nombre del producto.');
      return;
    }
    const prod: Precio = {
      nombre:    form.nombre.trim(),
      proveedor: form.proveedor.trim() || 'Sin proveedor',
      compra:    form.compra,
      venta:     form.venta,
      unidad:    form.unidad.trim() || 'und',
    };
    if (editIdx >= 0) await editar(editIdx, prod);
    else              await agregar(prod);
    
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    
    setModal(false);
  }

  // Confirma y elimina un producto
  function handleEliminar(idx: number) {
    Alert.alert('¿Eliminar producto?', precios[idx].nombre, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => eliminar(idx) },
    ]);
  }

  // Calcula sugerencias de precio de venta al ingresar el precio de compra
  const prev20 = Math.round(form.compra * 1.20);
  const prev25 = Math.round(form.compra * 1.25);
  const prev30 = Math.round(form.compra * 1.30);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.white }} edges={['top']}>
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">

        {/* Encabezado */}
        <View style={estilos.encHead}>
          <Text style={estilos.encTitulo}>💲 Lista de Precios</Text>
          <TouchableOpacity 
            style={estilos.btnExportar} 
            onPress={() => PDFService.reporteInventario(precios)}
          >
            <Text style={{ fontSize: 18 }}>📄</Text>
          </TouchableOpacity>
        </View>

        {/* Buscador */}
        <TextInput
          style={estilos.buscador}
          value={busqueda}
          onChangeText={setBusqueda}
          placeholder="🔍 Buscar producto..."
          placeholderTextColor={Colors.gray}
        />

        {/* Botón agregar (solo admin) */}
        {esAdmin && (
          <TouchableOpacity
            style={estilos.btnAgregar}
            onPress={() => abrirFormulario(-1)}
          >
            <Text style={estilos.btnAgregarTexto}>+ Agregar producto</Text>
          </TouchableOpacity>
        )}

        {/* Lista agrupada por proveedor */}
        {Object.entries(grupos).map(([prov, prods]) => (
          <View key={prov}>
            <Text style={estilos.grupoProv}>{prov}</Text>
            {prods.map(({ precio: p, idxReal }) => {
              const ganancia = p.venta - p.compra;
              const margen = p.compra > 0 ? Math.round((ganancia / p.compra) * 100) : 0;
              return (
                <View key={idxReal} style={estilos.prodItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={estilos.prodNombre}>{p.nombre}</Text>
                    <Text style={estilos.prodDetalle}>
                      Compra: {fmt(p.compra)} / {p.unidad || 'und'}
                      {'  ·  '}
                      <Text style={{ color: Colors.greenDark }}>+{margen}%</Text>
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', marginLeft: 12 }}>
                    <Text style={estilos.prodVenta}>{fmt(p.venta)}</Text>
                    <Text style={estilos.prodVentaLabel}>precio venta</Text>
                  </View>
                  {/* Botones editar/eliminar solo para el admin */}
                  {esAdmin && (
                    <View style={{ gap: 4, marginLeft: 10 }}>
                      <TouchableOpacity style={estilos.btnEdit} onPress={() => abrirFormulario(idxReal)}>
                        <Text style={{ fontSize: 11 }}>✏️</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={estilos.btnDel} onPress={() => handleEliminar(idxReal)}>
                        <Text style={{ color: Colors.red, fontSize: 14, fontWeight: '800' }}>×</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ))}

        {/* Mensaje si la búsqueda no da resultados */}
        {listaFiltrada.length === 0 && (
          <View style={estilos.vacio}>
            <Text style={{ fontSize: 36 }}>🔍</Text>
            <Text style={{ color: Colors.gray, fontSize: 14, fontWeight: '700', marginTop: 8 }}>
              No se encontró "{busqueda}"
            </Text>
          </View>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Modal para agregar o editar producto */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={estilos.modalFondo}>
            <View style={estilos.modalCaja}>
              <Text style={estilos.modalTitulo}>
                {editIdx >= 0 ? '✏️ Editar producto' : '➕ Nuevo producto'}
              </Text>

              {/* Nombre */}
              <Text style={estilos.formLabel}>Nombre del producto:</Text>
              <TextInput style={estilos.formInput} value={form.nombre} onChangeText={v => setForm({ ...form, nombre: v })} placeholder="Ej: Axion x450..." placeholderTextColor={Colors.gray} />

              {/* Proveedor */}
              <Text style={estilos.formLabel}>Proveedor:</Text>
              <TextInput style={estilos.formInput} value={form.proveedor} onChangeText={v => setForm({ ...form, proveedor: v })} placeholder="Ej: Wilian Ocampo..." placeholderTextColor={Colors.gray} />

              {/* Precio de compra */}
              <Text style={estilos.formLabel}>Precio de compra ($):</Text>
              <TextInput
                style={estilos.formInput}
                value={form.compra === 0 ? '' : String(form.compra)}
                onChangeText={v => setForm({ ...form, compra: parseFloat(v) || 0 })}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={Colors.gray}
              />

              {/* Sugerencias de precio de venta */}
              <View style={estilos.sugerencias}>
                <View style={estilos.sugItem}><Text style={estilos.sugLabel}>+20%</Text><Text style={estilos.sugValor}>{fmt(prev20)}</Text></View>
                <View style={estilos.sugItem}><Text style={estilos.sugLabel}>+25%</Text><Text style={[estilos.sugValor, { color: Colors.greenDark }]}>{fmt(prev25)}</Text></View>
                <View style={estilos.sugItem}><Text style={estilos.sugLabel}>+30%</Text><Text style={[estilos.sugValor, { color: Colors.orange }]}>{fmt(prev30)}</Text></View>
              </View>

              {/* Precio de venta */}
              <Text style={estilos.formLabel}>Precio de venta ($):</Text>
              <TextInput
                style={estilos.formInput}
                value={form.venta === 0 ? '' : String(form.venta)}
                onChangeText={v => setForm({ ...form, venta: parseFloat(v) || 0 })}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={Colors.gray}
              />

              {/* Unidad */}
              <Text style={estilos.formLabel}>Unidad (und, kg, botella...):</Text>
              <TextInput style={estilos.formInput} value={form.unidad} onChangeText={v => setForm({ ...form, unidad: v })} placeholder="Ej: und, kg, botella..." placeholderTextColor={Colors.gray} />

              {/* Botones del formulario */}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <TouchableOpacity style={estilos.btnCancelar} onPress={() => setModal(false)}>
                  <Text style={{ fontWeight: '800', fontSize: 14, color: Colors.dark }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={estilos.btnGuardar} onPress={guardar}>
                  <Text style={{ fontWeight: '900', fontSize: 14, color: Colors.white }}>💾 Guardar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  contenido: { padding: 12, paddingTop: 50 },
  encHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  encTitulo: { fontSize: 16, fontWeight: '900', color: Colors.dark },
  buscador: {
    width: '100%', padding: 12, borderRadius: 12,
    borderWidth: 2, borderColor: Colors.border,
    fontSize: 15, fontWeight: '700', color: Colors.dark,
    backgroundColor: Colors.white, marginBottom: 12,
  },
  btnAgregar: {
    borderWidth: 2, borderColor: Colors.green, borderStyle: 'dashed',
    borderRadius: 12, padding: 13, alignItems: 'center', marginBottom: 12,
  },
  btnAgregarTexto: { color: Colors.green, fontSize: 14, fontWeight: '800' },

  // Grupo de proveedor
  grupoProv: {
    fontSize: 11, fontWeight: '900', color: Colors.gray,
    textTransform: 'uppercase', letterSpacing: 0.5, paddingVertical: 8,
  },
  prodItem: {
    backgroundColor: Colors.white, borderRadius: 12, marginBottom: 8,
    padding: 12, flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 1,
  },
  prodNombre:     { fontSize: 14, fontWeight: '900', color: Colors.dark },
  prodDetalle:    { fontSize: 11, color: Colors.gray, fontWeight: '700', marginTop: 2 },
  prodVenta:      { fontSize: 20, fontWeight: '900', color: Colors.greenDark },
  prodVentaLabel: { fontSize: 10, color: Colors.gray, fontWeight: '700' },
  btnEdit: { backgroundColor: Colors.blueLight, borderRadius: 8, padding: 6, alignItems: 'center' },
  btnDel:  { backgroundColor: Colors.redLight, borderRadius: 8, padding: 6, alignItems: 'center' },

  // Lista vacía
  vacio: { alignItems: 'center', padding: 40 },

  // Modal
  modalFondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCaja: {
    backgroundColor: Colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, maxHeight: '90%',
  },
  modalTitulo: { fontSize: 15, fontWeight: '900', color: Colors.greenDark, marginBottom: 14 },
  formLabel:   { fontSize: 13, fontWeight: '700', color: Colors.gray, marginBottom: 5 },
  formInput: {
    borderWidth: 2, borderColor: Colors.border, borderRadius: 10,
    padding: 10, fontSize: 14, fontWeight: '700', color: Colors.dark,
    backgroundColor: Colors.grayLight, marginBottom: 10,
  },
  sugerencias: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  sugItem: { flex: 1, backgroundColor: Colors.white, borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 2, borderColor: Colors.border },
  sugLabel:    { fontSize: 10, fontWeight: '800', color: Colors.gray },
  sugValor:    { fontSize: 15, fontWeight: '900', color: Colors.blueDark },
  btnCancelar: { flex: 1, padding: 11, borderRadius: 10, backgroundColor: Colors.grayLight, alignItems: 'center' },
  btnGuardar:  { flex: 2, padding: 11, borderRadius: 10, backgroundColor: Colors.green, alignItems: 'center' },
  btnExportar: {
    backgroundColor: Colors.white,
    padding: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
});
