import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import type { Checkout } from '../../types';
import * as api from '../../api';

export default function AdminCheckoutsScreen() {
  const [checkouts, setCheckouts] = useState<Checkout[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'active' | 'history'>('active');

  const load = () => {
    setLoading(true);
    api.getCheckouts().then(r => setCheckouts(r.data)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const active = checkouts.filter(c => !c.isReturned);
  const history = checkouts.filter(c => c.isReturned);
  const isOverdue = (c: Checkout) => !c.isReturned && new Date(c.dueDate) < new Date();

  const returnBook = (c: Checkout) => {
    Alert.alert('Return Book', `Return "${c.book.title}" for ${c.user.firstName} ${c.user.lastName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Return', onPress: async () => {
          try {
            const res = await api.returnCheckout(c.id);
            const fee = (res.data as any).lateFee;
            Alert.alert('Returned', fee > 0 ? `Late fee: $${fee.toFixed(2)}` : 'Book returned successfully.');
            load();
          } catch {
            Alert.alert('Error', 'Return failed.');
          }
        }
      },
    ]);
  };

  const data = tab === 'active' ? active : history;

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, tab === 'active' && styles.tabActive]} onPress={() => setTab('active')}>
          <Text style={[styles.tabText, tab === 'active' && styles.tabTextActive]}>Active ({active.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'history' && styles.tabActive]} onPress={() => setTab('history')}>
          <Text style={[styles.tabText, tab === 'history' && styles.tabTextActive]}>History ({history.length})</Text>
        </TouchableOpacity>
      </View>

      {loading ? <ActivityIndicator style={styles.center} size="large" color="#1976d2" /> : (
        <FlatList
          data={data}
          keyExtractor={c => String(c.id)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No checkouts.</Text>}
          renderItem={({ item: c }) => (
            <View style={[styles.card, isOverdue(c) && styles.cardOverdue]}>
              <Text style={styles.title} numberOfLines={1}>{c.book.title}</Text>
              <Text style={styles.member}>{c.user.firstName} {c.user.lastName} · {c.user.email}</Text>
              <View style={styles.row}>
                <Text style={styles.label}>Checked out:</Text>
                <Text style={styles.value}>{new Date(c.checkedOutAt).toLocaleDateString()}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>{c.isReturned ? 'Returned:' : 'Due:'}</Text>
                <Text style={[styles.value, isOverdue(c) && styles.overdueText]}>
                  {c.isReturned ? new Date(c.returnedAt!).toLocaleDateString() : new Date(c.dueDate).toLocaleDateString()}
                </Text>
              </View>
              {c.lateFee ? <Text style={styles.fee}>Late fee: ${c.lateFee.toFixed(2)}</Text> : null}
              {!c.isReturned && (
                <TouchableOpacity style={styles.btn} onPress={() => returnBook(c)}>
                  <Text style={styles.btnText}>Return</Text>
                </TouchableOpacity>
              )}
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
  tabText: { fontSize: 14, color: '#888' },
  tabTextActive: { color: '#1976d2', fontWeight: '600' },
  list: { padding: 12 },
  card: { backgroundColor: '#fff', borderRadius: 8, padding: 14, marginBottom: 10, elevation: 1, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  cardOverdue: { borderLeftWidth: 4, borderLeftColor: '#d32f2f' },
  title: { fontSize: 15, fontWeight: '600', color: '#212121' },
  member: { fontSize: 12, color: '#1976d2', marginBottom: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  label: { fontSize: 13, color: '#888' },
  value: { fontSize: 13, color: '#333' },
  overdueText: { color: '#d32f2f', fontWeight: '600' },
  fee: { fontSize: 12, color: '#f57f17', marginTop: 4 },
  btn: { marginTop: 10, backgroundColor: '#1976d2', borderRadius: 6, paddingVertical: 7, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  empty: { textAlign: 'center', color: '#999', marginTop: 48 },
});
