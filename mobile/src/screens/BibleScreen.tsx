import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Modal, ScrollView, Alert,
} from 'react-native';
import type { BibleVerse } from '../types';
import * as api from '../api';

export default function BibleScreen() {
  const [books, setBooks] = useState<string[]>([]);
  const [selectedBook, setSelectedBook] = useState('');
  const [chapter, setChapter] = useState(1);
  const [verses, setVerses] = useState<BibleVerse[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<BibleVerse[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [bookPickerOpen, setBookPickerOpen] = useState(false);
  const [verseModal, setVerseModal] = useState<BibleVerse | null>(null);

  useEffect(() => {
    api.getBibleBooks().then(r => {
      setBooks(r.data);
      if (r.data.length) setSelectedBook(r.data[0]);
    });
  }, []);

  useEffect(() => {
    if (!selectedBook) return;
    setLoading(true);
    api.getBibleChapter(selectedBook, chapter)
      .then(r => setVerses(r.data))
      .catch(() => setVerses([]))
      .finally(() => setLoading(false));
  }, [selectedBook, chapter]);

  const doSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const res = await api.searchBible(searchQuery);
      setSearchResults(res.data);
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => { setSearchResults(null); setSearchQuery(''); };

  const displayVerses = searchResults ?? verses;

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search the Bible…"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={doSearch}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchBtn} onPress={doSearch}>
          <Text style={styles.searchBtnText}>Search</Text>
        </TouchableOpacity>
        {searchResults && (
          <TouchableOpacity style={styles.clearBtn} onPress={clearSearch}>
            <Text style={styles.clearBtnText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Book + chapter nav */}
      {!searchResults && (
        <View style={styles.nav}>
          <TouchableOpacity style={styles.bookBtn} onPress={() => setBookPickerOpen(true)}>
            <Text style={styles.bookBtnText}>{selectedBook || 'Select Book'} ▼</Text>
          </TouchableOpacity>
          <View style={styles.chapterNav}>
            <TouchableOpacity style={[styles.chapterBtn, chapter <= 1 && styles.chapterBtnDisabled]} onPress={() => chapter > 1 && setChapter(c => c - 1)} disabled={chapter <= 1}>
              <Text style={styles.chapterBtnText}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.chapterLabel}>Ch. {chapter}</Text>
            <TouchableOpacity style={styles.chapterBtn} onPress={() => setChapter(c => c + 1)}>
              <Text style={styles.chapterBtnText}>›</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {searchResults && (
        <Text style={styles.resultCount}>{searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{searchQuery}"</Text>
      )}

      {loading ? (
        <ActivityIndicator style={styles.center} size="large" color="#1976d2" />
      ) : (
        <FlatList
          data={displayVerses}
          keyExtractor={v => String(v.id)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No verses found.</Text>}
          renderItem={({ item: v }) => (
            <TouchableOpacity style={styles.verseRow} onPress={() => setVerseModal(v)}>
              <Text style={styles.verseNum}>
                {searchResults ? `${v.book} ${v.chapter}:${v.verse}` : v.verse}
              </Text>
              <Text style={styles.verseText}>{v.text}</Text>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Book picker modal */}
      <Modal visible={bookPickerOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setBookPickerOpen(false)}>
        <View style={styles.pickerModal}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>Select Book</Text>
            <TouchableOpacity onPress={() => setBookPickerOpen(false)}>
              <Text style={styles.pickerClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={books}
            keyExtractor={b => b}
            renderItem={({ item: b }) => (
              <TouchableOpacity style={[styles.bookItem, b === selectedBook && styles.bookItemSelected]} onPress={() => { setSelectedBook(b); setChapter(1); setBookPickerOpen(false); }}>
                <Text style={[styles.bookItemText, b === selectedBook && styles.bookItemTextSelected]}>{b}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

      {/* Verse detail modal */}
      <Modal visible={!!verseModal} animationType="fade" transparent onRequestClose={() => setVerseModal(null)}>
        <View style={styles.overlay}>
          <View style={styles.verseModal}>
            <Text style={styles.verseModalRef}>{verseModal && `${verseModal.book} ${verseModal.chapter}:${verseModal.verse}`}</Text>
            <Text style={styles.verseModalText}>{verseModal?.text}</Text>
            <TouchableOpacity style={styles.closeModalBtn} onPress={() => setVerseModal(null)}>
              <Text style={styles.closeModalBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  searchRow: { flexDirection: 'row', padding: 12, gap: 8, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  searchInput: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14 },
  searchBtn: { backgroundColor: '#1976d2', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  searchBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  clearBtn: { padding: 6 },
  clearBtnText: { fontSize: 16, color: '#888' },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  bookBtn: { backgroundColor: '#e3f2fd', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  bookBtnText: { color: '#1976d2', fontWeight: '600', fontSize: 14 },
  chapterNav: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  chapterBtn: { backgroundColor: '#1976d2', width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  chapterBtnDisabled: { backgroundColor: '#ccc' },
  chapterBtnText: { color: '#fff', fontSize: 18 },
  chapterLabel: { fontSize: 14, fontWeight: '600', minWidth: 50, textAlign: 'center' },
  resultCount: { fontSize: 12, color: '#888', paddingHorizontal: 12, paddingVertical: 6 },
  center: { flex: 1 },
  list: { padding: 12 },
  verseRow: { flexDirection: 'row', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  verseNum: { fontSize: 12, fontWeight: 'bold', color: '#1976d2', minWidth: 24, marginTop: 2 },
  verseText: { flex: 1, fontSize: 15, color: '#212121', lineHeight: 22 },
  empty: { textAlign: 'center', color: '#999', marginTop: 48 },
  pickerModal: { flex: 1, padding: 16 },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  pickerTitle: { fontSize: 18, fontWeight: 'bold' },
  pickerClose: { fontSize: 20, color: '#888' },
  bookItem: { paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  bookItemSelected: { backgroundColor: '#e3f2fd' },
  bookItemText: { fontSize: 15, color: '#212121' },
  bookItemTextSelected: { color: '#1976d2', fontWeight: '600' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  verseModal: { backgroundColor: '#fff', borderRadius: 12, padding: 20, width: '100%' },
  verseModalRef: { fontSize: 16, fontWeight: 'bold', color: '#1976d2', marginBottom: 10 },
  verseModalText: { fontSize: 16, lineHeight: 26, color: '#212121', fontStyle: 'italic' },
  closeModalBtn: { marginTop: 16, backgroundColor: '#1976d2', borderRadius: 8, padding: 12, alignItems: 'center' },
  closeModalBtnText: { color: '#fff', fontWeight: '600' },
});
