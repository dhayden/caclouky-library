import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import type { Reservation } from '../types';
import * as api from '../api';

const STATUS_STYLE: Record<string, object> = {
  Pending: { backgroundColor: '#fff8e1', color: '#f57f17' },
  Ready: { backgroundColor: '#e8f5e9', color: '#2e7d32' },
  Fulfilled: { backgroundColor: '#e3f2fd', color: '#1565c0' },
  Cancelled: { backgroundColor: '#eeeeee', color: '#757575' },
};

export default function MyReservationsScreen() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getReservations().then(r => setReservations(r.data)).finally(() => setLoading(false));
  }, []);

  const cancel = (id: number, title: string) => {
    Alert.alert('Cancel Reservation', `Cancel reservation for "${title}"?`, [
      { text: 'No', style: 'cancel' },
      {
        text: 'Cancel Reservation', style: 'destructive', onPress: async () => {
          await api.cancelReservation(id);
          setReservations(rs => rs.map(r => r.id === id ? { ...r, status: 'Cancelled' } : r));
        }
      },
    ]);
  };

  if (loading) return <ActivityIndicator style={styles.center} size="large" color="#1976d2" />;

  return (
    <FlatList
      style={styles.container}
      data={reservations}
      keyExtractor={r => String(r.id)}
      ListEmptyComponent={<Text style={styles.empty}>You have no reservations yet.</Text>}
      renderItem={({ item: r }) => {
        const s = STATUS_STYLE[r.status] as any;
        return (
          <View style={styles.card}>
            <Text style={styles.title} numberOfLines={1}>{r.book.title}</Text>
            <Text style={styles.author}>{r.book.author}</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Reserved:</Text>
              <Text style={styles.value}>{new Date(r.reservedAt).toLocaleDateString()}</Text>
            </View>
            <View style={styles.footer}>
              <View style={[styles.badge, { backgroundColor: s.backgroundColor }]}>
                <Text style={[styles.badgeText, { color: s.color }]}>{r.status}</Text>
              </View>
              {(r.status === 'Pending' || r.status === 'Ready') && (
                <TouchableOpacity onPress={() => cancel(r.id, r.book.title)}>
                  <Text style={styles.cancelBtn}>Cancel</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 12 },
  center: { flex: 1 },
  card: { backgroundColor: '#fff', borderRadius: 8, padding: 14, marginBottom: 10, elevation: 1, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  title: { fontSize: 15, fontWeight: '600', color: '#212121' },
  author: { fontSize: 13, color: '#666', marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  label: { fontSize: 13, color: '#888' },
  value: { fontSize: 13, color: '#333' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  cancelBtn: { fontSize: 13, color: '#d32f2f', fontWeight: '600' },
  empty: { textAlign: 'center', color: '#999', marginTop: 48 },
});
