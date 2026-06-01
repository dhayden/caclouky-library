import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Modal, ScrollView, Alert,
} from 'react-native';
import type { BibleVerse } from '../types';
import * as api from '../api';
import { useDisplay } from '../context/DisplayContext';

type VerseTab = 'verse' | 'note' | 'sowders';

export default function BibleScreen() {
  const { theme } = useDisplay();
  const c = theme.colors;
  const f = theme.font;

  const [books, setBooks] = useState<string[]>([]);
  const [selectedBook, setSelectedBook] = useState('');
  const [chapter, setChapter] = useState(1);
  const [verses, setVerses] = useState<BibleVerse[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<BibleVerse[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [bookPickerOpen, setBookPickerOpen] = useState(false);
  const [verseModal, setVerseModal] = useState<BibleVerse | null>(null);
  const [activeTab, setActiveTab] = useState<VerseTab>('verse');

  // Note form state
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // Sowders state
  const [sowdersText, setSowdersText] = useState('');
  const [sowdersLoading, setSowdersLoading] = useState(false);

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

  const openVerse = (v: BibleVerse) => {
    setVerseModal(v);
    setActiveTab('verse');
    setNoteTitle('');
    setNoteContent('');
    setSowdersText('');
  };

  const saveNote = async () => {
    if (!verseModal || !noteTitle.trim() || !noteContent.trim()) return;
    setSavingNote(true);
    try {
      const ref = `${verseModal.book} ${verseModal.chapter}:${verseModal.verse}`;
      await api.createNote({ title: noteTitle, content: noteContent, sourceType: 'bible', sourceRef: ref });
      Alert.alert('Saved', 'Note saved successfully.');
      setNoteTitle('');
      setNoteContent('');
      setActiveTab('verse');
    } catch {
      Alert.alert('Error', 'Could not save note. Check your connection.');
    } finally {
      setSavingNote(false);
    }
  };

  const loadSowders = useCallback(async () => {
    if (!verseModal || sowdersText || sowdersLoading) return;
    setSowdersLoading(true);
    try {
      const ref = `${verseModal.book} ${verseModal.chapter}:${verseModal.verse}`;
      const res = await api.chatSearch(`What did Brother Sowders teach about ${ref}?`);
      setSowdersText(res.data.answer);
    } catch {
      setSowdersText('Could not load teaching. Check your connection.');
    } finally {
      setSowdersLoading(false);
    }
  }, [verseModal, sowdersText, sowdersLoading]);

  useEffect(() => {
    if (activeTab === 'sowders') loadSowders();
  }, [activeTab]);

  const displayVerses = searchResults ?? verses;

  const tabStyle = (tab: VerseTab) => [
    styles.tab,
    { borderBottomColor: activeTab === tab ? c.primary : 'transparent', borderColor: c.border },
  ];
  const tabTextStyle = (tab: VerseTab) => [
    styles.tabText,
    { color: activeTab === tab ? c.primary : c.textMuted, fontSize: f.label },
  ];

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      {/* Search bar */}
      <View style={[styles.searchRow, { borderBottomColor: c.border }]}>
        <TextInput
          style={[styles.searchInput, { borderColor: c.border, backgroundColor: c.inputBg, color: c.textPrimary, fontSize: f.body }]}
          placeholder="Search the Bible…"
          placeholderTextColor={c.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={doSearch}
          returnKeyType="search"
        />
        <TouchableOpacity style={[styles.searchBtn, { backgroundColor: c.primary }]} onPress={doSearch}>
          <Text style={[styles.searchBtnText, { fontSize: f.label }]}>Search</Text>
        </TouchableOpacity>
        {searchResults && (
          <TouchableOpacity style={styles.clearBtn} onPress={clearSearch}>
            <Text style={[styles.clearBtnText, { color: c.textMuted }]}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Book + chapter nav */}
      {!searchResults && (
        <View style={[styles.nav, { borderBottomColor: c.border }]}>
          <TouchableOpacity style={[styles.bookBtn, { backgroundColor: theme.dark ? '#1a3a5c' : '#e3f2fd' }]} onPress={() => setBookPickerOpen(true)}>
            <Text style={[styles.bookBtnText, { color: c.primary, fontSize: f.body }]}>{selectedBook || 'Select Book'} ▼</Text>
          </TouchableOpacity>
          <View style={styles.chapterNav}>
            <TouchableOpacity style={[styles.chapterBtn, { backgroundColor: c.primary }, chapter <= 1 && styles.chapterBtnDisabled]} onPress={() => chapter > 1 && setChapter(ch => ch - 1)} disabled={chapter <= 1}>
              <Text style={styles.chapterBtnText}>‹</Text>
            </TouchableOpacity>
            <Text style={[styles.chapterLabel, { color: c.textPrimary, fontSize: f.body }]}>Ch. {chapter}</Text>
            <TouchableOpacity style={[styles.chapterBtn, { backgroundColor: c.primary }]} onPress={() => setChapter(ch => ch + 1)}>
              <Text style={styles.chapterBtnText}>›</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {searchResults && (
        <Text style={[styles.resultCount, { color: c.textMuted }]}>{searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{searchQuery}"</Text>
      )}

      {loading ? (
        <ActivityIndicator style={styles.center} size="large" color={c.primary} />
      ) : (
        <FlatList
          data={displayVerses}
          keyExtractor={v => String(v.id)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={[styles.empty, { color: c.textMuted }]}>No verses found.</Text>}
          renderItem={({ item: v }) => (
            <TouchableOpacity style={[styles.verseRow, { borderBottomColor: c.border }]} onPress={() => openVerse(v)}>
              <Text style={[styles.verseNum, { color: c.primary, fontSize: f.label }]}>
                {searchResults ? `${v.book} ${v.chapter}:${v.verse}` : v.verse}
              </Text>
              <Text style={[styles.verseText, { color: c.textPrimary, fontSize: f.verse }]}>{v.text}</Text>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Book picker modal */}
      <Modal visible={bookPickerOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setBookPickerOpen(false)}>
        <View style={[styles.pickerModal, { backgroundColor: c.background }]}>
          <View style={styles.pickerHeader}>
            <Text style={[styles.pickerTitle, { color: c.textPrimary }]}>Select Book</Text>
            <TouchableOpacity onPress={() => setBookPickerOpen(false)}>
              <Text style={[styles.pickerClose, { color: c.textMuted }]}>✕</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={books}
            keyExtractor={b => b}
            renderItem={({ item: b }) => (
              <TouchableOpacity
                style={[styles.bookItem, { borderBottomColor: c.border }, b === selectedBook && { backgroundColor: theme.dark ? '#1a3a5c' : '#e3f2fd' }]}
                onPress={() => { setSelectedBook(b); setChapter(1); setBookPickerOpen(false); }}
              >
                <Text style={[styles.bookItemText, { color: b === selectedBook ? c.primary : c.textPrimary, fontSize: f.body }]}>{b}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

      {/* Verse detail modal */}
      <Modal visible={!!verseModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setVerseModal(null)}>
        <View style={[styles.verseSheet, { backgroundColor: c.background }]}>
          {/* Header */}
          <View style={[styles.sheetHeader, { borderBottomColor: c.border }]}>
            <Text style={[styles.sheetRef, { color: c.primary, fontSize: f.heading }]}>
              {verseModal && `${verseModal.book} ${verseModal.chapter}:${verseModal.verse}`}
            </Text>
            <TouchableOpacity onPress={() => setVerseModal(null)}>
              <Text style={[styles.sheetClose, { color: c.textMuted }]}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={[styles.tabs, { borderBottomColor: c.border }]}>
            {(['verse', 'note', 'sowders'] as VerseTab[]).map(tab => (
              <TouchableOpacity key={tab} style={tabStyle(tab)} onPress={() => setActiveTab(tab)}>
                <Text style={tabTextStyle(tab)}>
                  {tab === 'verse' ? 'Verse' : tab === 'note' ? '+ Note' : "Bro. Sowders"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView contentContainerStyle={styles.sheetBody} keyboardShouldPersistTaps="handled">
            {activeTab === 'verse' && (
              <Text style={[styles.verseFullText, { color: c.textPrimary, fontSize: f.verse }]}>
                {verseModal?.text}
              </Text>
            )}

            {activeTab === 'note' && (
              <View style={styles.noteForm}>
                <Text style={[styles.noteLabel, { color: c.textSecondary, fontSize: f.label }]}>Title</Text>
                <TextInput
                  style={[styles.noteInput, { borderColor: c.border, backgroundColor: c.inputBg, color: c.textPrimary, fontSize: f.body }]}
                  value={noteTitle}
                  onChangeText={setNoteTitle}
                  placeholder="Note title…"
                  placeholderTextColor={c.textMuted}
                />
                <Text style={[styles.noteLabel, { color: c.textSecondary, fontSize: f.label, marginTop: 14 }]}>Note</Text>
                <TextInput
                  style={[styles.noteInput, styles.noteInputMulti, { borderColor: c.border, backgroundColor: c.inputBg, color: c.textPrimary, fontSize: f.body }]}
                  value={noteContent}
                  onChangeText={setNoteContent}
                  placeholder="Write your note…"
                  placeholderTextColor={c.textMuted}
                  multiline
                  textAlignVertical="top"
                />
                <TouchableOpacity
                  style={[styles.saveNoteBtn, { backgroundColor: c.primary }, (!noteTitle.trim() || !noteContent.trim() || savingNote) && styles.saveBtnDisabled]}
                  onPress={saveNote}
                  disabled={!noteTitle.trim() || !noteContent.trim() || savingNote}
                >
                  <Text style={styles.saveNoteBtnText}>{savingNote ? 'Saving…' : 'Save Note'}</Text>
                </TouchableOpacity>
              </View>
            )}

            {activeTab === 'sowders' && (
              <View>
                {sowdersLoading ? (
                  <ActivityIndicator style={{ marginTop: 40 }} color={c.primary} />
                ) : sowdersText ? (
                  <Text style={[styles.sowdersText, { color: c.textPrimary, fontSize: f.body }]}>{sowdersText}</Text>
                ) : null}
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchRow: { flexDirection: 'row', padding: 12, gap: 8, alignItems: 'center', borderBottomWidth: 1 },
  searchInput: { flex: 1, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  searchBtn: { borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  searchBtnText: { color: '#fff', fontWeight: '600' },
  clearBtn: { padding: 6 },
  clearBtnText: { fontSize: 16 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1 },
  bookBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  bookBtnText: { fontWeight: '600' },
  chapterNav: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  chapterBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  chapterBtnDisabled: { opacity: 0.4 },
  chapterBtnText: { color: '#fff', fontSize: 18 },
  chapterLabel: { fontWeight: '600', minWidth: 50, textAlign: 'center' },
  resultCount: { fontSize: 12, paddingHorizontal: 12, paddingVertical: 6 },
  center: { flex: 1 },
  list: { padding: 12 },
  verseRow: { flexDirection: 'row', gap: 10, paddingVertical: 10, borderBottomWidth: 1 },
  verseNum: { fontWeight: 'bold', minWidth: 24, marginTop: 2 },
  verseText: { flex: 1, lineHeight: 24 },
  empty: { textAlign: 'center', marginTop: 48 },
  pickerModal: { flex: 1, padding: 16 },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  pickerTitle: { fontSize: 18, fontWeight: 'bold' },
  pickerClose: { fontSize: 20 },
  bookItem: { paddingVertical: 14, paddingHorizontal: 8, borderBottomWidth: 1 },
  bookItemText: { fontWeight: '500' },
  verseSheet: { flex: 1 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  sheetRef: { fontWeight: 'bold' },
  sheetClose: { fontSize: 22 },
  tabs: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 3 },
  tabText: { fontWeight: '600' },
  sheetBody: { padding: 20, paddingBottom: 48 },
  verseFullText: { lineHeight: 30, fontStyle: 'italic' },
  noteForm: { gap: 4 },
  noteLabel: { fontWeight: '600', marginBottom: 6 },
  noteInput: { borderWidth: 1, borderRadius: 10, padding: 12 },
  noteInputMulti: { minHeight: 180, textAlignVertical: 'top', marginTop: 4 },
  saveNoteBtn: { marginTop: 20, borderRadius: 10, padding: 14, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.4 },
  saveNoteBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  sowdersText: { lineHeight: 26 },
});
