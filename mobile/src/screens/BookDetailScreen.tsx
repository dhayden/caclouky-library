import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Image, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CatalogStackParamList } from '../navigation/types';
import type { Book } from '../types';
import * as api from '../api';
import { useAuth } from '../context/AuthContext';

type Props = NativeStackScreenProps<CatalogStackParamList, 'BookDetail'>;

export default function BookDetailScreen({ route }: Props) {
  const { user } = useAuth();
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [reserving, setReserving] = useState(false);

  useEffect(() => {
    api.getBook(route.params.id)
      .then(r => setBook(r.data))
      .finally(() => setLoading(false));
  }, [route.params.id]);

  const handleReserve = async () => {
    if (!book) return;
    setReserving(true);
    try {
      await api.createReservation(book.id);
      Alert.alert('Reserved', `"${book.title}" has been reserved for you.`);
    } catch {
      Alert.alert('Error', 'Could not complete the reservation. Please try again.');
    } finally {
      setReserving(false);
    }
  };

  if (loading) return <ActivityIndicator style={styles.center} size="large" color="#1976d2" />;
  if (!book) return <Text style={styles.center}>Book not found.</Text>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {book.coverImageUrl ? (
        <Image source={{ uri: book.coverImageUrl }} style={styles.cover} resizeMode="contain" />
      ) : (
        <View style={[styles.cover, styles.coverPlaceholder]}>
          <Text style={styles.coverIcon}>📚</Text>
        </View>
      )}

      <Text style={styles.title}>{book.title}</Text>
      <Text style={styles.author}>{book.author}</Text>

      <View style={styles.chips}>
        {book.genre && <View style={styles.chip}><Text style={styles.chipText}>{book.genre}</Text></View>}
        {book.isRestricted && <View style={[styles.chip, styles.chipWarning]}><Text style={styles.chipText}>Ministers Only</Text></View>}
      </View>

      <View style={styles.availability}>
        <Text style={book.availableCopies > 0 ? styles.available : styles.unavailable}>
          {book.availableCopies > 0 ? `${book.availableCopies} of ${book.totalCopies} copies available` : `0 of ${book.totalCopies} copies available`}
        </Text>
      </View>

      {book.description ? <Text style={styles.description}>{book.description}</Text> : null}

      {book.publisher && <Text style={styles.meta}>Publisher: {book.publisher}</Text>}
      {book.publishedYear && <Text style={styles.meta}>Year: {book.publishedYear}</Text>}
      {book.isbn && <Text style={styles.meta}>ISBN: {book.isbn}</Text>}

      {user && (
        <TouchableOpacity
          style={[styles.button, (book.availableCopies === 0 || reserving) && styles.buttonDisabled]}
          onPress={handleReserve}
          disabled={book.availableCopies === 0 || reserving}
        >
          {reserving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>{book.availableCopies > 0 ? 'Reserve' : 'Unavailable'}</Text>}
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, alignItems: 'center' },
  center: { flex: 1, textAlign: 'center', marginTop: 80 },
  cover: { width: 160, height: 220, marginBottom: 20, borderRadius: 4 },
  coverPlaceholder: { backgroundColor: '#e3f2fd', alignItems: 'center', justifyContent: 'center' },
  coverIcon: { fontSize: 64 },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', color: '#212121' },
  author: { fontSize: 16, color: '#555', marginTop: 4, textAlign: 'center' },
  chips: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap', justifyContent: 'center' },
  chip: { backgroundColor: '#e3f2fd', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  chipWarning: { backgroundColor: '#fff3e0' },
  chipText: { fontSize: 12, color: '#1976d2' },
  availability: { marginTop: 12 },
  available: { color: '#2e7d32', fontWeight: '600' },
  unavailable: { color: '#c62828', fontWeight: '600' },
  description: { marginTop: 16, fontSize: 14, color: '#444', lineHeight: 22, textAlign: 'left', alignSelf: 'stretch' },
  meta: { fontSize: 13, color: '#777', marginTop: 6, alignSelf: 'flex-start' },
  button: { marginTop: 24, backgroundColor: '#1976d2', borderRadius: 8, paddingVertical: 14, paddingHorizontal: 48, alignSelf: 'stretch', alignItems: 'center' },
  buttonDisabled: { backgroundColor: '#bbb' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});
