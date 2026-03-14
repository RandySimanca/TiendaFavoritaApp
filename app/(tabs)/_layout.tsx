// ═══════════════════════════════════════════════════
// Layout de las tabs de navegación
// Las 4 pestañas: Hoy, Historial, Precios, Retiros
// La pestaña Retiros solo aparece para el administrador (admin)
// ═══════════════════════════════════════════════════

import { Tabs } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { Colors } from '../../constants/Colors';

export default function TabsLayout() {
  const esAdmin = useAuthStore(s => s.esDuena());

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.green,
        tabBarInactiveTintColor: Colors.gray,
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopColor: Colors.border,
          borderTopWidth: 2,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '800',
        },
      }}
    >
      {/* Pestaña principal: cuadre del día */}
      <Tabs.Screen
        name="hoy"
        options={{
          title: '📝 Hoy',
          tabBarLabel: 'Hoy',
        }}
      />

      {/* Historial de días guardados */}
      <Tabs.Screen
        name="historial"
        options={{
          title: '📅 Historial',
          tabBarLabel: 'Historial',
        }}
      />

      {/* Lista de precios de productos */}
      <Tabs.Screen
        name="precios"
        options={{
          title: '💲 Precios',
          tabBarLabel: 'Precios',
        }}
      />

      {/* Retiros — solo visible para el admin */}
      <Tabs.Screen
        name="retiros"
        options={{
          title: '💼 Retiros',
          tabBarLabel: 'Retiros',
          // Se oculta del menú si es trabajador, pero la ruta sigue protegida internamente
          tabBarItemStyle: esAdmin ? undefined : { display: 'none' },
        }}
      />
    </Tabs>
  );
}
