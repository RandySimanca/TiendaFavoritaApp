// ═══════════════════════════════════════════════════
// CardSection — Tarjeta con encabezado de color y cuerpo blanco
// Equivalente a .card + .card-head del HTML original
// ═══════════════════════════════════════════════════

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Gradients } from '../../constants/Colors';

type ColorClave = keyof typeof Gradients;

interface Props {
  icono: string;
  titulo: string;
  color: ColorClave;
  badge?: string | number;
  children: React.ReactNode;
  expandible?: boolean;
  inicialmenteExpandido?: boolean;
}

export function CardSection({ 
  icono, titulo, color, badge, children, 
  expandible = false, inicialmenteExpandido = true 
}: Props) {
  const [abierto, setAbierto] = useState(expandible ? inicialmenteExpandido : true);
  const gradiente = Gradients[color] as [string, string];

  const toggle = () => {
    if (expandible) {
      setAbierto(!abierto);
    }
  };

  const Content = expandible ? TouchableOpacity : View;

  return (
    <View style={estilos.card}>
      {/* Encabezado con gradiente de color */}
      <Content activeOpacity={0.8} onPress={toggle}>
        <LinearGradient colors={gradiente} style={estilos.head} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          <Text style={estilos.icono}>{icono}</Text>
          <Text style={estilos.titulo}>{titulo}</Text>
          {badge !== undefined && (
            <View style={estilos.badge}>
              <Text style={estilos.badgeTexto}>{badge}</Text>
            </View>
          )}
          {expandible && (
            <MaterialCommunityIcons 
              name={abierto ? "chevron-up" : "chevron-down"} 
              size={20} 
              color={Colors.white} 
            />
          )}
        </LinearGradient>
      </Content>

      {/* Cuerpo blanco */}
      {abierto && <View style={estilos.body}>{children}</View>}
    </View>
  );
}

const estilos = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    marginBottom: 11,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
    overflow: 'hidden',
  },
  head: {
    paddingVertical: 11,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  icono: {
    fontSize: 19,
  },
  titulo: {
    flex: 1,
    fontSize: 14,
    fontWeight: '900',
    color: Colors.white,
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  badgeTexto: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: '800',
  },
  body: {
    padding: 13,
  },
});
