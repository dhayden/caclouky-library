import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, Modal, FlatList,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { GokStackParamList } from '../navigation/types';
import type { Citation, TextSearchResult, ScriptureRef, SearchHistory, BibleVerse, DocTopic } from '../types';
import * as api from '../api';
import { useAuth } from '../context/AuthContext';

const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

function extractYear(fileName: string, sermonDate?: string | null): number {
  if (sermonDate) { const m = sermonDate.match(/\d{4}/); if (m) return parseInt(m[0]); }
  const m = fileName.match(/^(\d{2})/);
  return m ? 1900 + parseInt(m[1]) : 9999;
}

function extractSortKey(fileName: string): number {
  const m = fileName.match(/^(\d{6})/);
  return m ? parseInt(m[1]) : 999999;
}

function parseSermonDate(fileName: string): string {
  // Ministers' Digest: YYMD## → "Ministers' Digest #N, 19YY"
  const md = fileName.match(/^(\d{2})MD(\d{2})/i);
  if (md) return `Ministers' Digest #${parseInt(md[2])}, 19${md[1]}`;
  // Regular sermon: YYMMDD → "Month Day, Year"
  const m = fileName.match(/^(\d{2})(\d{2})(\d{2})/);
  if (m) {
    const year = `19${m[1]}`;
    const month = MONTHS[parseInt(m[2]) - 1] ?? '';
    const day   = parseInt(m[3]);
    if (!month) return year;
    return day > 0 ? `${month} ${day}, ${year}` : `${month} ${year}`;
  }
  if (fileName.startsWith('GoK')) return 'Gospel of the Kingdom';
  return fileName;
}

function HighlightedSnippet({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <Text style={styles.textResultSnippet}>{text}</Text>;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return (
    <Text style={styles.textResultSnippet}>
      {parts.map((p, i) =>
        p.toLowerCase() === query.toLowerCase()
          ? <Text key={i} style={styles.textResultHighlight}>{p}</Text>
          : p
      )}
    </Text>
  );
}

const HIGHLIGHT_COLORS = ['#FFD700', '#90EE90', '#87CEEB', '#FFB6C1', '#DDA0DD'];
const HIGHLIGHT_LABELS = ['Yellow', 'Green', 'Blue', 'Pink', 'Purple'];

type Props = NativeStackScreenProps<GokStackParamList, 'SermonSearch'>;
type SearchMode = 'ai' | 'text' | 'topics';

interface Message {
  role: 'user' | 'ai';
  text: string;
  citations?: Citation[];
  scriptures?: ScriptureRef[];
  error?: boolean;
}

const SUGGESTIONS = [
  "What did Bro. Sowders teach about long hair?",
  "What did he teach about baptism?",
  "What are his teachings on the church order?",
];

export default function SermonSearchScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [mode, setMode] = useState<SearchMode>('ai');
  const [messages, setMessages] = useState<Message[]>([]);
  const [exactMatches, setExactMatches] = useState<TextSearchResult[]>([]);
  const [allWordMatches, setAllWordMatches] = useState<TextSearchResult[]>([]);
  const [lastTextQuery, setLastTextQuery] = useState('');
  const [exactCollapsed, setExactCollapsed] = useState(false);
  const [allWordsCollapsed, setAllWordsCollapsed] = useState(true);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<SearchHistory[]>([]);
  const [scripture, setScripture] = useState<{ ref: ScriptureRef; verses: BibleVerse[] } | null>(null);
  const [highlightPicker, setHighlightPicker] = useState<{ text: string } | null>(null);
  const [noteModal, setNoteModal] = useState<{ prefill: string } | null>(null);
  const [noteForm, setNoteForm] = useState({ title: '', content: '' });
  const [toast, setToast] = useState<string | null>(null);
  const [collapsedYears, setCollapsedYears] = useState<Set<number>>(new Set());

  // Topics mode
  const [topics, setTopics] = useState<DocTopic[]>([]);
  const [topicsLoaded, setTopicsLoaded] = useState(false);
  const [topicFilter, setTopicFilter] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [topicSections, setTopicSections] = useState<TextSearchResult[]>([]);

  const toggleYear = (year: number) =>
    setCollapsedYears(prev => {
      const next = new Set(prev);
      next.has(year) ? next.delete(year) : next.add(year);
      return next;
    });
  const scrollRef = useRef<ScrollView>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const loadHistory = useCallback(async () => {
    if (!user) return;
    const res = await api.getSearchHistory('sermon');
    setHistory(res.data);
  }, [user]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const sendAi = async (question: string) => {
    if (!question.trim() || loading) return;
    setMessages(m => [...m, { role: 'user', text: question }]);
    setInput('');
    setLoading(true);
    if (user) api.saveSearchHistory(question, 'sermon').then(loadHistory);
    try {
      const res = await api.chatSearch(question);
      setMessages(m => [...m, {
        role: 'ai',
        text: res.data.answer,
        citations: res.data.citations,
        scriptures: res.data.scriptures,
      }]);
    } catch {
      setMessages(m => [...m, { role: 'ai', text: 'Sorry, something went wrong. Please try again.', error: true }]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const sendText = async (query: string) => {
    if (!query.trim() || loading) return;
    setInput('');
    setLoading(true);
    setLastTextQuery(query);
    setExactCollapsed(false);
    setAllWordsCollapsed(true);
    if (user) api.saveSearchHistory(query, 'sermon').then(loadHistory);
    try {
      const res = await api.textSearch(query);
      setExactMatches(res.data.exactMatches ?? []);
      setAllWordMatches(res.data.allWordMatches ?? []);
    } catch {
      setExactMatches([]);
      setAllWordMatches([]);
      showToast('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const send = (q: string) => mode === 'ai' ? sendAi(q) : sendText(q);

  const totalTextResults = exactMatches.length + allWordMatches.length;

  const buildTitle = (r: TextSearchResult): string => {
    const parts: string[] = ['Gospel of the Kingdom Papers'];
    if (r.sermonDate) {
      const yr = r.sermonDate.match(/\d{4}/)?.[0];
      if (yr) parts.push(yr);
      parts.push(r.sermonDate);
    }
    if (r.sectionTitle) parts.push(r.sectionTitle);
    return parts.join(' | ');
  };

  const openScripture = async (ref: ScriptureRef) => {
    try {
      const res = await api.getBibleVerses(ref.book, ref.chapter, ref.verseStart, ref.verseEnd);
      setScripture({ ref, verses: res.data });
    } catch {
      setScripture({ ref, verses: [] });
    }
  };

  const deleteHistory = (id: number) => {
    api.deleteSearchHistory(id).then(loadHistory);
  };

  const switchMode = (m: SearchMode) => {
    setMode(m);
    setMessages([]);
    setExactMatches([]);
    setAllWordMatches([]);
    setInput('');
    setSelectedTopic(null);
    if (m === 'topics' && !topicsLoaded) loadTopics();
  };

  const loadTopics = async () => {
    setLoading(true);
    try {
      const res = await api.getTopics();
      setTopics(res.data.topics);
      setTopicsLoaded(true);
    } catch {
      showToast('Could not load topics.');
    } finally {
      setLoading(false);
    }
  };

  const openTopic = async (topic: string) => {
    setSelectedTopic(topic);
    setLoading(true);
    try {
      const res = await api.getTopicSections(topic);
      setTopicSections(res.data.results);
    } catch {
      setTopicSections([]);
      showToast('Could not load sections.');
    } finally {
      setLoading(false);
    }
  };

  const filteredTopics = useMemo(() =>
    topicFilter.trim()
      ? topics.filter(t => t.topic.toLowerCase().includes(topicFilter.toLowerCase()))
      : topics,
    [topics, topicFilter]
  );

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>

      {/* Mode toggle */}
      <View style={styles.modeRow}>
        <TouchableOpacity style={[styles.modeBtn, mode === 'ai' && styles.modeBtnActive]} onPress={() => switchMode('ai')}>
          <Text style={[styles.modeBtnText, mode === 'ai' && styles.modeBtnTextActive]}>🤖 AI</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.modeBtn, mode === 'text' && styles.modeBtnActive]} onPress={() => switchMode('text')}>
          <Text style={[styles.modeBtnText, mode === 'text' && styles.modeBtnTextActive]}>🔍 Search</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.modeBtn, mode === 'topics' && styles.modeBtnActive]} onPress={() => switchMode('topics')}>
          <Text style={[styles.modeBtnText, mode === 'topics' && styles.modeBtnTextActive]}>📚 Topics</Text>
        </TouchableOpacity>
        {user && (
          <TouchableOpacity style={styles.historyBtn} onPress={() => { setHistoryOpen(true); loadHistory(); }}>
            <Text style={styles.historyBtnText}>⏱</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Toast */}
      {toast && (
        <View style={styles.toastBar}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}

      {/* AI mode: chat bubbles */}
      {mode === 'ai' && (
        <ScrollView ref={scrollRef} style={styles.messages} contentContainerStyle={styles.messagesContent}>
          {messages.length === 0 && (
            <View style={styles.suggestions}>
              <Text style={styles.suggestionsLabel}>Suggested questions:</Text>
              {SUGGESTIONS.map(s => (
                <TouchableOpacity key={s} style={styles.suggestion} onPress={() => sendAi(s)}>
                  <Text style={styles.suggestionText}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {messages.map((msg, i) => (
            <View key={i} style={[styles.bubble, msg.role === 'user' ? styles.bubbleUser : styles.bubbleAi]}>
              {msg.role === 'ai' && <Text style={styles.aiLabel}>AI Answer</Text>}
              <Text style={[styles.bubbleText, msg.role === 'user' && styles.bubbleTextUser, msg.error && styles.bubbleError]}>
                {msg.text}
              </Text>

              {user && !msg.error && (
                <View style={styles.actionRow}>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => setHighlightPicker({ text: msg.text.slice(0, 500) })}>
                    <Text style={styles.actionBtnText}>🖊 Highlight</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => { setNoteForm({ title: 'Sermon Note', content: msg.text.slice(0, 300) }); setNoteModal({ prefill: msg.text }); }}>
                    <Text style={styles.actionBtnText}>📝 Add Note</Text>
                  </TouchableOpacity>
                </View>
              )}

              {msg.citations && msg.citations.length > 0 && (
                <View style={styles.citationsBox}>
                  <Text style={styles.citationsLabel}>Sources:</Text>
                  {msg.citations.map((c, j) => {
                    const dateLabel = c.sermonDate ?? parseSermonDate(c.fileName);
                    const label = c.sectionTitle ? `${dateLabel} — ${c.sectionTitle}` : dateLabel;
                    return (
                      <TouchableOpacity key={j} onPress={() => navigation.navigate('PdfViewer', {
                        fileName: c.fileName, page: c.pageNumber,
                        title: label, highlight: c.snippet,
                      })}>
                        <Text style={styles.citationLink}>{label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {msg.scriptures && msg.scriptures.length > 0 && (
                <View style={styles.scripturesBox}>
                  <Text style={styles.citationsLabel}>📖 Scriptures:</Text>
                  <View style={styles.scriptureChips}>
                    {msg.scriptures.map((s, j) => (
                      <TouchableOpacity key={j} style={styles.scriptureChip} onPress={() => openScripture(s)}>
                        <Text style={styles.scriptureChipText}>{s.reference}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>
          ))}
          {loading && (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#1976d2" />
              <Text style={styles.loadingText}>Searching sermons…</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Text mode: Exact Match + All Words groups */}
      {mode === 'text' && (
        <ScrollView style={styles.messages} contentContainerStyle={styles.messagesContent}>
          {!loading && totalTextResults === 0 && (
            <Text style={styles.suggestionsLabel}>
              {lastTextQuery ? `No results for "${lastTextQuery}"` : 'Enter keywords to search the Gospel of the Kingdom Papers.'}
            </Text>
          )}
          {loading && (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={P} />
              <Text style={styles.loadingText}>Searching…</Text>
            </View>
          )}
          {!loading && totalTextResults > 0 && (
            <Text style={styles.resultCount}>
              Search results for Gospel of the Kingdom Papers (GoK)
            </Text>
          )}
          {[
            { label: 'Exact Match', results: exactMatches, collapsed: exactCollapsed, toggle: () => setExactCollapsed(v => !v) },
            { label: 'All Words', results: allWordMatches, collapsed: allWordsCollapsed, toggle: () => setAllWordsCollapsed(v => !v) },
          ].map(group => group.results.length === 0 ? null : (
            <View key={group.label}>
              <TouchableOpacity style={styles.yearHeader} onPress={group.toggle} activeOpacity={0.7}>
                <Text style={styles.yearHeaderText}>{group.label} ({group.results.length})</Text>
                <Text style={{ color: P, fontSize: 15, fontWeight: '700' }}>{group.collapsed ? '▼' : '▲'}</Text>
              </TouchableOpacity>
              {!group.collapsed && group.results.map((r, i) => {
                const title = buildTitle(r);
                return (
                  <TouchableOpacity key={i} style={styles.textResult}
                    onPress={() => {
                      if (r.sermonDate) {
                        navigation.navigate('GokHome', { scrollToDate: r.sermonDate, highlight: lastTextQuery, scrollToSectionTitle: r.sectionTitle ?? undefined });
                      } else {
                        navigation.navigate('PdfViewer', { fileName: r.fileName, page: r.pageNumber, title, highlight: r.snippet });
                      }
                    }}>
                    <Text style={styles.textResultTitle}>{title}</Text>
                    <HighlightedSnippet text={r.snippet} query={lastTextQuery} />
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </ScrollView>
      )}

      {/* Topics mode */}
      {mode === 'topics' && (
        <View style={{ flex: 1 }}>
          {selectedTopic ? (
            <>
              <View style={styles.topicHeader}>
                <TouchableOpacity onPress={() => setSelectedTopic(null)} style={styles.topicBackBtn}>
                  <Text style={styles.topicBackText}>‹ Topics</Text>
                </TouchableOpacity>
                <Text style={styles.topicHeaderTitle} numberOfLines={1}>{selectedTopic}</Text>
                <Text style={styles.topicHeaderCount}>{topicSections.length}</Text>
              </View>
              <ScrollView style={styles.messages} contentContainerStyle={styles.messagesContent}>
                {loading && <View style={styles.loadingRow}><ActivityIndicator size="small" color={P} /><Text style={styles.loadingText}>Loading…</Text></View>}
                {topicSections.map((r, i) => {
                  const dateLabel = r.sermonDate ?? parseSermonDate(r.fileName);
                  return (
                    <TouchableOpacity key={i} style={styles.textResult}
                      onPress={() => {
                        if (r.sermonDate) {
                          navigation.navigate('GokHome', { scrollToDate: r.sermonDate, highlight: selectedTopic ?? undefined, scrollToSectionTitle: r.sectionTitle ?? undefined });
                        } else {
                          navigation.navigate('PdfViewer', { fileName: r.fileName, page: r.pageNumber, title: dateLabel, highlight: r.snippet });
                        }
                      }}>
                      <Text style={styles.textResultTitle}>{dateLabel}</Text>
                      <Text style={styles.textResultSubtitle}>p.{r.pageNumber}</Text>
                      <Text style={styles.textResultSnippet} numberOfLines={4}>{r.snippet}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </>
          ) : (
            <>
              <View style={styles.topicFilterRow}>
                <TextInput
                  style={styles.topicFilterInput}
                  placeholder="Filter topics…"
                  placeholderTextColor={MUT}
                  value={topicFilter}
                  onChangeText={setTopicFilter}
                />
                {topicFilter.length > 0 && (
                  <TouchableOpacity onPress={() => setTopicFilter('')}>
                    <Text style={{ color: MUT, fontSize: 18, paddingHorizontal: 10 }}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
              {loading
                ? <ActivityIndicator style={{ marginTop: 40 }} size="large" color={P} />
                : (
                  <FlatList
                    data={filteredTopics}
                    keyExtractor={t => t.topic}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8 }}
                    ListEmptyComponent={<Text style={[styles.suggestionsLabel, { marginTop: 24 }]}>{topicsLoaded ? 'No topics found.' : 'Loading topics…'}</Text>}
                    renderItem={({ item: t }) => (
                      <TouchableOpacity style={styles.topicRow} onPress={() => openTopic(t.topic)}>
                        <Text style={styles.topicName}>{t.topic}</Text>
                        <View style={styles.topicBadge}><Text style={styles.topicBadgeText}>{t.count}</Text></View>
                      </TouchableOpacity>
                    )}
                  />
                )
              }
            </>
          )}
        </View>
      )}

      {mode !== 'topics' && <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder={mode === 'ai' ? 'Ask a question about the sermons…' : 'Search sermon text…'}
          value={input} onChangeText={setInput}
          multiline returnKeyType="send"
          onSubmitEditing={() => send(input)}
        />
        <TouchableOpacity style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]} onPress={() => send(input)} disabled={!input.trim() || loading}>
          <Text style={styles.sendIcon}>➤</Text>
        </TouchableOpacity>
      </View>}

      {/* History modal */}
      <Modal visible={historyOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setHistoryOpen(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Search History</Text>
            <View style={styles.modalHeaderRight}>
              {history.length > 0 && (
                <TouchableOpacity onPress={async () => { await api.clearSearchHistory(); loadHistory(); }}>
                  <Text style={styles.clearBtn}>Clear all</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => setHistoryOpen(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
          {history.length === 0
            ? <Text style={styles.emptyText}>No history yet.</Text>
            : <FlatList
                data={history}
                keyExtractor={h => String(h.id)}
                renderItem={({ item: h }) => (
                  <TouchableOpacity style={styles.historyItem} onPress={() => { send(h.query); setHistoryOpen(false); }}>
                    <View style={styles.historyItemText}>
                      <Text style={styles.historyQuery}>{h.query}</Text>
                      <Text style={styles.historyDate}>{new Date(h.createdAt).toLocaleDateString()}</Text>
                    </View>
                    <TouchableOpacity onPress={() => deleteHistory(h.id)}>
                      <Text style={styles.deleteBtn}>🗑</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                )}
              />
          }
        </View>
      </Modal>

      {/* Highlight color picker */}
      <Modal visible={!!highlightPicker} animationType="fade" transparent onRequestClose={() => setHighlightPicker(null)}>
        <View style={styles.overlay}>
          <View style={styles.scriptureModal}>
            <Text style={styles.scriptureTitle}>Choose Highlight Color</Text>
            <View style={styles.colorRow}>
              {HIGHLIGHT_COLORS.map((color, i) => (
                <TouchableOpacity
                  key={color}
                  style={[styles.colorSwatch, { backgroundColor: color }]}
                  onPress={async () => {
                    try {
                      if (highlightPicker?.text)
                        await api.createHighlight('sermon', 'search', highlightPicker.text, color);
                      showToast('Highlight saved.');
                    } catch {
                      showToast('Could not save highlight.');
                    } finally {
                      setHighlightPicker(null);
                    }
                  }}
                >
                  <Text style={styles.colorLabel}>{HIGHLIGHT_LABELS[i]}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.closeScriptureBtn} onPress={() => setHighlightPicker(null)}>
              <Text style={styles.closeScriptureBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add note modal */}
      <Modal visible={!!noteModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setNoteModal(null)}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Note</Text>
            <TouchableOpacity onPress={() => setNoteModal(null)}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.noteLabel}>Title</Text>
          <TextInput style={styles.noteInput} value={noteForm.title} onChangeText={v => setNoteForm(f => ({ ...f, title: v }))} placeholder="Note title…" />
          <Text style={styles.noteLabel}>Note</Text>
          <TextInput style={[styles.noteInput, styles.noteInputMulti]} value={noteForm.content} onChangeText={v => setNoteForm(f => ({ ...f, content: v }))} placeholder="Write your note…" multiline />
          <TouchableOpacity
            style={[styles.saveNoteBtn, (!noteForm.title || !noteForm.content) && styles.sendBtnDisabled]}
            disabled={!noteForm.title || !noteForm.content}
            onPress={async () => {
              try {
                await api.createNote({ title: noteForm.title, content: noteForm.content, sourceType: 'sermon' });
                showToast('Note saved.');
              } catch {
                showToast('Could not save note.');
              } finally {
                setNoteModal(null);
              }
            }}
          >
            <Text style={styles.closeScriptureBtnText}>Save Note</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Scripture popup */}
      <Modal visible={!!scripture} animationType="fade" transparent onRequestClose={() => setScripture(null)}>
        <View style={styles.overlay}>
          <View style={styles.scriptureModal}>
            <Text style={styles.scriptureTitle}>{scripture?.ref.reference}</Text>
            <ScrollView style={styles.scriptureScroll}>
              {scripture?.verses.length === 0
                ? <Text style={styles.emptyText}>Verse not found in database.</Text>
                : scripture?.verses.map(v => (
                    <View key={v.id} style={styles.verseRow}>
                      <Text style={styles.verseNum}>{v.verse}</Text>
                      <Text style={styles.verseText}>{v.text}</Text>
                    </View>
                  ))
              }
            </ScrollView>
            <TouchableOpacity style={styles.closeScriptureBtn} onPress={() => setScripture(null)}>
              <Text style={styles.closeScriptureBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const P = '#2C52A0';   // primary navy
const BG = '#F7F6F2';  // warm background
const SRF = '#FFFFFF'; // surface
const BRD = '#E8E6E0'; // border
const TXT = '#1A1A2E'; // text primary
const MUT = '#A0A0B4'; // muted

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  modeRow: { flexDirection: 'row', padding: 10, gap: 8, borderBottomWidth: 1, borderBottomColor: BRD, backgroundColor: SRF, alignItems: 'center' },
  modeBtn: { flex: 1, paddingVertical: 8, borderRadius: 22, borderWidth: 1.5, borderColor: BRD, alignItems: 'center', backgroundColor: BG },
  modeBtnActive: { backgroundColor: P, borderColor: P },
  modeBtnText: { fontSize: 13, color: '#5A5A72', fontWeight: '600' },
  modeBtnTextActive: { color: '#fff' },
  historyBtn: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: BG, borderRadius: 14, borderWidth: 1, borderColor: BRD },
  historyBtnText: { fontSize: 16, color: P },
  toastBar: { backgroundColor: '#1A1A2E', marginHorizontal: 16, marginTop: 8, borderRadius: 10, padding: 11, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, elevation: 4 },
  toastText: { color: '#fff', fontSize: 13, fontWeight: '500' },
  messages: { flex: 1 },
  messagesContent: { padding: 18, paddingBottom: 12 },
  suggestions: { paddingVertical: 12 },
  suggestionsLabel: { fontSize: 12, color: MUT, marginBottom: 10, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
  suggestion: { backgroundColor: SRF, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, marginBottom: 8, alignSelf: 'flex-start', borderWidth: 1, borderColor: BRD, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  suggestionText: { fontSize: 13, color: P, fontWeight: '500' },
  bubble: { marginBottom: 14, maxWidth: '86%' },
  bubbleUser: { alignSelf: 'flex-end', backgroundColor: P, borderRadius: 18, borderBottomRightRadius: 4, padding: 13 },
  bubbleAi: { alignSelf: 'flex-start', backgroundColor: SRF, borderRadius: 18, borderBottomLeftRadius: 4, padding: 13, borderWidth: 1, borderColor: BRD, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },
  aiLabel: { fontSize: 10, color: MUT, marginBottom: 5, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  bubbleText: { fontSize: 14, color: TXT, lineHeight: 22 },
  bubbleTextUser: { color: '#fff' },
  bubbleError: { color: '#C0392B' },
  citationsBox: { marginTop: 10, borderTopWidth: 1, borderTopColor: BRD, paddingTop: 8 },
  citationsLabel: { fontSize: 10, fontWeight: '700', color: MUT, marginBottom: 5, letterSpacing: 0.5, textTransform: 'uppercase' },
  citationLink: { fontSize: 12, color: P, textDecorationLine: 'underline', marginBottom: 4, fontWeight: '500' },
  scripturesBox: { marginTop: 10, borderTopWidth: 1, borderTopColor: BRD, paddingTop: 8 },
  scriptureChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  scriptureChip: { backgroundColor: '#EEF2FB', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: '#C8D4F0' },
  scriptureChipText: { fontSize: 11, color: P, fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 10, marginBottom: 4 },
  actionBtn: { backgroundColor: '#EEF2FB', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#C8D4F0' },
  actionBtnText: { fontSize: 12, color: P, fontWeight: '600' },
  resultCount: { fontSize: 12, color: MUT, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 14 },
  topicFilterRow: { flexDirection: 'row', alignItems: 'center', margin: 12, borderWidth: 1.5, borderColor: BRD, borderRadius: 22, backgroundColor: SRF, paddingHorizontal: 14 },
  topicFilterInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: TXT },
  topicRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: BRD },
  topicName: { flex: 1, fontSize: 15, color: TXT, fontWeight: '500', marginRight: 12 },
  topicBadge: { backgroundColor: BRD, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  topicBadgeText: { fontSize: 12, fontWeight: '700', color: MUT },
  topicHeader: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: BRD, backgroundColor: SRF, gap: 10 },
  topicBackBtn: { paddingHorizontal: 4 },
  topicBackText: { color: P, fontSize: 16, fontWeight: '600' },
  topicHeaderTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: TXT },
  topicHeaderCount: { fontSize: 12, fontWeight: '700', color: MUT, backgroundColor: BRD, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  yearHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, marginBottom: 6, borderBottomWidth: 2, borderBottomColor: P },
  yearHeaderText: { fontSize: 16, fontWeight: '800', color: P },
  yearHeaderCount: { fontSize: 12, fontWeight: '700', color: MUT, backgroundColor: BRD, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  textResult: { backgroundColor: SRF, borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: BRD, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },
  textResultTitle: { fontSize: 14, fontWeight: '700', color: P, marginBottom: 2 },
  textResultSubtitle: { fontSize: 11, color: MUT, marginBottom: 8, fontWeight: '500' },
  textResultSnippet: { fontSize: 13, color: '#5A5A72', lineHeight: 20 },
  textResultHighlight: { backgroundColor: '#FFE066', color: TXT, fontWeight: '700' },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: 12 },
  colorSwatch: { width: 68, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  colorLabel: { fontSize: 11, fontWeight: '700', color: '#333' },
  noteLabel: { fontSize: 12, color: '#5A5A72', marginTop: 14, marginBottom: 5, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  noteInput: { borderWidth: 1, borderColor: BRD, borderRadius: 10, padding: 12, fontSize: 15, backgroundColor: BG },
  noteInputMulti: { minHeight: 140, textAlignVertical: 'top' },
  saveNoteBtn: { marginTop: 20, backgroundColor: P, borderRadius: 10, padding: 15, alignItems: 'center' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  loadingText: { fontSize: 13, color: MUT },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, borderTopWidth: 1, borderTopColor: BRD, backgroundColor: SRF },
  input: { flex: 1, borderWidth: 1.5, borderColor: BRD, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 9, fontSize: 14, maxHeight: 100, marginRight: 8, backgroundColor: BG, color: TXT },
  sendBtn: { backgroundColor: P, width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: '#C0BFB8' },
  sendIcon: { color: '#fff', fontSize: 16 },
  modal: { flex: 1, backgroundColor: SRF, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: TXT },
  modalHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  clearBtn: { fontSize: 13, color: '#C0392B', fontWeight: '600' },
  closeBtn: { fontSize: 22, color: MUT },
  historyItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: BRD },
  historyItemText: { flex: 1 },
  historyQuery: { fontSize: 14, color: TXT, fontWeight: '500' },
  historyDate: { fontSize: 12, color: MUT, marginTop: 2 },
  deleteBtn: { fontSize: 16, paddingHorizontal: 8, color: MUT },
  emptyText: { color: MUT, textAlign: 'center', marginTop: 32, fontSize: 14 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  scriptureModal: { backgroundColor: SRF, borderRadius: 16, padding: 22, width: '100%', maxHeight: '72%', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
  scriptureTitle: { fontSize: 19, fontWeight: '700', marginBottom: 14, color: P },
  scriptureScroll: { maxHeight: 300 },
  verseRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  verseNum: { fontSize: 12, fontWeight: '700', color: P, minWidth: 22, marginTop: 3 },
  verseText: { fontSize: 15, color: TXT, lineHeight: 24, flex: 1 },
  closeScriptureBtn: { marginTop: 18, backgroundColor: P, borderRadius: 10, padding: 13, alignItems: 'center' },
  closeScriptureBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
