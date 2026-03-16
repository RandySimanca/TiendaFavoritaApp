# Tienda Favorita App 🛒📱

Aplicación móvil desarrollada en **React Native (Expo)** para la gestión diaria de ingresos, ventas, gastos y control de inventario de una tienda de abarrotes. Construida con una arquitectura verdaderamente **Offline-First**, garantizando fluidez y resistencia a fallos de red, sincronizándose de forma transparente con **Supabase** en la nube.

## ✨ Características Principales

- **📱 Arquitectura 100% Offline-First**: Velocidad instantánea. La aplicación lee y escribe directamente en la base de datos local (SQLite) y sincroniza los cambios de forma silenciosa en segundo plano con la nube cuando hay conexión.
- **📊 Cuadre Diario Automático**: Cálculo automático de base, ventas (efectivo/transferencias), gastos, créditos y retiros para obtener el resultado limpio del día.
- **☁️ Sincronización en la Nube**: Backup automático y en tiempo real utilizando Supabase (Auth, Database y Edge Functions).
- **🤖 Inteligencia Artificial (Claude API)**: Análisis automatizado de facturas a partir de fotografías. La IA lee la imagen extrayendo proveedor y total de la compra sin digitación manual.
- **📄 Generación de Reportes PDF**: Exportación profesional de cierres diarios, resúmenes históricos e inventario general, listos para imprimir o compartir vía WhatsApp/Email.
- **👥 Roles y Permisos (RBAC)**: Accesos segregados entre "Trabajadores" (registro diario) y "Dueña/Administrador" (control total, retiros, vistas históricas y gestión de usuarios).
- **🚀 Actualizaciones OTA (Over-The-Air)**: Mejoras y parches enviados directamente a los dispositivos sin necesidad de generar nuevos APK ni pasar por las tiendas de aplicaciones (gracias a Expo EAS Update).

## 🛠️ Tecnologías Utilizadas

- **Frontend**: [React Native](https://reactnative.dev/) (con [Expo Router](https://docs.expo.dev/router/introduction/) para navegación basada en archivos).
- **Estado Global**: [Zustand](https://github.com/pmndrs/zustand) (stores separados para Autenticación, Día actual, Precios e Historial).
- **Almacenamiento Local**: [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/) (motor principal de la App) y `AsyncStorage` (para caché de sesión offline).
- **Backend & Base de Datos**: [Supabase](https://supabase.com/) (PostgreSQL, Authentication y Edge Functions en Deno).
- **Estilos**: Vanilla CSS / React Native StyleSheet con paleta de colores curada y neumorfismo moderno.
- **Generación de PDF**: [Expo Print](https://docs.expo.dev/versions/latest/sdk/print/) combinado con plantillas HTML a medida.
- **Despliegue y Distribución**: [EAS (Expo Application Services)](https://expo.dev/eas).

## 🚀 Instalación y Desarrollo Local

### 1. Prerrequisitos
- Node.js (v18 o superior recomendado).
- Cuenta activa en Supabase.
- Dispositivo físico con Expo Go o emuladores de Android/iOS configurados.

### 2. Clonar el repositorio y dependencias
```bash
git clone https://github.com/RandySimanca/TiendaFavoritaApp.git
cd TiendaFavoritaApp
npm install
```

### 3. Configuración del Entorno (Variables)
Crea un archivo `.env` en la raíz del proyecto para vincular tu backend de Supabase:
```env
EXPO_PUBLIC_SUPABASE_URL=tu_url_de_supabase_aqui
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu_llave_anon_de_supabase_aqui
```

### 4. Configuración del Backend (Supabase)
Dentro del panel de Supabase:
1.  **Auth**: Configura habilitado el inicio de sesión por Email/Pass.
2.  **SQL Editor**: Crea las tablas correspondientes (`perfiles`, `precios`, `historial`, `retiros`, `borradores`).
3.  **Functions**: Despliega las Edge Functions de IA (`procesar-factura` usando tu API Key de Anthropic/Claude) y la función administrativa (`gestionar-usuarios`).

### 5. Iniciar la aplicación
```bash
# Iniciar servidor de desarrollo de Metro
npm start
# O levantar directamente para un SO específico:
npm run android
npm run ios
```

## 📦 Construcción y Despliegue (Production)

### Construir un archivo instalable (APK para Android)
```bash
npx eas build -p android --profile preview
```

### Lanzar actualizaciones al aire (OTA)
Realiza cambios en tu código y ejecútalo directo a celulares de producción:
```bash
npm run deploy -- --message "Breve descripción de este cambio"
```

## 🔐 Estructura de Proyecto

- `/app`: Rutas del frontend de la app y Layouts (basado en Expo Router).
  - `/(tabs)`: Pantallas internas (Hoy, Precios, Historial, Retiros).
  - `/login.tsx`: Puerta de entrada.
- `/components/ui`: Componentes visuales reutilizables (Cards, Botones, Filas, Modales).
- `/constants`: Tokens de diseño (Colores, Tipografías, Tema).
- `/store`: Lógica de negocio 100% Offline-First (Zustand).
- `/utils`: Servicios compartidos (cálculos matemáticos, PDF Service, SQLite Base, Config de Supabase).
- `/assets`: Imágenes estáticas y logo de la tienda.

---
*Desarrollado para Tienda Favorita.*
