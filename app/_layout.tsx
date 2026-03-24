// ═══════════════════════════════════════════════════
// Layout raíz de la app — carga la sesión al arrancar
// Gestiona la protección de rutas según el rol activo
// ═══════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../store/authStore';
import { useHistorialStore } from '../store/historialStore';
import { usePreciosStore } from '../store/preciosStore';
import { useDiaStore } from '../store/diaStore';
import { inicializarDB } from '../utils/database';
import * as Updates from 'expo-updates';
import { Alert } from 'react-native';

export default function RootLayout() {
  const [dbListo, setDbListo] = useState(false);
  // Seleccionamos solo los valores necesarios para evitar re-renders innecesarios
  const rol      = useAuthStore(s => s.rol);
  const cargando = useAuthStore(s => s.cargando);
  const recuperarSesion = useAuthStore(s => s.recuperarSesion);
  const cargarHistorial = useHistorialStore(s => s.cargar);
  const cargarPrecios   = usePreciosStore(s => s.cargar);
  const cargarDia       = useDiaStore(s => s.cargarDiaActual);
  const router = useRouter();
  const segments = useSegments();
  
  const { isUpdatePending } = Updates.useUpdates();

  // Escuchar por actualizaciones descargadas
  useEffect(() => {
    if (isUpdatePending) {
      Alert.alert(
        "🚀 Nueva mejora disponible",
        "Hemos descargado una actualización con nuevas funciones y mejoras. ¿Quieres reiniciar la app ahora para aplicarlas?",
        [
          { text: "Más tarde", style: "cancel" },
          { 
            text: "Actualizar ahora", 
            onPress: () => Updates.reloadAsync() 
          }
        ]
      );
    }
  }, [isUpdatePending]);

  // Al iniciar la app, inicializar DB y recuperar sesión
  useEffect(() => {
    async function init() {
      await inicializarDB();
      setDbListo(true);
      await recuperarSesion();
    }
    init();
  }, []);

  // Cargar datos en cuanto haya sesión activa y DB lista
  useEffect(() => {
    if (rol && dbListo) {
      cargarHistorial();
      cargarPrecios();
      cargarDia();

      // Suscripciones Realtime (Cloud Sync)
      usePreciosStore.getState().suscribirCambios();
      useHistorialStore.getState().suscribirCambios();
      useDiaStore.getState().suscribirCambios();
    }
  }, [rol, dbListo]);

  // Redirigir según sesión — reacciona a cambios de rol o estado de carga
  useEffect(() => {
    if (cargando || !dbListo) return;

    const enTabs = segments[0] === '(tabs)';
    const enLogin = segments[0] === 'login';

    if (rol && enLogin) {
      // Tiene sesión pero está en login -> ir a hoy
      router.replace('/(drawer)/hoy');
    } else if (!rol && enTabs) {
      // No tiene sesión pero está dentro de la app -> ir a login
      // Usamos un pequeño delay para evitar conflictos de renderizado en Android
      const timer = setTimeout(() => {
        router.replace('/login');
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [rol, cargando, dbListo, segments]);

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="(drawer)" />
      </Stack>
    </>
  );
}
