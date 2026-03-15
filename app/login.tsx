// ═══════════════════════════════════════════════════
// Pantalla de Login — primera pantalla de la app (Supabase Auth)
// ═══════════════════════════════════════════════════

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
  ActivityIndicator, Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { Colors } from '../constants/Colors';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const { login, cargando } = useAuthStore();
  const router = useRouter();

  async function handleLogin() {
    if (!email || !password) {
      setErrorMsg('Por favor completa todos los campos');
      return;
    }

    setErrorMsg(null);
    const { error } = await login(email, password);
    
    if (!error) {
      // Dejamos que el _layout.tsx maneje la redirección al cambiar el estado de 'rol'
    } else {
      setErrorMsg(error);
      setTimeout(() => setErrorMsg(null), 5000);
    }
  }

  return (
    <LinearGradient
      colors={['#14532d', '#16a34a', '#22c55e']}
      style={estilos.fondo}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.5, y: 1 }}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={estilos.scroll} keyboardShouldPersistTaps="handled">

          {/* Logo y título */}
          <Text style={estilos.logo}>🏪</Text>
          <Text style={estilos.titulo}>Tienda Favorita</Text>
          <Text style={estilos.subtitulo}>Control Diario de Ventas</Text>

          {/* Caja de login con efecto vidrio */}
          <View style={estilos.caja}>
            
            <Text style={estilos.etiqueta}>📧 Correo Electrónico</Text>
            <TextInput
              style={estilos.input}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="ejemplo@correo.com"
              placeholderTextColor="rgba(255,255,255,0.5)"
            />

            <Text style={estilos.etiqueta}>🔐 Contraseña</Text>
            <TextInput
              style={estilos.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Tu contraseña..."
              placeholderTextColor="rgba(255,255,255,0.5)"
              onSubmitEditing={handleLogin}
            />

            {/* Mensaje de error */}
            {errorMsg && (
              <View style={estilos.errorContenedor}>
                <Text style={estilos.errorTexto}>❌ {errorMsg}</Text>
              </View>
            )}

            <TouchableOpacity 
              style={[estilos.btnEntrar, cargando && { opacity: 0.7 }]} 
              onPress={handleLogin} 
              disabled={cargando}
              activeOpacity={0.85}
            >
              {cargando ? (
                <ActivityIndicator color={Colors.greenDark} />
              ) : (
                <Text style={estilos.btnEntrarTexto}>✅ Entrar</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={estilos.btnAyuda} 
              onPress={() => Alert.alert('Ayuda', 'Contacta al Administrador para obtener tus credenciales.')}
            >
              <Text style={estilos.btnAyudaTexto}>¿No tienes cuenta?</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const estilos = StyleSheet.create({
  fondo: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    paddingBottom: 50,
  },
  logo: {
    fontSize: 52,
    marginBottom: 10,
  },
  titulo: {
    color: Colors.white,
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitulo: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    marginBottom: 32,
  },
  caja: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
  },
  etiqueta: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 7,
  },
  input: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 12,
    padding: 13,
    fontSize: 15,
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: Colors.white,
    marginBottom: 20,
  },
  errorContenedor: {
    backgroundColor: 'rgba(252, 165, 165, 0.2)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  errorTexto: {
    color: '#fee2e2',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  btnEntrar: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  btnEntrarTexto: {
    color: Colors.greenDark,
    fontSize: 16,
    fontWeight: '900',
  },
  btnAyuda: {
    marginTop: 20,
    alignItems: 'center',
  },
  btnAyudaTexto: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    textDecorationLine: 'underline',
  }
});
