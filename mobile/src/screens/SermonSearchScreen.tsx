import { useRef, useState, useCallback, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, Modal, FlatList, Alert,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { SermonStackParamList } from '../navigation/types';
import type { Citation, ScriptureRef, SearchHistory, BibleVerse } from '../types';
import * as api from '../api';
import { useAuth } from '../context/AuthContext';

type Props = NativeStackScreenProps<SermonStackParamList, 'SermonSearch'>;

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
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<SearchHistory[]>([]);
  const [scripture, setScripture] = useState<{ ref: ScriptureRef; verses: BibleVerse[] } | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const loadHistory = useCallback(async () => {
    if (!user) return;
    const res = await api.getSearchHistory('sermon');
    setHistory(res.data);
  }, [user]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const send = async (question: string) => {
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

  const openScripture = async (ref: ScriptureRef) => {
    try {
      const res = await api.getBibleVerses(ref.book, ref.chapter, ref.verseStart, ref.verseEnd);
      setScripture({ ref, verses: res.data });
    } catch {
      setScripture({ ref, verses: [] });
    }
  };

  const deleteHistory = (id: number) => {
    Alert.alert('Remove', 'Remove this search from history?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => { await api.deleteSearchHistory(id); loadHistory(); } },
    ]);
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>

      {/* History button */}
      {user && (
        <TouchableOpacity style={styles.historyBtn} onPress={() => { setHistoryOpen(true); loadHistory(); }}>
          <Text style={styles.historyBtnText}>⏱ History</Text>
        </TouchableOpacity>
      )}

      <ScrollView ref={scrollRef} style={styles.messages} contentContainerStyle={styles.messagesContent}>
        {messages.length === 0 && (
          <View style={styles.suggestions}>
            <Text style={styles.suggestionsLabel}>Suggested questions:</Text>
            {SUGGESTIONS.map(s => (
              <TouchableOpacity key={s} style={styles.suggestion} onPress={() => send(s)}>
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

            {/* Sermon citations */}
            {msg.citations && msg.citations.length > 0 && (
              <View style={styles.citationsBox}>
                <Text style={styles.citationsLabel}>Sources:</Text>
                {msg.citations.map((c, j) => (
                  <TouchableOpacity key={j} onPress={() => navigation.navigate('PdfViewer', { fileName: c.fileName, page: c.pageNumber, title: `${c.documentTitle} p.${c.pageNumber}` })}>
                    <Text style={styles.citationLink}>{c.documentTitle} — p.{c.pageNumber}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Scripture references */}
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

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Ask a question about the sermons…"
          value={input} onChangeText={setInput}
          multiline returnKeyType="send"
          onSubmitEditing={() => send(input)}
        />
        <TouchableOpacity style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]} onPress={() => send(input)} disabled={!input.trim() || loading}>
          <Text style={styles.sendIcon}>➤</Text>
        </TouchableOpacity>
      </View>

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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  historyBtn: { alignSelf: 'flex-end', margin: 8, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#f0f4ff', borderRadius: 14 },
  historyBtnText: { fontSize: 12, color: '#1976d2' },
  messages: { flex: 1 },
  messagesContent: { padding: 16, paddingBottom: 8 },
  suggestions: { paddingVertical: 8 },
  suggestionsLabel: { fontSize: 13, color: '#888', marginBottom: 8 },
  suggestion: { backgroundColor: '#f0f4ff', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 8, alignSelf: 'flex-start' },
  suggestionText: { fontSize: 13, color: '#1976d2' },
  bubble: { marginBottom: 12, maxWidth: '85%' },
  bubbleUser: { alignSelf: 'flex-end', backgroundColor: '#1976d2', borderRadius: 16, borderBottomRightRadius: 4, padding: 12 },
  bubbleAi: { alignSelf: 'flex-start', backgroundColor: '#f5f5f5', borderRadius: 16, borderBottomLeftRadius: 4, padding: 12, borderWidth: 1, borderColor: '#e0e0e0' },
  aiLabel: { fontSize: 11, color: '#888', marginBottom: 4 },
  bubbleText: { fontSize: 14, color: '#212121', lineHeight: 20 },
  bubbleTextUser: { color: '#fff' },
  bubbleError: { color: '#d32f2f' },
  citationsBox: { marginTop: 8, borderTopWidth: 1, borderTopColor: '#e0e0e0', paddingTop: 6 },
  citationsLabel: { fontSize: 11, fontWeight: '700', color: '#888', marginBottom: 4 },
  citationLink: { fontSize: 12, color: '#1976d2', textDecorationLine: 'underline', marginBottom: 3 },
  scripturesBox: { marginTop: 8, borderTopWidth: 1, borderTopColor: '#e0e0e0', paddingTop: 6 },
  scriptureChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  scriptureChip: { backgroundColor: '#e3f2fd', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1, borderColor: '#90caf9' },
  scriptureChipText: { fontSize: 11, color: '#1565c0' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  loadingText: { fontSize: 13, color: '#888' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, borderTopWidth: 1, borderTopColor: '#e0e0e0', backgroundColor: '#fff' },
  input: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, fontSize: 14, maxHeight: 100, marginRight: 8 },
  sendBtn: { backgroundColor: '#1976d2', width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: '#bbb' },
  sendIcon: { color: '#fff', fontSize: 16 },
  modal: { flex: 1, backgroundColor: '#fff', padding: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  modalHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  clearBtn: { fontSize: 13, color: '#d32f2f' },
  closeBtn: { fontSize: 20, color: '#888' },
  historyItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  historyItemText: { flex: 1 },
  historyQuery: { fontSize: 14, color: '#212121' },
  historyDate: { fontSize: 12, color: '#aaa' },
  deleteBtn: { fontSize: 16, paddingHorizontal: 8 },
  emptyText: { color: '#999', textAlign: 'center', marginTop: 24 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  scriptureModal: { backgroundColor: '#fff', borderRadius: 12, padding: 20, width: '100%', maxHeight: '70%' },
  scriptureTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, color: '#1976d2' },
  scriptureScroll: { maxHeight: 300 },
  verseRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  verseNum: { fontSize: 12, fontWeight: 'bold', color: '#1976d2', minWidth: 20, marginTop: 2 },
  verseText: { fontSize: 15, color: '#212121', lineHeight: 22, flex: 1 },
  closeScriptureBtn: { marginTop: 16, backgroundColor: '#1976d2', borderRadius: 8, padding: 12, alignItems: 'center' },
  closeScriptureBtnText: { color: '#fff', fontWeight: '600' },
});
