import { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CatalogStackParamList } from '../navigation/types';
import type { Book } from '../types';
import * as api from '../api';

type Props = NativeStackScreenProps<CatalogStackParamList, 'BookList'>;

export default function CatalogScreen({ navigation }: Props) {
  const [books, setBooks] = useState<Book[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const PAGE_SIZE = 20;

  const load = useCallback(async (p: number, q: string, append = false) => {
    if (p === 1) setLoading(true); else setLoadingMore(true);
    try {
      const res = await api.getBooks({ search: q, page: p, pageSize: PAGE_SIZE });
      setTotal(res.data.total);
      setBooks(prev => append ? [...prev, ...res.data.books] : res.data.books);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => { setPage(1); load(1, search); }, [search, load]);

  const loadMore = () => {
    if (loadingMore || books.length >= total) return;
    const next = page + 1;
    setPage(next);
    load(next, search, true);
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        placeholder="Search books…"
        value={search}
        onChangeText={setSearch}
        clearButtonMode="while-editing"
      />
      {loading ? (
        <ActivityIndicator style={styles.center} size="large" color="#1976d2" />
      ) : (
        <FlatList
          data={books}
          keyExtractor={b => String(b.id)}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('BookDetail', { id: item.id })}>
              {item.coverImageUrl ? (
                <Image source={{ uri: item.coverImageUrl }} style={styles.cover} />
              ) : (
                <View style={[styles.cover, styles.coverPlaceholder]}>
                  <Text style={styles.coverIcon}>📚</Text>
                </View>
              )}
              <View style={styles.info}>
                <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.author} numberOfLines={1}>{item.author}</Text>
                {item.genre ? <Text style={styles.genre}>{item.genre}</Text> : null}
                <Text style={item.availableCopies > 0 ? styles.available : styles.unavailable}>
                  {item.availableCopies > 0 ? `${item.availableCopies} available` : 'Not available'}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={loadingMore ? <ActivityIndicator color="#1976d2" style={{ padding: 16 }} /> : null}
          ListEmptyComponent={<Text style={styles.empty}>No books found.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  search: { margin: 12, padding: 10, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#ddd', fontSize: 15 },
  center: { flex: 1, justifyContent: 'center' },
  card: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 12, marginBottom: 8, borderRadius: 8, overflow: 'hidden', elevation: 1, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  cover: { width: 72, height: 100 },
  coverPlaceholder: { backgroundColor: '#e3f2fd', alignItems: 'center', justifyContent: 'center' },
  coverIcon: { fontSize: 28 },
  info: { flex: 1, padding: 10, justifyContent: 'space-between' },
  title: { fontSize: 14, fontWeight: '600', color: '#212121' },
  author: { fontSize: 13, color: '#555', marginTop: 2 },
  genre: { fontSize: 11, color: '#1976d2', backgroundColor: '#e3f2fd', alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4 },
  available: { fontSize: 12, color: '#2e7d32', marginTop: 4 },
  unavailable: { fontSize: 12, color: '#c62828', marginTop: 4 },
  empty: { textAlign: 'center', color: '#999', marginTop: 48 },
});
