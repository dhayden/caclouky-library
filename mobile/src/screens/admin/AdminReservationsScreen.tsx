import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import type { Reservation } from '../../types';
import * as api from '../../api';

export default function AdminReservationsScreen() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'pending' | 'ready'>('pending');

  const load = () => {
    setLoading(true);
    api.getReservations().then(r => setReservations(r.data)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const pending = reservations.filter(r => r.status === 'Pending');
  const ready = reservations.filter(r => r.status === 'Ready');
  const data = tab === 'pending' ? pending : ready;

  const markReady = async (id: number) => {
    await api.readyReservation(id);
    Alert.alert('Done', 'Marked as ready for pickup.');
    load();
  };

  const processCheckout = (r: Reservation) => {
    Alert.alert('Process Checkout', `Check out "${r.book.title}" for ${r.user.firstName} ${r.user.lastName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Process', onPress: async () => {
          try {
            await api.createCheckout(r.book.id, r.user.id);
            await api.fulfillReservation(r.id);
            Alert.alert('Done', `Checkout processed for ${r.user.firstName} ${r.user.lastName}.`);
            load();
          } catch {
            Alert.alert('Error', 'Checkout failed.');
          }
        }
      },
    ]);
  };

  const cancel = async (id: number) => {
    await api.cancelReservation(id);
    load();
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, tab === 'pending' && styles.tabActive]} onPress={() => setTab('pending')}>
          <Text style={[styles.tabText, tab === 'pending' && styles.tabTextActive]}>Pending ({pending.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'ready' && styles.tabActive]} onPress={() => setTab('ready')}>
          <Text style={[styles.tabText, tab === 'ready' && styles.tabTextActive]}>Ready for Pickup ({ready.length})</Text>
        </TouchableOpacity>
      </View>

      {loading ? <ActivityIndicator style={styles.center} size="large" color="#1976d2" /> : (
        <FlatList
          data={data}
          keyExtractor={r => String(r.id)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No reservations.</Text>}
          renderItem={({ item: r }) => (
            <View style={styles.card}>
              <Text style={styles.title} numberOfLines={1}>{r.book.title}</Text>
              <Text style={styles.member}>{r.user.firstName} {r.user.lastName}</Text>
              <Text style={styles.date}>Reserved: {new Date(r.reservedAt).toLocaleDateString()}</Text>
              {r.availableAt && <Text style={styles.date}>Ready: {new Date(r.availableAt).toLocaleDateString()}</Text>}
              <View style={styles.actions}>
                {tab === 'pending' && (
                  <TouchableOpacity style={styles.btn} onPress={() => markReady(r.id)}>
                    <Text style={styles.btnText}>Mark Ready</Text>
                  </TouchableOpacity>
                )}
                {tab === 'ready' && (
                  <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={() => processCheckout(r)}>
                    <Text style={styles.btnText}>Process Checkout</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={[styles.btn, styles.btnDanger]} onPress={() => cancel(r.id)}>
                  <Text style={styles.btnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1 },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#1976d2' },
  tabText: { fontSize: 13, color: '#888' },
  tabTextActive: { color: '#1976d2', fontWeight: '600' },
  list: { padding: 12 },
  card: { backgroundColor: '#fff', borderRadius: 8, padding: 14, marginBottom: 10, elevation: 1, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  title: { fontSize: 15, fontWeight: '600', color: '#212121' },
  member: { fontSize: 13, color: '#1976d2', marginTop: 2 },
  date: { fontSize: 12, color: '#888', marginTop: 2 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  btn: { backgroundColor: '#1976d2', borderRadius: 6, paddingVertical: 7, paddingHorizontal: 14 },
  btnPrimary: { backgroundColor: '#2e7d32' },
  btnDanger: { backgroundColor: '#d32f2f' },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  empty: { textAlign: 'center', color: '#999', marginTop: 48 },
});
