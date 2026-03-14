import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, Modal, TouchableOpacity, 
  TextInput, Alert, ActivityIndicator, ScrollView 
} from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { Colors } from '../../constants/Colors';

interface PerfilModalProps {
  visible: boolean;
  onClose: () => void;
}

export const PerfilModal: React.FC<PerfilModalProps> = ({ visible, onClose }) => {
  const { user, rol, perfil, cerrarSesion, actualizarPassword, crearTrabajador, esDuena: esAdmin } = useAuthStore();
  
  const [modo, setModo] = useState<'info' | 'password' | 'admin'>('info');
  
  // Estados para cambio de password
  const [nuevaPass, setNuevaPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [cargando, setCargando] = useState(false);

  // Estados para creación de trabajador
  const [tEmail, setTEmail] = useState('');
  const [tPass, setTPass] = useState('');
  const [tNombre, setTNombre] = useState('');

  const handleCambiarPass = async () => {
    if (nuevaPass.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (nuevaPass !== confirmPass) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    setCargando(true);
    const { error } = await actualizarPassword(nuevaPass);
    setCargando(false);
    
    if (error) {
      Alert.alert('Error', error);
    } else {
      Alert.alert('Éxito', 'Contraseña actualizada correctamente');
      setModo('info');
      setNuevaPass('');
      setConfirmPass('');
    }
  };

  const handleCrearTrabajador = async () => {
    if (!tEmail || !tPass || !tNombre) {
      Alert.alert('Error', 'Completa todos los campos');
      return;
    }

    setCargando(true);
    const { error } = await crearTrabajador(tEmail, tPass, tNombre);
    setCargando(false);

    if (error) {
      Alert.alert('Error', error);
    } else {
      Alert.alert('Éxito', `Trabajador ${tNombre} creado correctamente`);
      setTEmail('');
      setTPass('');
      setTNombre('');
      setModo('info');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={estilos.overlay}>
        <View style={estilos.contenedor}>
          
          {/* Cabecera */}
          <View style={estilos.header}>
            <Text style={estilos.headerTitulo}>
              {modo === 'info' ? 'Mi Perfil' : 
               modo === 'password' ? 'Seguridad' : 'Gestión de Personal'}
            </Text>
            <TouchableOpacity onPress={onClose} style={estilos.btnClose}>
              <Text style={estilos.btnCloseTexto}>×</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={estilos.content}>
            
            {modo === 'info' && (
              <View>
                <View style={estilos.infoBox}>
                  <Text style={estilos.emoji}>👤</Text>
                  <Text style={estilos.nombre}>{perfil?.nombre || 'Sin nombre'}</Text>
                  <Text style={estilos.rolTag}>{rol?.toUpperCase()}</Text>
                  <Text style={estilos.email}>{user?.email}</Text>
                </View>

                <TouchableOpacity style={estilos.opcion} onPress={() => setModo('password')}>
                  <Text style={estilos.opcionTexto}>🔐 Cambiar mi contraseña</Text>
                </TouchableOpacity>

                {esAdmin() && (
                  <TouchableOpacity style={estilos.opcion} onPress={() => setModo('admin')}>
                    <Text style={estilos.opcionTexto}>👥 Registrar nuevo (Admin)</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity 
                  style={[estilos.opcion, { marginTop: 20 }]} 
                  onPress={() => {
                    onClose();
                    cerrarSesion();
                  }}
                >
                  <Text style={[estilos.opcionTexto, { color: Colors.red }]}>🚪 Cerrar Sesión</Text>
                </TouchableOpacity>
              </View>
            )}

            {modo === 'password' && (
              <View>
                <Text style={estilos.label}>Nueva contraseña (min 6 caracteres)</Text>
                <TextInput
                  style={estilos.input}
                  secureTextEntry
                  value={nuevaPass}
                  onChangeText={setNuevaPass}
                  placeholder="******"
                />
                <Text style={estilos.label}>Confirmar contraseña</Text>
                <TextInput
                  style={estilos.input}
                  secureTextEntry
                  value={confirmPass}
                  onChangeText={setConfirmPass}
                  placeholder="******"
                />
                <TouchableOpacity style={estilos.btnPrincipal} onPress={handleCambiarPass} disabled={cargando}>
                  {cargando ? <ActivityIndicator color={Colors.white} /> : <Text style={estilos.btnTexto}>Guardar</Text>}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setModo('info')} style={estilos.btnVolver}>
                  <Text style={estilos.btnVolverTexto}>Volver</Text>
                </TouchableOpacity>
              </View>
            )}

            {modo === 'admin' && (
              <View>
                <Text style={estilos.label}>Nombre completo</Text>
                <TextInput
                  style={estilos.input}
                  value={tNombre}
                  onChangeText={setTNombre}
                  placeholder="Ej: Juan Pérez"
                />
                <Text style={estilos.label}>Correo Electrónico</Text>
                <TextInput
                  style={estilos.input}
                  value={tEmail}
                  onChangeText={setTEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="trabajador@tienda.com"
                />
                <Text style={estilos.label}>Contraseña temporal</Text>
                <TextInput
                  style={estilos.input}
                  value={tPass}
                  onChangeText={setTPass}
                  placeholder="******"
                />
                <TouchableOpacity style={estilos.btnPrincipal} onPress={handleCrearTrabajador} disabled={cargando}>
                  {cargando ? <ActivityIndicator color={Colors.white} /> : <Text style={estilos.btnTexto}>Crear Usuario</Text>}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setModo('info')} style={estilos.btnVolver}>
                  <Text style={estilos.btnVolverTexto}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            )}

          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const estilos = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  contenedor: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitulo: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.dark,
  },
  btnClose: {
    padding: 5,
  },
  btnCloseTexto: {
    fontSize: 28,
    color: Colors.gray,
  },
  content: {
    padding: 20,
  },
  infoBox: {
    alignItems: 'center',
    marginBottom: 30,
  },
  emoji: {
    fontSize: 50,
    marginBottom: 10,
  },
  nombre: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.dark,
  },
  rolTag: {
    backgroundColor: Colors.greenLight,
    color: Colors.greenDark,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 6,
    overflow: 'hidden',
  },
  email: {
    fontSize: 14,
    color: Colors.gray,
    marginTop: 6,
  },
  opcion: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 14,
    marginBottom: 12,
  },
  opcionTexto: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.dark,
  },
  label: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.gray,
    marginBottom: 8,
    marginTop: 15,
  },
  input: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9fafb',
  },
  btnPrincipal: {
    backgroundColor: Colors.green,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 30,
  },
  btnTexto: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '900',
  },
  btnVolver: {
    padding: 15,
    alignItems: 'center',
  },
  btnVolverTexto: {
    color: Colors.gray,
    fontSize: 14,
    fontWeight: '800',
  }
});
