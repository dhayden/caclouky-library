import { useState, useRef, useEffect } from 'react';
import {
  Box, Chip, CircularProgress, Divider, Fab, Paper, TextField, Typography
} from '@mui/material';
import { Send } from '@mui/icons-material';
import type { Citation } from '../../types';
import * as api from '../../api';

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

export default function SermonSearch() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
    }
  };

  return (
    <Box display="flex" flexDirection="column" height="calc(100vh - 64px)">
      <Box p={3} pb={1}>
        <Typography variant="h5" fontWeight="bold">Sermon Search</Typography>
        <Typography variant="body2" color="text.secondary">
          Ask questions about the sermon archive — powered by AI
        </Typography>
      </Box>

      <Box flex={1} overflow="auto" px={3} pb={2}>
        {messages.length === 0 ? (
          <Box py={4}>
            <Typography variant="body2" color="text.secondary" mb={2}>Suggested questions:</Typography>
            <Box display="flex" gap={1} flexWrap="wrap">
              {SUGGESTIONS.map(s => (
                <Chip key={s} label={s} onClick={() => send(s)} variant="outlined" clickable />
              ))}
            </Box>
          </Box>
        ) : (
          messages.map((msg, i) => (
            <Box key={i} display="flex" justifyContent={msg.role === 'user' ? 'flex-end' : 'flex-start'} mb={2}>
              {msg.role === 'user' ? (
                <Paper sx={{ px: 2, py: 1.5, maxWidth: '70%', bgcolor: 'primary.main', color: 'white', borderRadius: 3 }}>
                  <Typography variant="body1">{msg.text}</Typography>
                </Paper>
              ) : (
                <Box maxWidth="80%">
                  <Typography variant="caption" color="text.secondary" mb={0.5} display="block">AI Answer</Typography>
                  <Paper variant="outlined" sx={{ px: 2, py: 1.5, borderRadius: 3 }}>
                    <Typography variant="body1" color={msg.error ? 'error' : 'inherit'}>{msg.text}</Typography>
                    {msg.citations && msg.citations.length > 0 && (
                      <>
                        <Divider sx={{ my: 1.5 }} />
                        <Typography variant="caption" fontWeight="bold" color="text.secondary">Sources:</Typography>
                        {msg.citations.map((c, j) => (
                          <Typography key={j} variant="caption" display="block" color="text.secondary">
                            {c.documentTitle} — p.{c.pageNumber}
                          </Typography>
                        ))}
                      </>
                    )}
                  </Paper>
                </Box>
              )}
            </Box>
          ))
        )}
        {loading && (
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <CircularProgress size={20} />
            <Typography variant="body2" color="text.secondary">Searching sermons…</Typography>
          </Box>
        )}
        <div ref={bottomRef} />
      </Box>

      <Box p={2} borderTop={1} borderColor="divider" display="flex" gap={1} alignItems="flex-end">
        <TextField
          fullWidth multiline maxRows={4} placeholder="Ask a question about the sermons…"
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
          size="small"
        />
        <Fab size="small" color="primary" onClick={() => send(input)} disabled={!input.trim() || loading}>
          <Send />
        </Fab>
      </Box>
    </Box>
  );
}
