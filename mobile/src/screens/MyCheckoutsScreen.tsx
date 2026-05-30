import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import type { Checkout } from '../types';
import * as api from '../api';

const isOverdue = (c: Checkout) => !c.isReturned && new Date(c.dueDate) < new Date();

export default function MyCheckoutsScreen() {
  const [checkouts, setCheckouts] = useState<Checkout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getCheckouts().then(r => setCheckouts(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <ActivityIndicator style={styles.center} size="large" color="#1976d2" />;

  return (
    <FlatList
      style={styles.container}
      data={checkouts}
      keyExtractor={c => String(c.id)}
      ListEmptyComponent={<Text style={styles.empty}>You have no checkouts.</Text>}
      renderItem={({ item: c }) => (
        <View style={[styles.card, isOverdue(c) && styles.cardOverdue]}>
          <Text style={styles.title} numberOfLines={1}>{c.book.title}</Text>
          <Text style={styles.author}>{c.book.author}</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Checked out:</Text>
            <Text style={styles.value}>{new Date(c.checkedOutAt).toLocaleDateString()}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Due:</Text>
            <Text style={[styles.value, isOverdue(c) && styles.overdue]}>
              {isOverdue(c) ? '⚠ ' : ''}{new Date(c.dueDate).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.badge}>
            <Text style={[styles.badgeText,
              c.isReturned ? styles.badgeReturned : isOverdue(c) ? styles.badgeOverdue : styles.badgeActive
            ]}>
              {c.isReturned ? `Returned ${new Date(c.returnedAt!).toLocaleDateString()}` : isOverdue(c) ? 'Overdue' : 'Active'}
            </Text>
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 12 },
  center: { flex: 1 },
  card: { backgroundColor: '#fff', borderRadius: 8, padding: 14, marginBottom: 10, elevation: 1, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  cardOverdue: { borderLeftWidth: 4, borderLeftColor: '#d32f2f' },
  title: { fontSize: 15, fontWeight: '600', color: '#212121' },
  author: { fontSize: 13, color: '#666', marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  label: { fontSize: 13, color: '#888' },
  value: { fontSize: 13, color: '#333' },
  overdue: { color: '#d32f2f', fontWeight: '600' },
  badge: { marginTop: 8, alignSelf: 'flex-start' },
  badgeText: { fontSize: 12, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, overflow: 'hidden' },
  badgeActive: { backgroundColor: '#e8f5e9', color: '#2e7d32' },
  badgeOverdue: { backgroundColor: '#ffebee', color: '#c62828' },
  badgeReturned: { backgroundColor: '#eeeeee', color: '#555' },
  empty: { textAlign: 'center', color: '#999', marginTop: 48 },
});
