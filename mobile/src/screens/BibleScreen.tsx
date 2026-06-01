import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Modal, ScrollView, Alert,
} from 'react-native';
import type { BibleVerse } from '../types';
import * as api from '../api';
import { useDisplay } from '../context/DisplayContext';

type VerseTab = 'verse' | 'note' | 'sowders';

interface ExpandedState {
  verseId: number;
  tab: VerseTab;
  noteTitle: string;
  noteContent: string;
  savingNote: boolean;
  sowdersText: string;
  sowdersLoading: boolean;
}

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
  const [expanded, setExpanded] = useState<ExpandedState | null>(null);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    api.getBibleBooks().then(r => {
      setBooks(r.data);
      if (r.data.length) setSelectedBook(r.data[0]);
    });
  }, []);

  useEffect(() => {
    if (!selectedBook) return;
    setLoading(true);
    setExpanded(null);
    api.getBibleChapter(selectedBook, chapter)
      .then(r => setVerses(r.data))
      .catch(() => setVerses([]))
      .finally(() => setLoading(false));
  }, [selectedBook, chapter]);

  const doSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setExpanded(null);
    try {
      const res = await api.searchBible(searchQuery);
      setSearchResults(res.data);
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => { setSearchResults(null); setSearchQuery(''); setExpanded(null); };

  const toggleVerse = (v: BibleVerse) => {
    if (expanded?.verseId === v.id) {
      setExpanded(null);
    } else {
      setExpanded({ verseId: v.id, tab: 'verse', noteTitle: '', noteContent: '', savingNote: false, sowdersText: '', sowdersLoading: false });
    }
  };

  const setTab = (tab: VerseTab, verse: BibleVerse) => {
    setExpanded(e => e ? { ...e, tab } : null);
    if (tab === 'sowders' && !expanded?.sowdersText && !expanded?.sowdersLoading) {
      loadSowders(verse);
    }
  };

  const loadSowders = useCallback(async (verse: BibleVerse) => {
    setExpanded(e => e ? { ...e, sowdersLoading: true } : null);
    try {
      const res = await api.getScriptureTeaching(verse.book, verse.chapter, verse.verse);
      setExpanded(e => e ? { ...e, sowdersText: res.data.teaching, sowdersLoading: false } : null);
    } catch {
      setExpanded(e => e ? { ...e, sowdersText: 'Could not load. Check your connection.', sowdersLoading: false } : null);
    }
  }, []);

  const saveNote = async (verse: BibleVerse) => {
    if (!expanded?.noteTitle.trim() || !expanded?.noteContent.trim()) return;
    setExpanded(e => e ? { ...e, savingNote: true } : null);
    try {
      const ref = `${verse.book} ${verse.chapter}:${verse.verse}`;
      await api.createNote({ title: expanded.noteTitle, content: expanded.noteContent, sourceType: 'bible', sourceRef: ref });
      Alert.alert('Saved', 'Note saved.');
      setExpanded(e => e ? { ...e, noteTitle: '', noteContent: '', savingNote: false, tab: 'verse' } : null);
    } catch {
      Alert.alert('Error', 'Could not save note.');
      setExpanded(e => e ? { ...e, savingNote: false } : null);
    }
  };

  const displayVerses = searchResults ?? verses;

  const renderPanel = (verse: BibleVerse) => {
    if (!expanded || expanded.verseId !== verse.id) return null;
    const e = expanded;

    return (
      <View style={[styles.panel, { backgroundColor: theme.dark ? '#1a2a3a' : '#e8f0fe', borderColor: c.primary }]}>
        {/* Tabs */}
        <View style={[styles.panelTabs, { borderBottomColor: c.border }]}>
          {(['verse', 'note', 'sowders'] as VerseTab[]).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.panelTab, e.tab === tab && { borderBottomColor: c.primary, borderBottomWidth: 2 }]}
              onPress={() => setTab(tab, verse)}
            >
              <Text style={[styles.panelTabText, { color: e.tab === tab ? c.primary : c.textMuted, fontSize: f.label }]}>
                {tab === 'verse' ? 'Verse' : tab === 'note' ? '+ Note' : 'Bro. Sowders'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Verse tab */}
        {e.tab === 'verse' && (
          <Text style={[styles.panelVerseText, { color: c.textPrimary, fontSize: f.verse }]}>
            {verse.text}
          </Text>
        )}

        {/* Note tab */}
        {e.tab === 'note' && (
          <View style={styles.panelNoteForm}>
            <TextInput
              style={[styles.panelInput, { borderColor: c.border, backgroundColor: c.inputBg, color: c.textPrimary, fontSize: f.body }]}
              value={e.noteTitle}
              onChangeText={v => setExpanded(ex => ex ? { ...ex, noteTitle: v } : null)}
              placeholder="Note title…"
              placeholderTextColor={c.textMuted}
            />
            <TextInput
              style={[styles.panelInput, styles.panelInputMulti, { borderColor: c.border, backgroundColor: c.inputBg, color: c.textPrimary, fontSize: f.body }]}
              value={e.noteContent}
              onChangeText={v => setExpanded(ex => ex ? { ...ex, noteContent: v } : null)}
              placeholder="Write your note…"
              placeholderTextColor={c.textMuted}
              multiline
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={[styles.panelSaveBtn, { backgroundColor: c.primary }, (!e.noteTitle.trim() || !e.noteContent.trim() || e.savingNote) && { opacity: 0.4 }]}
              onPress={() => saveNote(verse)}
              disabled={!e.noteTitle.trim() || !e.noteContent.trim() || e.savingNote}
            >
              <Text style={[styles.panelSaveBtnText, { fontSize: f.body }]}>{e.savingNote ? 'Saving…' : 'Save Note'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Sowders tab */}
        {e.tab === 'sowders' && (
          <View style={styles.panelSowders}>
            {e.sowdersLoading
              ? <ActivityIndicator color={c.primary} style={{ marginVertical: 16 }} />
              : <Text style={[styles.panelSowdersText, { color: c.textPrimary, fontSize: f.body }]}>{e.sowdersText}</Text>
            }
          </View>
        )}
      </View>
    );
  };

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
            <TouchableOpacity
              style={[styles.chapterBtn, { backgroundColor: c.primary }, chapter <= 1 && { opacity: 0.3 }]}
              onPress={() => chapter > 1 && setChapter(ch => ch - 1)}
              disabled={chapter <= 1}
            >
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
        <Text style={[styles.resultCount, { color: c.textMuted }]}>
          {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{searchQuery}"
        </Text>
      )}

      {loading ? (
        <ActivityIndicator style={styles.center} size="large" color={c.primary} />
      ) : (
        <FlatList
          ref={listRef}
          data={displayVerses}
          keyExtractor={v => String(v.id)}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={<Text style={[styles.empty, { color: c.textMuted }]}>No verses found.</Text>}
          renderItem={({ item: v }) => {
            const isExpanded = expanded?.verseId === v.id;
            return (
              <View>
                <TouchableOpacity
                  style={[styles.verseRow, { borderBottomColor: isExpanded ? 'transparent' : c.border }, isExpanded && { backgroundColor: theme.dark ? '#1a2a3a' : '#e8f0fe' }]}
                  onPress={() => toggleVerse(v)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.verseNum, { color: c.primary, fontSize: f.label }]}>
                    {searchResults ? `${v.book} ${v.chapter}:${v.verse}` : v.verse}
                  </Text>
                  <Text style={[styles.verseText, { color: c.textPrimary, fontSize: f.verse }]}>{v.text}</Text>
                  <Text style={[styles.verseChevron, { color: c.textMuted }]}>{isExpanded ? '▲' : '▼'}</Text>
                </TouchableOpacity>
                {renderPanel(v)}
              </View>
            );
          }}
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
  chapterBtnText: { color: '#fff', fontSize: 18 },
  chapterLabel: { fontWeight: '600', minWidth: 50, textAlign: 'center' },
  resultCount: { fontSize: 12, paddingHorizontal: 12, paddingVertical: 6 },
  center: { flex: 1 },
  list: { paddingBottom: 40 },
  verseRow: { flexDirection: 'row', gap: 10, paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, alignItems: 'flex-start' },
  verseNum: { fontWeight: 'bold', minWidth: 28, marginTop: 2 },
  verseText: { flex: 1, lineHeight: 24 },
  verseChevron: { fontSize: 10, marginTop: 6 },
  empty: { textAlign: 'center', marginTop: 48 },
  // Inline panel
  panel: { marginHorizontal: 0, borderLeftWidth: 3, borderBottomWidth: 1, paddingBottom: 16 },
  panelTabs: { flexDirection: 'row', borderBottomWidth: 1, marginBottom: 12 },
  panelTab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  panelTabText: { fontWeight: '600' },
  panelVerseText: { paddingHorizontal: 16, lineHeight: 28, fontStyle: 'italic' },
  panelNoteForm: { paddingHorizontal: 12, gap: 8 },
  panelInput: { borderWidth: 1, borderRadius: 8, padding: 10 },
  panelInputMulti: { minHeight: 120, textAlignVertical: 'top' },
  panelSaveBtn: { borderRadius: 8, padding: 12, alignItems: 'center', marginTop: 4 },
  panelSaveBtnText: { color: '#fff', fontWeight: 'bold' },
  panelSowders: { paddingHorizontal: 16 },
  panelSowdersText: { lineHeight: 26 },
  // Book picker
  pickerModal: { flex: 1, padding: 16 },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  pickerTitle: { fontSize: 18, fontWeight: 'bold' },
  pickerClose: { fontSize: 20 },
  bookItem: { paddingVertical: 14, paddingHorizontal: 8, borderBottomWidth: 1 },
  bookItemText: { fontWeight: '500' },
});
