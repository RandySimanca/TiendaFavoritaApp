// ═══════════════════════════════════════════════════
// Ruta raíz — redirige al login automáticamente
// Expo Router necesita este archivo para la ruta "/"
// ═══════════════════════════════════════════════════

import { Redirect } from 'expo-router';

export default function RootIndex() {
  // Siempre parte desde el login; el _layout.tsx decide si va a las tabs
  return <Redirect href="/login" />;
}
