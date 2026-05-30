import { useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import type { Citation } from '../types';
import * as api from '../api';

interface Message {
  role: 'user' | 'ai';
  text: string;
  citations?: Citation[];
  error?: boolean;
}

const SUGGESTIONS = [
  "What did Bro. Sowders teach about long hair?",
  "What did he teach about baptism?",
  "What are his teachings on the church order?",
];

export default function SermonSearchScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const send = async (question: string) => {
    if (!question.trim() || loading) return;
    setMessages(m => [...m, { role: 'user', text: question }]);
    setInput('');
    setLoading(true);
    try {
      const res = await api.chatSearch(question);
      setMessages(m => [...m, { role: 'ai', text: res.data.answer, citations: res.data.citations }]);
    } catch {
      setMessages(m => [...m, { role: 'ai', text: 'Sorry, something went wrong. Please try again.', error: true }]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
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
            {msg.citations && msg.citations.length > 0 && (
              <View style={styles.citations}>
                <Text style={styles.citationsLabel}>Sources:</Text>
                {msg.citations.map((c, j) => (
                  <Text key={j} style={styles.citation}>{c.documentTitle} — p.{c.pageNumber}</Text>
                ))}
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
          value={input}
          onChangeText={setInput}
          multiline
          returnKeyType="send"
          onSubmitEditing={() => send(input)}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
          onPress={() => send(input)}
          disabled={!input.trim() || loading}
        >
          <Text style={styles.sendIcon}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
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
  citations: { marginTop: 8, borderTopWidth: 1, borderTopColor: '#e0e0e0', paddingTop: 6 },
  citationsLabel: { fontSize: 11, fontWeight: '700', color: '#888', marginBottom: 2 },
  citation: { fontSize: 11, color: '#888' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  loadingText: { fontSize: 13, color: '#888' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, borderTopWidth: 1, borderTopColor: '#e0e0e0', backgroundColor: '#fff' },
  input: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, fontSize: 14, maxHeight: 100, marginRight: 8 },
  sendBtn: { backgroundColor: '#1976d2', width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: '#bbb' },
  sendIcon: { color: '#fff', fontSize: 16 },
});
