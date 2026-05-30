import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function AccountScreen() {
  const { user, signOut } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.name}>{user?.firstName} {user?.lastName}</Text>
      <Text style={styles.email}>{user?.email}</Text>
      {user?.roles.map(r => (
        <View key={r} style={styles.chip}><Text style={styles.chipText}>{r}</Text></View>
      ))}
      <TouchableOpacity style={styles.button} onPress={signOut}>
        <Text style={styles.buttonText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#fff' },
  name: { fontSize: 22, fontWeight: 'bold', color: '#212121' },
  email: { fontSize: 15, color: '#555', marginTop: 4 },
  chip: { backgroundColor: '#e3f2fd', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginTop: 8 },
  chipText: { fontSize: 12, color: '#1976d2' },
  button: { marginTop: 40, backgroundColor: '#d32f2f', borderRadius: 8, padding: 14, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});
