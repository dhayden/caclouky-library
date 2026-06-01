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

// ── Book metadata ─────────────────────────────────────────────────────────────

const OT_BOOKS = [
  'Genesis','Exodus','Leviticus','Numbers','Deuteronomy','Joshua','Judges','Ruth',
  '1 Samuel','2 Samuel','1 Kings','2 Kings','1 Chronicles','2 Chronicles',
  'Ezra','Nehemiah','Esther','Job','Psalms','Proverbs','Ecclesiastes',
  'Song of Solomon','Isaiah','Jeremiah','Lamentations','Ezekiel','Daniel',
  'Hosea','Joel','Amos','Obadiah','Jonah','Micah','Nahum','Habakkuk',
  'Zephaniah','Haggai','Zechariah','Malachi',
];

const NT_BOOKS = [
  'Matthew','Mark','Luke','John','Acts','Romans',
  '1 Corinthians','2 Corinthians','Galatians','Ephesians','Philippians',
  'Colossians','1 Thessalonians','2 Thessalonians','1 Timothy','2 Timothy',
  'Titus','Philemon','Hebrews','James','1 Peter','2 Peter',
  '1 John','2 John','3 John','Jude','Revelation',
];

const ABBREV: Record<string, string> = {
  'Genesis':'GEN','Exodus':'EXO','Leviticus':'LEV','Numbers':'NUM',
  'Deuteronomy':'DEU','Joshua':'JOS','Judges':'JDG','Ruth':'RTH',
  '1 Samuel':'1SA','2 Samuel':'2SA','1 Kings':'1KI','2 Kings':'2KI',
  '1 Chronicles':'1CH','2 Chronicles':'2CH','Ezra':'EZR','Nehemiah':'NEH',
  'Esther':'EST','Job':'JOB','Psalms':'PSA','Proverbs':'PRO',
  'Ecclesiastes':'ECC','Song of Solomon':'SOS','Isaiah':'ISA',
  'Jeremiah':'JER','Lamentations':'LAM','Ezekiel':'EZK','Daniel':'DAN',
  'Hosea':'HOS','Joel':'JOE','Amos':'AMO','Obadiah':'OBD','Jonah':'JON',
  'Micah':'MIC','Nahum':'NAH','Habakkuk':'HAB','Zephaniah':'ZEP',
  'Haggai':'HAG','Zechariah':'ZCH','Malachi':'MAL',
  'Matthew':'MAT','Mark':'MAR','Luke':'LUK','John':'JN','Acts':'ACT',
  'Romans':'ROM','1 Corinthians':'1CO','2 Corinthians':'2CO',
  'Galatians':'GAL','Ephesians':'EPH','Philippians':'PHI','Colossians':'COL',
  '1 Thessalonians':'1TH','2 Thessalonians':'2TH','1 Timothy':'1TI',
  '2 Timothy':'2TI','Titus':'TIT','Philemon':'PHM','Hebrews':'HEB',
  'James':'JAM','1 Peter':'1PE','2 Peter':'2PE','1 John':'1JN',
  '2 John':'2JN','3 John':'3JN','Jude':'JUD','Revelation':'REV',
};

const CHAPTER_COUNTS: Record<string, number> = {
  'Genesis':50,'Exodus':40,'Leviticus':27,'Numbers':36,'Deuteronomy':34,
  'Joshua':24,'Judges':21,'Ruth':4,'1 Samuel':31,'2 Samuel':24,
  '1 Kings':22,'2 Kings':25,'1 Chronicles':29,'2 Chronicles':36,
  'Ezra':10,'Nehemiah':13,'Esther':10,'Job':42,'Psalms':150,
  'Proverbs':31,'Ecclesiastes':12,'Song of Solomon':8,'Isaiah':66,
  'Jeremiah':52,'Lamentations':5,'Ezekiel':48,'Daniel':12,'Hosea':14,
  'Joel':3,'Amos':9,'Obadiah':1,'Jonah':4,'Micah':7,'Nahum':3,
  'Habakkuk':3,'Zephaniah':3,'Haggai':2,'Zechariah':14,'Malachi':4,
  'Matthew':28,'Mark':16,'Luke':24,'John':21,'Acts':28,'Romans':16,
  '1 Corinthians':16,'2 Corinthians':13,'Galatians':6,'Ephesians':6,
  'Philippians':4,'Colossians':4,'1 Thessalonians':5,'2 Thessalonians':3,
  '1 Timothy':6,'2 Timothy':4,'Titus':3,'Philemon':1,'Hebrews':13,
  'James':5,'1 Peter':5,'2 Peter':3,'1 John':5,'2 John':1,
  '3 John':1,'Jude':1,'Revelation':22,
};

// ── Verse Chooser component ───────────────────────────────────────────────────

interface VerseChooserProps {
  visible: boolean;
  selectedBook: string;
  chapter: number;
  verseCount: number;
  onNavigate: (book: string, chapter: number, verse?: number) => void;
  onClose: () => void;
}

function VerseChooser({ visible, selectedBook, chapter, verseCount, onNavigate, onClose }: VerseChooserProps) {
  const [pickerBook, setPickerBook] = useState(selectedBook);
  const [pickerChapter, setPickerChapter] = useState(chapter);
  const [pickerVerse, setPickerVerse] = useState(1);
  const [goToText, setGoToText] = useState('');

  useEffect(() => {
    if (visible) {
      setPickerBook(selectedBook);
      setPickerChapter(chapter);
      setPickerVerse(1);
      setGoToText('');
    }
  }, [visible, selectedBook, chapter]);

  const maxChapter = CHAPTER_COUNTS[pickerBook] ?? 1;
  const currentVerseCount = pickerBook === selectedBook && pickerChapter === chapter ? verseCount : 999;

  const selectBook = (book: string) => {
    setPickerBook(book);
    setPickerChapter(1);
    setPickerVerse(1);
  };

  const go = () => {
    onNavigate(pickerBook, pickerChapter, pickerVerse);
    onClose();
  };

  const handleGoTo = () => {
    const text = goToText.trim();
    if (!text) return;
    // Parse "3:16" or "John 3:16" or "John 3"
    const match = text.match(/^(?:(.+?)\s+)?(\d+)(?::(\d+))?$/);
    if (!match) return;
    const book = match[1] ? match[1] : pickerBook;
    const ch = parseInt(match[2]);
    const v = match[3] ? parseInt(match[3]) : 1;
    const found = [...OT_BOOKS, ...NT_BOOKS].find(b =>
      b.toLowerCase().startsWith(book.toLowerCase()) ||
      (ABBREV[b] ?? '').toLowerCase() === book.toLowerCase()
    );
    onNavigate(found ?? pickerBook, ch, v);
    onClose();
  };

  const renderBookGrid = (bookList: string[], color: string) => (
    <View style={chooserStyles.grid}>
      {bookList.map(book => {
        const isSelected = book === pickerBook;
        return (
          <TouchableOpacity key={book} style={chooserStyles.bookCell} onPress={() => selectBook(book)}>
            <Text style={[chooserStyles.bookAbbrev, { color: isSelected ? '#4caf50' : color }]}>
              {ABBREV[book] ?? book.slice(0, 3).toUpperCase()}
            </Text>
            {isSelected && <View style={chooserStyles.selectedUnderline} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={chooserStyles.container}>
        {/* Header */}
        <View style={chooserStyles.header}>
          <Text style={chooserStyles.headerTitle}>Verse Chooser</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={chooserStyles.headerClose}>✕</Text>
          </TouchableOpacity>
        </View>

        <Text style={chooserStyles.currentBook}>{pickerBook}</Text>

        {/* Chapter / Verse pickers */}
        <View style={chooserStyles.pickerRow}>
          <View style={chooserStyles.pickerBox}>
            <TouchableOpacity onPress={() => setPickerChapter(ch => Math.max(1, ch - 1))}>
              <Text style={chooserStyles.pickerArrow}>‹</Text>
            </TouchableOpacity>
            <Text style={chooserStyles.pickerLabel}>CHAPTER: <Text style={chooserStyles.pickerValue}>{pickerChapter}</Text></Text>
            <TouchableOpacity onPress={() => setPickerChapter(ch => Math.min(maxChapter, ch + 1))}>
              <Text style={chooserStyles.pickerArrow}>›</Text>
            </TouchableOpacity>
          </View>
          <View style={chooserStyles.pickerBox}>
            <TouchableOpacity onPress={() => setPickerVerse(v => Math.max(1, v - 1))}>
              <Text style={chooserStyles.pickerArrow}>‹</Text>
            </TouchableOpacity>
            <Text style={chooserStyles.pickerLabel}>VERSE: <Text style={chooserStyles.pickerValue}>{pickerVerse}</Text></Text>
            <TouchableOpacity onPress={() => setPickerVerse(v => v + 1)}>
              <Text style={chooserStyles.pickerArrow}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Go to verse */}
        <View style={chooserStyles.goToRow}>
          <TextInput
            style={chooserStyles.goToInput}
            placeholder="Go To Verse  e.g. Acts 2:38"
            placeholderTextColor="#666"
            value={goToText}
            onChangeText={setGoToText}
            onSubmitEditing={handleGoTo}
            returnKeyType="go"
          />
          <TouchableOpacity style={chooserStyles.goToBtn} onPress={handleGoTo}>
            <Text style={chooserStyles.goToBtnText}>→</Text>
          </TouchableOpacity>
        </View>

        {/* Go button */}
        <TouchableOpacity style={chooserStyles.navigateBtn} onPress={go}>
          <Text style={chooserStyles.navigateBtnText}>Go to {ABBREV[pickerBook] ?? pickerBook} {pickerChapter}:{pickerVerse}</Text>
        </TouchableOpacity>

        {/* Book grid */}
        <ScrollView style={chooserStyles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={chooserStyles.testament}>Old Testament</Text>
          {renderBookGrid(OT_BOOKS, '#ff9800')}
          <View style={chooserStyles.divider} />
          <Text style={chooserStyles.testament}>New Testament</Text>
          {renderBookGrid(NT_BOOKS, '#9c27b0')}
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const chooserStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#12122a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 20 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  headerClose: { fontSize: 22, color: '#888' },
  currentBook: { fontSize: 14, color: '#aaa', paddingHorizontal: 16, marginBottom: 12 },
  pickerRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 12, marginBottom: 12 },
  pickerBox: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1e1e3a', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12 },
  pickerArrow: { color: '#4caf50', fontSize: 22, fontWeight: 'bold' },
  pickerLabel: { fontSize: 12, fontWeight: '700', color: '#aaa', letterSpacing: 0.5 },
  pickerValue: { color: '#fff' },
  goToRow: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 10, gap: 8 },
  goToInput: { flex: 1, backgroundColor: '#1e1e3a', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, color: '#fff', fontSize: 14 },
  goToBtn: { backgroundColor: '#4caf50', borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center' },
  goToBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  navigateBtn: { marginHorizontal: 16, marginBottom: 16, backgroundColor: '#1e1e3a', borderRadius: 8, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#4caf50' },
  navigateBtnText: { color: '#4caf50', fontWeight: '700', fontSize: 14 },
  scroll: { flex: 1, paddingHorizontal: 16 },
  testament: { fontSize: 13, fontWeight: '700', color: '#aaa', marginBottom: 12, marginTop: 4 },
  divider: { height: 1, backgroundColor: '#2a2a4a', marginVertical: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 4 },
  bookCell: { width: '13%', alignItems: 'center', paddingVertical: 10 },
  bookAbbrev: { fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },
  selectedUnderline: { height: 2, width: '100%', backgroundColor: '#4caf50', marginTop: 2 },
});

// ── Main BibleScreen ──────────────────────────────────────────────────────────

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
  const [chooserOpen, setChooserOpen] = useState(false);
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

  const handleNavigate = (book: string, ch: number, verse?: number) => {
    setSelectedBook(book);
    setChapter(ch);
    setExpanded(null);
    if (verse && verse > 1) {
      // Scroll to verse after load
      setTimeout(() => {
        listRef.current?.scrollToIndex({ index: Math.max(0, verse - 2), animated: true });
      }, 600);
    }
  };

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

        {e.tab === 'verse' && (
          <Text style={[styles.panelVerseText, { color: c.textPrimary, fontSize: f.verse }]}>{verse.text}</Text>
        )}

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

      {/* Nav bar */}
      {!searchResults && (
        <View style={[styles.nav, { borderBottomColor: c.border }]}>
          <TouchableOpacity style={[styles.bookBtn, { backgroundColor: theme.dark ? '#1a3a5c' : '#e3f2fd' }]} onPress={() => setChooserOpen(true)}>
            <Text style={[styles.bookBtnText, { color: c.primary, fontSize: f.body }]}>
              {ABBREV[selectedBook] ?? selectedBook} ▼
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.bookFullBtn]} onPress={() => setChooserOpen(true)}>
            <Text style={[styles.bookFullText, { color: c.textSecondary, fontSize: f.label }]} numberOfLines={1}>
              {selectedBook}
            </Text>
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
            <TouchableOpacity
              style={[styles.chapterBtn, { backgroundColor: c.primary }, chapter >= (CHAPTER_COUNTS[selectedBook] ?? 999) && { opacity: 0.3 }]}
              onPress={() => setChapter(ch => ch + 1)}
              disabled={chapter >= (CHAPTER_COUNTS[selectedBook] ?? 999)}
            >
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
          onScrollToIndexFailed={() => {}}
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

      <VerseChooser
        visible={chooserOpen}
        selectedBook={selectedBook}
        chapter={chapter}
        verseCount={verses.length}
        onNavigate={handleNavigate}
        onClose={() => setChooserOpen(false)}
      />
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
  nav: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, gap: 8 },
  bookBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  bookBtnText: { fontWeight: '800' },
  bookFullBtn: { flex: 1 },
  bookFullText: { fontStyle: 'italic' },
  chapterNav: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  chapterBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  chapterBtnText: { color: '#fff', fontSize: 18 },
  chapterLabel: { fontWeight: '600', minWidth: 46, textAlign: 'center' },
  resultCount: { fontSize: 12, paddingHorizontal: 12, paddingVertical: 6 },
  center: { flex: 1 },
  list: { paddingBottom: 40 },
  verseRow: { flexDirection: 'row', gap: 10, paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, alignItems: 'flex-start' },
  verseNum: { fontWeight: 'bold', minWidth: 28, marginTop: 2 },
  verseText: { flex: 1, lineHeight: 24 },
  verseChevron: { fontSize: 10, marginTop: 6 },
  empty: { textAlign: 'center', marginTop: 48 },
  panel: { borderLeftWidth: 3, borderBottomWidth: 1, paddingBottom: 16 },
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
});
