import { Drawer } from 'expo-router/drawer';
import { useAuthStore } from '../../store/authStore';
import { Colors } from '../../constants/Colors';
import { View, Text, StyleSheet } from 'react-native';
import { DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { MaterialCommunityIcons } from '@expo/vector-icons';

function CustomDrawerContent(props: any) {
  return (
    <DrawerContentScrollView {...props} contentContainerStyle={{ backgroundColor: Colors.green }}>
      <View style={styles.drawerHeader}>
        <MaterialCommunityIcons name="store" size={40} color={Colors.white} />
        <Text style={styles.drawerTitle}>TIENDA FAVORITA</Text>
        <Text style={styles.drawerSubtitle}>Gestión de Negocio</Text>
      </View>
      <View style={styles.drawerItemsContainer}>
        <DrawerItemList {...props} />
      </View>
    </DrawerContentScrollView>
  );
}

export default function DrawerLayout() {
  const esAdmin = useAuthStore(s => s.esDuena());

  return (
    <Drawer
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        headerStyle: {
          backgroundColor: Colors.green,
        },
        headerTintColor: Colors.white,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        drawerActiveTintColor: Colors.green,
        drawerInactiveTintColor: Colors.gray,
        drawerLabelStyle: {
          marginLeft: -10,
          fontWeight: 'bold',
        },
      }}
    >
      <Drawer.Screen
        name="hoy"
        options={{
          drawerLabel: 'Hoy',
          title: '📝 Cuadre de Hoy',
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="calendar-today" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="historial"
        options={{
          drawerLabel: 'Historial',
          title: '📅 Historial',
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="history" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="precios"
        options={{
          drawerLabel: 'Precios',
          title: '💲 Lista de Precios',
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="currency-usd" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="promedio"
        options={{
          drawerLabel: 'Promedio Ventas',
          title: '📊 Promedio Diario',
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="trending-up" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="retiros"
        options={{
          drawerLabel: 'Retiros',
          title: '💼 Gestión de Retiros',
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-cash" size={size} color={color} />
          ),
          drawerItemStyle: esAdmin ? undefined : { display: 'none' },
        }}
      />
      <Drawer.Screen
        name="mensual"
        options={{
          drawerLabel: 'Resumen Mensual',
          title: '📊 Reportes Mensuales',
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="chart-areaspline" size={size} color={color} />
          ),
          drawerItemStyle: esAdmin ? undefined : { display: 'none' },
        }}
      />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  drawerHeader: {
    padding: 20,
    paddingTop: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerTitle: {
    color: Colors.white,
    fontSize: 20,
    fontWeight: '900',
    marginTop: 10,
  },
  drawerSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  drawerItemsContainer: {
    backgroundColor: Colors.white,
    flex: 1,
    paddingTop: 10,
  },
});
