import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Modal, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import type { BibleVerse, UserNote, ScriptureRef } from '../types';
import * as api from '../api';
import { useDisplay } from '../context/DisplayContext';

type VerseTab = 'verse' | 'note' | 'sowders';

interface ExpandedState {
  verseId: number;
  tab: VerseTab;
  noteTitle: string;
  noteContent: string;
  editNoteId: number | null;
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

type ChooserMode = 'book' | 'chapter' | 'verse';

interface VerseChooserProps {
  visible: boolean;
  selectedBook: string;
  chapter: number;
  onNavigate: (book: string, chapter: number, verse: number) => void;
  onClose: () => void;
}

function NumberGrid({ count, selected, onSelect }: { count: number; selected: number; onSelect: (n: number) => void }) {
  const nums = Array.from({ length: count }, (_, i) => i + 1);
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={chooserStyles.numGrid}>
      {nums.map(n => (
        <TouchableOpacity key={n} style={chooserStyles.numCell} onPress={() => onSelect(n)}>
          <Text style={[chooserStyles.numText, n === selected && chooserStyles.numTextSelected]}>{n}</Text>
          {n === selected && <View style={chooserStyles.numUnderline} />}
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

function VerseChooser({ visible, selectedBook, chapter, onNavigate, onClose }: VerseChooserProps) {
  const [mode, setMode] = useState<ChooserMode>('book');
  const [pickerBook, setPickerBook] = useState(selectedBook);
  const [pickerChapter, setPickerChapter] = useState(chapter);
  const [verseCount, setVerseCount] = useState(1);
  const [loadingVerses, setLoadingVerses] = useState(false);

  useEffect(() => {
    if (visible) {
      setMode('book');
      setPickerBook(selectedBook);
      setPickerChapter(chapter);
    }
  }, [visible]);

  const selectBook = (book: string) => {
    setPickerBook(book);
    setPickerChapter(1);
    setMode('chapter');
  };

  const selectChapter = async (ch: number) => {
    setPickerChapter(ch);
    setLoadingVerses(true);
    setMode('verse');
    try {
      const res = await api.getBibleChapter(pickerBook, ch);
      setVerseCount(res.data.length || 1);
    } catch {
      setVerseCount(30);
    } finally {
      setLoadingVerses(false);
    }
  };

  const selectVerse = (v: number) => {
    onNavigate(pickerBook, pickerChapter, v);
    onClose();
  };

  const goBack = () => {
    if (mode === 'verse') setMode('chapter');
    else if (mode === 'chapter') setMode('book');
    else onClose();
  };

  const maxChapters = CHAPTER_COUNTS[pickerBook] ?? 1;

  const headerLabel = mode === 'book'
    ? 'Select Book'
    : mode === 'chapter'
    ? pickerBook
    : `${pickerBook}  ${pickerChapter}`;

  const renderBookGrid = (bookList: string[], color: string) => (
    <View style={chooserStyles.bookGrid}>
      {bookList.map(book => {
        const isSelected = book === pickerBook;
        return (
          <TouchableOpacity key={book} style={chooserStyles.bookCell} onPress={() => selectBook(book)}>
            <Text style={[chooserStyles.bookAbbrev, { color: isSelected ? '#4caf50' : color }]}>
              {ABBREV[book] ?? book.slice(0, 3).toUpperCase()}
            </Text>
            {isSelected && <View style={chooserStyles.numUnderline} />}
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
          <TouchableOpacity style={chooserStyles.backBtn} onPress={goBack}>
            <Text style={chooserStyles.backBtnText}>{mode === 'book' ? '✕' : '‹'}</Text>
          </TouchableOpacity>
          <Text style={chooserStyles.headerTitle}>{headerLabel}</Text>
          {mode !== 'book' && (
            <TouchableOpacity onPress={onClose}>
              <Text style={chooserStyles.headerClose}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Sub-label */}
        <View style={chooserStyles.subHeader}>
          <Text style={chooserStyles.subLabel}>
            {mode === 'book' ? 'Choose a book' : mode === 'chapter' ? 'Choose a chapter' : 'Choose a verse'}
          </Text>
        </View>

        {/* Book mode */}
        {mode === 'book' && (
          <ScrollView style={chooserStyles.scroll} showsVerticalScrollIndicator={false}>
            <Text style={chooserStyles.testament}>Old Testament</Text>
            {renderBookGrid(OT_BOOKS, '#ff9800')}
            <View style={chooserStyles.divider} />
            <Text style={chooserStyles.testament}>New Testament</Text>
            {renderBookGrid(NT_BOOKS, '#9c27b0')}
            <View style={{ height: 40 }} />
          </ScrollView>
        )}

        {/* Chapter mode */}
        {mode === 'chapter' && (
          <NumberGrid count={maxChapters} selected={pickerChapter} onSelect={selectChapter} />
        )}

        {/* Verse mode */}
        {mode === 'verse' && (
          loadingVerses
            ? <ActivityIndicator style={{ marginTop: 60 }} size="large" color="#4caf50" />
            : <NumberGrid count={verseCount} selected={1} onSelect={selectVerse} />
        )}
      </View>
    </Modal>
  );
}

const chooserStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#12122a' },
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a3a1a', paddingHorizontal: 16, paddingVertical: 14, paddingTop: 20, gap: 10 },
  backBtn: { width: 32 },
  backBtnText: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: 'bold', color: '#fff' },
  headerClose: { fontSize: 20, color: '#aaa' },
  subHeader: { backgroundColor: '#12122a', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#2a2a4a' },
  subLabel: { fontSize: 12, color: '#666', textTransform: 'uppercase', letterSpacing: 1 },
  scroll: { flex: 1, paddingHorizontal: 16 },
  testament: { fontSize: 13, fontWeight: '700', color: '#aaa', marginBottom: 12, marginTop: 16 },
  divider: { height: 1, backgroundColor: '#2a2a4a', marginVertical: 8 },
  bookGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  bookCell: { width: '14.28%', alignItems: 'center', paddingVertical: 14 },
  bookAbbrev: { fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },
  // Number grid
  numGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8, paddingTop: 8, paddingBottom: 40 },
  numCell: { width: '14.28%', alignItems: 'center', paddingVertical: 18 },
  numText: { fontSize: 18, color: '#fff', fontWeight: '400' },
  numTextSelected: { fontWeight: 'bold', color: '#fff' },
  numUnderline: { height: 3, width: 28, backgroundColor: '#4caf50', marginTop: 4, borderRadius: 2 },
});

// ── Highlight colours ─────────────────────────────────────────────────────────

const HIGHLIGHT_COLORS = [
  { color: '#ffd600', label: 'Yellow' },
  { color: '#69f0ae', label: 'Green'  },
  { color: '#40c4ff', label: 'Blue'   },
  { color: '#f48fb1', label: 'Pink'   },
  { color: '#e040fb', label: 'Purple' },
];

// ── Inline scripture ref parsing for Sowders viewer ──────────────────────────

const KNOWN_BOOK_WORDS = new Set(
  [...OT_BOOKS, ...NT_BOOKS, 'Psalm'].flatMap(b => b.split(' '))
);

type InlineSeg = { type: 'text'; value: string } | { type: 'ref'; value: string; ref: ScriptureRef };

function parseInlineRefs(text: string): InlineSeg[] {
  const pat = /\b((?:[123]\s)?[A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s+(\d+)(?::(\d+)(?:-(\d+))?)?/g;
  const segs: InlineSeg[] = [];
  let last = 0; let m: RegExpExecArray | null;
  while ((m = pat.exec(text)) !== null) {
    const bookName = m[1].trim();
    const lastWord = bookName.split(' ').pop() ?? '';
    if (!KNOWN_BOOK_WORDS.has(lastWord)) continue;
    if (m.index > last) segs.push({ type: 'text', value: text.slice(last, m.index) });
    const chapter = parseInt(m[2]);
    const vStart = m[3] ? parseInt(m[3]) : 1;
    const vEnd = m[4] ? parseInt(m[4]) : vStart;
    const reference = m[3]
      ? (vStart === vEnd ? `${bookName} ${chapter}:${vStart}` : `${bookName} ${chapter}:${vStart}-${vEnd}`)
      : `${bookName} ${chapter}`;
    segs.push({ type: 'ref', value: m[0], ref: { reference, book: bookName, chapter, verseStart: vStart, verseEnd: vEnd } });
    last = m.index + m[0].length;
  }
  if (last < text.length) segs.push({ type: 'text', value: text.slice(last) });
  return segs;
}

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

  // Highlights + notes
  const [highlights, setHighlights] = useState<Record<string, { id: number; color: string }>>({});
  const [notedNotes, setNotedNotes] = useState<Record<string, UserNote>>({});
  const [highlightTarget, setHighlightTarget] = useState<BibleVerse | null>(null);
  const [toast, setToast] = useState<{ msg: string; error?: boolean } | null>(null);
  const [sowdersViewer, setSowdersViewer] = useState<{ label: string; content: string } | null>(null);
  const [sowdersHighlightTarget, setSowdersHighlightTarget] = useState<string | null>(null);
  const [scripturePopup, setScripturePopup] = useState<{ ref: ScriptureRef; verses: BibleVerse[] } | null>(null);

  const showToast = (msg: string, error = false) => {
    setToast({ msg, error });
    setTimeout(() => setToast(null), 2500);
  };

  const verseRef = (v: BibleVerse) => `${v.book} ${v.chapter}:${v.verse}`;

  // Load all bible highlights + note refs once on mount
  useEffect(() => {
    api.getHighlights('bible').then(r => {
      const map: Record<string, { id: number; color: string }> = {};
      r.data.forEach(h => { map[h.sourceRef] = { id: h.id, color: h.color }; });
      setHighlights(map);
    }).catch(() => {});

    api.getNotes().then(r => {
      const map: Record<string, UserNote> = {};
      r.data.filter(n => n.sourceType === 'bible' && n.sourceRef)
            .forEach(n => { map[n.sourceRef!] = n; });
      setNotedNotes(map);
    }).catch(() => {});
  }, []);

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
      setTimeout(() => {
        listRef.current?.scrollToIndex({ index: Math.max(0, verse - 2), animated: true });
      }, 600);
    }
  };

  const toggleVerse = (v: BibleVerse) => {
    if (expanded?.verseId === v.id) setExpanded(null);
    else setExpanded({ verseId: v.id, tab: 'verse', noteTitle: '', noteContent: '', editNoteId: null, savingNote: false, sowdersText: '', sowdersLoading: false });
  };

  const setTab = (tab: VerseTab, verse: BibleVerse) => {
    if (tab === 'note') {
      const ref = verseRef(verse);
      const existing = notedNotes[ref];
      setExpanded(e => e ? { ...e, tab: 'note',
        noteTitle: existing?.title ?? '',
        noteContent: existing?.content ?? '',
        editNoteId: existing?.id ?? null,
      } : null);
    } else {
      setExpanded(e => e ? { ...e, tab } : null);
      if (tab === 'sowders' && !expanded?.sowdersText && !expanded?.sowdersLoading) loadSowders(verse);
    }
  };

  const parseSections = (text: string): { label: string; content: string }[] =>
    text.split('\n\n---\n\n')
      .map(block => {
        const m = block.match(/^\[(.+?)\]\n([\s\S]*)/);
        return m ? { label: m[1], content: m[2].trim() } : { label: 'Teaching', content: block.trim() };
      })
      .filter(s => s.content.length > 20);

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
      const ref = verseRef(verse);
      const data = { title: expanded.noteTitle, content: expanded.noteContent, sourceType: 'bible', sourceRef: ref };
      const saved = expanded.editNoteId
        ? (await api.updateNote(expanded.editNoteId, data)).data
        : (await api.createNote(data)).data;
      setNotedNotes(prev => ({ ...prev, [ref]: saved }));
      showToast('Note saved.');
      setExpanded(e => e ? { ...e, noteTitle: '', noteContent: '', editNoteId: null, savingNote: false, tab: 'verse' } : null);
    } catch {
      showToast('Could not save note.', true);
      setExpanded(e => e ? { ...e, savingNote: false } : null);
    }
  };

  const applyHighlight = async (color: string) => {
    if (!highlightTarget) return;
    const ref = verseRef(highlightTarget);
    const existing = highlights[ref];
    try {
      if (existing) await api.deleteHighlight(existing.id);
      const res = await api.createHighlight('bible', ref, highlightTarget.text, color);
      setHighlights(prev => ({ ...prev, [ref]: { id: res.data.id, color } }));
    } catch { showToast('Could not save highlight.', true); }
    setHighlightTarget(null);
  };

  const openScriptureInViewer = async (ref: ScriptureRef) => {
    try {
      const res = await api.getBibleVerses(ref.book, ref.chapter, ref.verseStart, ref.verseEnd);
      setScripturePopup({ ref, verses: res.data });
    } catch {
      setScripturePopup({ ref, verses: [] });
    }
  };

  const removeHighlight = async () => {
    if (!highlightTarget) return;
    const ref = verseRef(highlightTarget);
    const existing = highlights[ref];
    if (!existing) { setHighlightTarget(null); return; }
    try {
      await api.deleteHighlight(existing.id);
      setHighlights(prev => { const n = { ...prev }; delete n[ref]; return n; });
    } catch { showToast('Could not remove highlight.', true); }
    setHighlightTarget(null);
  };

  const displayVerses = searchResults ?? verses;

  const renderPanel = (verse: BibleVerse) => {
    if (!expanded || expanded.verseId !== verse.id) return null;
    const e = expanded;
    return (
      <View style={[styles.panel, { backgroundColor: theme.dark ? '#1a2a3a' : '#e8f0fe', borderColor: c.primary }]}>
        <View style={[styles.panelTabs, { borderBottomColor: c.border }]}>
          {(['verse', 'note', 'sowders'] as VerseTab[]).map(tab => (
            <TouchableOpacity key={tab} style={[styles.panelTab, e.tab === tab && { borderBottomColor: c.primary, borderBottomWidth: 2 }]} onPress={() => setTab(tab, verse)}>
              <Text style={[styles.panelTabText, { color: e.tab === tab ? c.primary : c.textMuted, fontSize: f.label }]}>
                {tab === 'verse' ? 'Verse' : tab === 'note' ? (e.editNoteId ? 'Edit Note' : '+ Note') : 'Bro. Sowders'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {e.tab === 'verse' && <Text style={[styles.panelVerseText, { color: c.textPrimary, fontSize: f.verse }]}>{verse.text}</Text>}
        {e.tab === 'note' && (
          <View style={styles.panelNoteForm}>
            <TextInput style={[styles.panelInput, { borderColor: c.border, backgroundColor: c.inputBg, color: c.textPrimary, fontSize: f.body }]} value={e.noteTitle} onChangeText={v => setExpanded(ex => ex ? { ...ex, noteTitle: v } : null)} placeholder="Note title…" placeholderTextColor={c.textMuted} />
            <TextInput style={[styles.panelInput, styles.panelInputMulti, { borderColor: c.border, backgroundColor: c.inputBg, color: c.textPrimary, fontSize: f.body }]} value={e.noteContent} onChangeText={v => setExpanded(ex => ex ? { ...ex, noteContent: v } : null)} placeholder="Write your note…" placeholderTextColor={c.textMuted} multiline textAlignVertical="top" />
            <TouchableOpacity style={[styles.panelSaveBtn, { backgroundColor: c.primary }, (!e.noteTitle.trim() || !e.noteContent.trim() || e.savingNote) && { opacity: 0.4 }]} onPress={() => saveNote(verse)} disabled={!e.noteTitle.trim() || !e.noteContent.trim() || e.savingNote}>
              <Text style={[styles.panelSaveBtnText, { fontSize: f.body }]}>{e.savingNote ? 'Saving…' : 'Save Note'}</Text>
            </TouchableOpacity>
          </View>
        )}
        {e.tab === 'sowders' && (
          <View style={styles.panelSowders}>
            {e.sowdersLoading
              ? <ActivityIndicator color={c.primary} style={{ marginVertical: 16 }} />
              : e.sowdersText.length === 0
              ? <Text style={[styles.panelSowdersText, { color: c.textMuted, fontSize: f.body }]}>No teaching found.</Text>
              : parseSections(e.sowdersText).map((sec, i) => (
                  <TouchableOpacity key={i} style={[styles.sowdersLink, { borderBottomColor: c.border }]} onPress={() => setSowdersViewer(sec)}>
                    <Text style={[styles.sowdersLinkText, { color: c.primary, fontSize: f.body }]}>{sec.label}</Text>
                    <Text style={[styles.sowdersLinkArrow, { color: c.textMuted }]}>›</Text>
                  </TouchableOpacity>
                ))
            }
          </View>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: c.background }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={90}>
      {/* Toast */}
      {toast && (
        <View style={[styles.toast, { backgroundColor: toast.error ? '#B71C1C' : '#1A1A2E' }]}>
          <Text style={styles.toastText}>{toast.msg}</Text>
        </View>
      )}

      {/* Search bar */}
      <View style={[styles.searchRow, { borderBottomColor: c.border }]}>
        <TextInput style={[styles.searchInput, { borderColor: c.border, backgroundColor: c.inputBg, color: c.textPrimary, fontSize: f.body }]} placeholder="Search the Bible…" placeholderTextColor={c.textMuted} value={searchQuery} onChangeText={setSearchQuery} onSubmitEditing={doSearch} returnKeyType="search" />
        <TouchableOpacity style={[styles.searchBtn, { backgroundColor: c.primary }]} onPress={doSearch}>
          <Text style={[styles.searchBtnText, { fontSize: f.label }]}>Search</Text>
        </TouchableOpacity>
        {searchResults && <TouchableOpacity style={styles.clearBtn} onPress={clearSearch}><Text style={[styles.clearBtnText, { color: c.textMuted }]}>✕</Text></TouchableOpacity>}
      </View>

      {/* Nav bar */}
      {!searchResults && (
        <View style={[styles.nav, { borderBottomColor: c.border }]}>
          <TouchableOpacity style={[styles.bookBtn, { backgroundColor: theme.dark ? '#1a3a5c' : '#e3f2fd' }]} onPress={() => setChooserOpen(true)}>
            <Text style={[styles.bookBtnText, { color: c.primary, fontSize: f.body }]}>{ABBREV[selectedBook] ?? selectedBook} ▼</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bookFullBtn} onPress={() => setChooserOpen(true)}>
            <Text style={[styles.bookFullText, { color: c.textSecondary, fontSize: f.label }]} numberOfLines={1}>{selectedBook}</Text>
          </TouchableOpacity>
          <View style={styles.chapterNav}>
            <TouchableOpacity style={[styles.chapterBtn, { backgroundColor: c.primary }, chapter <= 1 && { opacity: 0.3 }]} onPress={() => chapter > 1 && setChapter(ch => ch - 1)} disabled={chapter <= 1}>
              <Text style={styles.chapterBtnText}>‹</Text>
            </TouchableOpacity>
            <Text style={[styles.chapterLabel, { color: c.textPrimary, fontSize: f.body }]}>Ch. {chapter}</Text>
            <TouchableOpacity style={[styles.chapterBtn, { backgroundColor: c.primary }, chapter >= (CHAPTER_COUNTS[selectedBook] ?? 999) && { opacity: 0.3 }]} onPress={() => setChapter(ch => ch + 1)} disabled={chapter >= (CHAPTER_COUNTS[selectedBook] ?? 999)}>
              <Text style={styles.chapterBtnText}>›</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {searchResults && <Text style={[styles.resultCount, { color: c.textMuted }]}>{searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{searchQuery}"</Text>}

      {loading ? <ActivityIndicator style={styles.center} size="large" color={c.primary} /> : (
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
            const ref = verseRef(v);
            const highlight = highlights[ref];
            const hasNote = ref in notedNotes;
            return (
              <View>
                <TouchableOpacity
                  style={[
                    styles.verseRow,
                    { borderBottomColor: isExpanded ? 'transparent' : c.border },
                    highlight && { backgroundColor: highlight.color + '38' },
                    isExpanded && !highlight && { backgroundColor: theme.dark ? '#1a2a3a' : '#e8f0fe' },
                  ]}
                  onPress={() => toggleVerse(v)}
                  onLongPress={() => setHighlightTarget(v)}
                  delayLongPress={400}
                  activeOpacity={0.7}
                >
                  {highlight && <View style={[styles.highlightBar, { backgroundColor: highlight.color }]} />}
                  <View style={styles.verseNumCol}>
                    <Text style={[styles.verseNum, { color: c.primary, fontSize: f.label }]}>
                      {searchResults ? `${v.book} ${v.chapter}:${v.verse}` : v.verse}
                    </Text>
                    {hasNote && <Text style={styles.noteIcon}>📝</Text>}
                  </View>
                  <Text style={[styles.verseText, { color: c.textPrimary, fontSize: f.verse }]}>{v.text}</Text>
                  <Text style={[styles.verseChevron, { color: c.textMuted }]}>{isExpanded ? '▲' : '▼'}</Text>
                </TouchableOpacity>
                {renderPanel(v)}
              </View>
            );
          }}
        />
      )}

      {/* Highlight picker modal */}
      <Modal visible={!!highlightTarget} transparent animationType="fade" onRequestClose={() => setHighlightTarget(null)}>
        <TouchableOpacity style={styles.hlOverlay} activeOpacity={1} onPress={() => setHighlightTarget(null)}>
          <View style={[styles.hlSheet, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[styles.hlTitle, { color: c.textPrimary }]}>
              {highlightTarget ? verseRef(highlightTarget) : ''}
            </Text>
            <View style={styles.hlColors}>
              {HIGHLIGHT_COLORS.map(({ color, label }) => (
                <TouchableOpacity key={color} style={[styles.hlSwatch, { backgroundColor: color }, highlights[highlightTarget ? verseRef(highlightTarget) : '']?.color === color && styles.hlSwatchSelected]} onPress={() => applyHighlight(color)}>
                  <Text style={styles.hlSwatchLabel}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {highlightTarget && highlights[verseRef(highlightTarget)] && (
              <TouchableOpacity style={[styles.hlRemove, { borderColor: c.border }]} onPress={removeHighlight}>
                <Text style={[styles.hlRemoveText, { color: c.textMuted }]}>Remove highlight</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Scripture reference popup (used from Sowders viewer) */}
      <Modal visible={!!scripturePopup} transparent animationType="fade" onRequestClose={() => setScripturePopup(null)}>
        <View style={styles.scriptureOverlay}>
          <View style={[styles.scripturePopupCard, { backgroundColor: c.surface }]}>
            <Text style={[styles.scripturePopupTitle, { color: c.primary }]}>{scripturePopup?.ref.reference}</Text>
            <ScrollView style={styles.scripturePopupScroll}>
              {scripturePopup?.verses.length === 0
                ? <Text style={{ color: c.textMuted }}>Verse not found.</Text>
                : scripturePopup?.verses.map(v => (
                    <View key={v.id} style={styles.scripturePopupVerseRow}>
                      <Text style={[styles.scripturePopupVerseNum, { color: c.primary }]}>{v.verse}</Text>
                      <Text style={[styles.scripturePopupVerseText, { color: c.textPrimary }]}>{v.text}</Text>
                    </View>
                  ))
              }
            </ScrollView>
            <TouchableOpacity style={[styles.scripturePopupClose, { backgroundColor: c.primary }]} onPress={() => setScripturePopup(null)}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Sowders section viewer */}
      <Modal visible={!!sowdersViewer} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSowdersViewer(null)}>
        <View style={[styles.sowdersModal, { backgroundColor: c.background }]}>
          <View style={[styles.sowdersModalHeader, { borderBottomColor: c.border }]}>
            <Text style={[styles.sowdersModalTitle, { color: c.textPrimary }]} numberOfLines={2}>{sowdersViewer?.label}</Text>
            <TouchableOpacity onPress={() => setSowdersViewer(null)}>
              <Text style={[styles.sowdersModalClose, { color: c.textMuted }]}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.sowdersModalScroll} contentContainerStyle={styles.sowdersModalContent}>
            <Text style={[styles.sowdersModalText, { color: c.textPrimary }]}>
              {parseInlineRefs(sowdersViewer?.content ?? '').map((seg, i) =>
                seg.type === 'ref'
                  ? <Text key={i} style={{ color: c.primary, textDecorationLine: 'underline' }}
                      onPress={() => openScriptureInViewer(seg.ref)}>{seg.value}</Text>
                  : <Text key={i}>{seg.value}</Text>
              )}
            </Text>
          </ScrollView>
          {sowdersHighlightTarget === null && (
            <View style={[styles.sowdersModalFooter, { borderTopColor: c.border, backgroundColor: c.surface }]}>
              <TouchableOpacity style={[styles.sowdersHighlightBtn, { backgroundColor: c.primary }]}
                onPress={() => setSowdersHighlightTarget(sowdersViewer?.content.slice(0, 500) ?? '')}>
                <Text style={styles.sowdersHighlightBtnText}>🖊 Highlight</Text>
              </TouchableOpacity>
            </View>
          )}
          {sowdersHighlightTarget !== null && (
            <View style={[styles.sowdersModalFooter, { borderTopColor: c.border, backgroundColor: c.surface }]}>
              <Text style={[styles.sowdersPickerLabel, { color: c.textMuted }]}>Choose highlight colour:</Text>
              <View style={styles.sowdersColorRow}>
                {HIGHLIGHT_COLORS.map(({ color, label }) => (
                  <TouchableOpacity key={color} style={[styles.sowdersColorSwatch, { backgroundColor: color }]}
                    onPress={async () => {
                      try {
                        await api.createHighlight('sowders', sowdersViewer?.label ?? '', sowdersHighlightTarget, color);
                        showToast('Highlight saved.');
                      } catch { showToast('Could not save highlight.', true); }
                      setSowdersHighlightTarget(null);
                    }}>
                    <Text style={styles.sowdersColorLabel}>{label}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity onPress={() => setSowdersHighlightTarget(null)}>
                  <Text style={[styles.sowdersColorCancel, { color: c.textMuted }]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Modal>

      <VerseChooser visible={chooserOpen} selectedBook={selectedBook} chapter={chapter} onNavigate={handleNavigate} onClose={() => setChooserOpen(false)} />
    </KeyboardAvoidingView>
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
  verseRow: { flexDirection: 'row', gap: 10, paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, alignItems: 'flex-start', overflow: 'hidden' },
  highlightBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  verseNumCol: { alignItems: 'center', minWidth: 28 },
  verseNum: { fontWeight: 'bold', marginTop: 2 },
  noteIcon: { fontSize: 10, marginTop: 3 },
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
  panelInputMulti: { minHeight: 180, textAlignVertical: 'top' },
  panelSaveBtn: { borderRadius: 8, padding: 12, alignItems: 'center', marginTop: 4 },
  panelSaveBtnText: { color: '#fff', fontWeight: 'bold' },
  panelSowders: { paddingHorizontal: 16, paddingBottom: 8 },
  panelSowdersText: { lineHeight: 26 },
  sowdersLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1 },
  sowdersLinkText: { flex: 1, fontWeight: '600', lineHeight: 20 },
  sowdersLinkArrow: { fontSize: 20, marginLeft: 8 },
  // Highlight picker
  hlOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  hlSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40, borderWidth: 1 },
  hlTitle: { fontSize: 14, fontWeight: '700', marginBottom: 20, textAlign: 'center' },
  hlColors: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
  hlSwatch: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 2 },
  hlSwatchSelected: { borderWidth: 3, borderColor: '#fff' },
  hlSwatchLabel: { fontSize: 9, color: '#000', fontWeight: '700' },
  hlRemove: { borderTopWidth: 1, paddingTop: 16, alignItems: 'center' },
  hlRemoveText: { fontSize: 14 },
  toast: { position: 'absolute', top: 12, alignSelf: 'center', borderRadius: 10, paddingHorizontal: 18, paddingVertical: 10, zIndex: 99, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, elevation: 6 },
  toastText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  // Sowders viewer modal
  sowdersModal: { flex: 1 },
  sowdersModalHeader: { flexDirection: 'row', alignItems: 'center', padding: 18, paddingTop: 22, borderBottomWidth: 1, gap: 12 },
  sowdersModalTitle: { flex: 1, fontSize: 17, fontWeight: '700', lineHeight: 24 },
  sowdersModalClose: { fontSize: 22, paddingHorizontal: 4 },
  sowdersModalScroll: { flex: 1 },
  sowdersModalContent: { padding: 20, paddingBottom: 32 },
  sowdersModalText: { fontSize: 15, lineHeight: 28 },
  sowdersModalFooter: { borderTopWidth: 1, padding: 16 },
  sowdersHighlightBtn: { borderRadius: 10, padding: 13, alignItems: 'center' },
  sowdersHighlightBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  sowdersPickerLabel: { fontSize: 12, fontWeight: '600', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  sowdersColorRow: { flexDirection: 'row', gap: 10, alignItems: 'center', flexWrap: 'wrap' },
  sowdersColorSwatch: { width: 52, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sowdersColorLabel: { fontSize: 10, fontWeight: '700', color: '#333' },
  sowdersColorCancel: { fontSize: 14, paddingHorizontal: 8, paddingVertical: 10 },
  // Scripture reference popup
  scriptureOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  scripturePopupCard: { borderRadius: 16, padding: 22, width: '100%', maxHeight: '70%', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 16, elevation: 10 },
  scripturePopupTitle: { fontSize: 18, fontWeight: '700', marginBottom: 14 },
  scripturePopupScroll: { maxHeight: 280 },
  scripturePopupVerseRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  scripturePopupVerseNum: { fontSize: 12, fontWeight: '700', minWidth: 22, marginTop: 3 },
  scripturePopupVerseText: { fontSize: 15, lineHeight: 24, flex: 1 },
  scripturePopupClose: { marginTop: 18, borderRadius: 10, padding: 13, alignItems: 'center' },
});
