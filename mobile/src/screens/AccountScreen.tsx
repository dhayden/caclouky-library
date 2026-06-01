import { View, Text, TouchableOpacity, StyleSheet, Switch, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useDisplay } from '../context/DisplayContext';

const FONT_OPTIONS = [
  { label: 'Small', value: 'small' },
  { label: 'Medium', value: 'medium' },
  { label: 'Large', value: 'large' },
] as const;

export default function AccountScreen() {
  const { user, signOut } = useAuth();
  const { theme, fontSize, toggleDarkMode, setFontSize } = useDisplay();
  const c = theme.colors;

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.background }]} contentContainerStyle={styles.content}>
      {/* Profile */}
      <View style={[styles.section, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Text style={[styles.name, { color: c.textPrimary }]}>{user?.firstName} {user?.lastName}</Text>
        <Text style={[styles.email, { color: c.textSecondary }]}>{user?.email}</Text>
        <View style={styles.chips}>
          {user?.roles.map(r => (
            <View key={r} style={[styles.chip, { backgroundColor: theme.dark ? '#1a3a5c' : '#e3f2fd' }]}>
              <Text style={[styles.chipText, { color: c.primary }]}>{r}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Display settings */}
      <Text style={[styles.sectionLabel, { color: c.textMuted }]}>DISPLAY</Text>
      <View style={[styles.section, { backgroundColor: c.surface, borderColor: c.border }]}>
        <View style={styles.row}>
          <Text style={[styles.rowLabel, { color: c.textPrimary }]}>Dark Mode</Text>
          <Switch
            value={theme.dark}
            onValueChange={toggleDarkMode}
            trackColor={{ false: '#ccc', true: c.primary }}
            thumbColor="#fff"
          />
        </View>

        <View style={[styles.divider, { backgroundColor: c.border }]} />

        <Text style={[styles.rowLabel, { color: c.textPrimary, marginBottom: 12 }]}>Font Size</Text>
        <View style={styles.fontOptions}>
          {FONT_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.fontBtn,
                { borderColor: c.border, backgroundColor: c.inputBg },
                fontSize === opt.value && { backgroundColor: c.primary, borderColor: c.primary },
              ]}
              onPress={() => setFontSize(opt.value)}
            >
              <Text style={[
                styles.fontBtnText,
                { color: fontSize === opt.value ? '#fff' : c.textSecondary },
              ]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Sign out */}
      <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 48 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8, marginTop: 20, marginLeft: 4 },
  section: { borderRadius: 12, padding: 18, borderWidth: 1, marginBottom: 4 },
  name: { fontSize: 22, fontWeight: 'bold' },
  email: { fontSize: 15, marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  chipText: { fontSize: 12, fontWeight: '600' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  rowLabel: { fontSize: 16 },
  divider: { height: 1, marginVertical: 14 },
  fontOptions: { flexDirection: 'row', gap: 10 },
  fontBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  fontBtnText: { fontSize: 14, fontWeight: '600' },
  signOutBtn: { marginTop: 32, backgroundColor: '#d32f2f', borderRadius: 10, padding: 16, alignItems: 'center' },
  signOutText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
