// ═══════════════════════════════════════════════════
// ItemRow — Fila con descripción + valor + botón eliminar
// Equivalente a .item-row del HTML original
// ═══════════════════════════════════════════════════

import React from 'react';
import { View, TextInput, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../../constants/Colors';

interface Props {
  nombre: string;
  valor: number | string;
  placeholderNombre: string;
  mostrarEliminar: boolean;
  onChangeNombre: (v: string) => void;
  onChangeValor: (v: string) => void;
  onEliminar: () => void;
}

export function ItemRow({ nombre, valor, placeholderNombre, mostrarEliminar, onChangeNombre, onChangeValor, onEliminar }: Props) {
  return (
    <View style={estilos.fila}>
      {/* Campo de texto: descripción o nombre del cliente */}
      <TextInput
        style={estilos.inputTexto}
        value={nombre}
        onChangeText={onChangeNombre}
        placeholder={placeholderNombre}
        placeholderTextColor={Colors.gray}
      />

      {/* Campo numérico: valor en pesos */}
      <TextInput
        style={estilos.inputNumero}
        value={valor === 0 ? '' : String(valor)}
        onChangeText={onChangeValor}
        keyboardType="numeric"
        placeholder="0"
        placeholderTextColor={Colors.gray}
        textAlign="right"
      />

      {/* Botón eliminar (oculto en modo trabajador) */}
      {mostrarEliminar ? (
        <TouchableOpacity style={estilos.btnEliminar} onPress={onEliminar}>
          <Text style={estilos.btnEliminarTexto}>×</Text>
        </TouchableOpacity>
      ) : (
        <View style={estilos.btnEliminarFantasma} /> // Espacio para mantener el layout
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    gap: 7,
    marginBottom: 7,
    alignItems: 'center',
  },
  inputTexto: {
    flex: 1,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 9,
    paddingVertical: 9,
    paddingHorizontal: 10,
    fontSize: 13,
    fontWeight: '600',
    backgroundColor: Colors.grayLight,
    color: Colors.dark,
  },
  inputNumero: {
    width: 118,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 9,
    paddingVertical: 9,
    paddingHorizontal: 9,
    fontSize: 14,
    fontWeight: '800',
    backgroundColor: Colors.grayLight,
    color: Colors.dark,
  },
  btnEliminar: {
    backgroundColor: Colors.redLight,
    borderRadius: 8,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnEliminarTexto: {
    color: Colors.red,
    fontSize: 18,
    fontWeight: '800',
  },
  btnEliminarFantasma: {
    width: 30,
  },
});
