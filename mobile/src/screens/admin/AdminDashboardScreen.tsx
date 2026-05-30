import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AdminStackParamList } from '../../navigation/types';
import type { Checkout, Reservation } from '../../types';
import * as api from '../../api';

type Props = NativeStackScreenProps<AdminStackParamList, 'AdminDashboard'>;

export default function AdminDashboardScreen({ navigation }: Props) {
  const [checkouts, setCheckouts] = useState<Checkout[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([api.getCheckouts(), api.getReservations()])
      .then(([c, r]) => { setCheckouts(c.data); setReservations(r.data); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const overdue = checkouts.filter(c => !c.isReturned && new Date(c.dueDate) < new Date());
  const active = checkouts.filter(c => !c.isReturned);
  const pending = reservations.filter(r => r.status === 'Pending');

  const markReady = async (id: number) => {
    await api.readyReservation(id);
    Alert.alert('Done', 'Marked as ready for pickup.');
    load();
  };

  if (loading) return <ActivityIndicator style={styles.center} size="large" color="#1976d2" />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.statsRow}>
        {[
          { label: 'Active Checkouts', value: active.length, warn: false },
          { label: 'Overdue', value: overdue.length, warn: overdue.length > 0 },
          { label: 'Pending Reservations', value: pending.length, warn: false },
        ].map(s => (
          <View key={s.label} style={[styles.stat, s.warn && styles.statWarn]}>
            <Text style={[styles.statValue, s.warn && styles.statValueWarn]}>{s.value}</Text>
            <Text style={[styles.statLabel, s.warn && styles.statLabelWarn]}>{s.label}</Text>
          </View>
        ))}
      </View>

      {overdue.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overdue Checkouts</Text>
          {overdue.map(c => (
            <View key={c.id} style={[styles.card, styles.cardOverdue]}>
              <Text style={styles.cardTitle}>{c.book.title}</Text>
              <Text style={styles.cardSub}>{c.user.firstName} {c.user.lastName}</Text>
              <Text style={styles.overdueText}>Due: {new Date(c.dueDate).toLocaleDateString()}</Text>
            </View>
          ))}
        </View>
      )}

      {pending.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pending Reservations</Text>
          {pending.map(r => (
            <View key={r.id} style={styles.card}>
              <Text style={styles.cardTitle}>{r.book.title}</Text>
              <Text style={styles.cardSub}>{r.user.firstName} {r.user.lastName}</Text>
              <Text style={styles.cardDate}>Reserved: {new Date(r.reservedAt).toLocaleDateString()}</Text>
              <TouchableOpacity style={styles.actionBtn} onPress={() => markReady(r.id)}>
                <Text style={styles.actionBtnText}>Mark Ready</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <View style={styles.navSection}>
        {[
          { label: 'Manage Checkouts', screen: 'AdminCheckouts' as const },
          { label: 'Manage Reservations', screen: 'AdminReservations' as const },
          { label: 'Manage Members', screen: 'AdminMembers' as const },
        ].map(item => (
          <TouchableOpacity key={item.screen} style={styles.navBtn} onPress={() => navigation.navigate(item.screen)}>
            <Text style={styles.navBtnText}>{item.label}</Text>
            <Text style={styles.navBtnArrow}>›</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16 },
  center: { flex: 1 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  stat: { flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 14, alignItems: 'center', elevation: 1, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  statWarn: { backgroundColor: '#fff8e1' },
  statValue: { fontSize: 32, fontWeight: 'bold', color: '#212121' },
  statValueWarn: { color: '#f57f17' },
  statLabel: { fontSize: 11, color: '#888', textAlign: 'center', marginTop: 2 },
  statLabelWarn: { color: '#f57f17' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 8 },
  card: { backgroundColor: '#fff', borderRadius: 8, padding: 12, marginBottom: 8, elevation: 1, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  cardOverdue: { borderLeftWidth: 4, borderLeftColor: '#d32f2f' },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#212121' },
  cardSub: { fontSize: 13, color: '#666', marginTop: 2 },
  cardDate: { fontSize: 12, color: '#888', marginTop: 4 },
  overdueText: { fontSize: 12, color: '#d32f2f', fontWeight: '600', marginTop: 4 },
  actionBtn: { marginTop: 8, backgroundColor: '#1976d2', borderRadius: 6, paddingVertical: 6, paddingHorizontal: 14, alignSelf: 'flex-start' },
  actionBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  navSection: { gap: 8 },
  navBtn: { backgroundColor: '#fff', borderRadius: 8, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 1, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  navBtnText: { fontSize: 15, color: '#212121' },
  navBtnArrow: { fontSize: 20, color: '#bbb' },
});
