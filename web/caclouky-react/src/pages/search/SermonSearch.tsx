import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box, Chip, CircularProgress, Divider, Fab, Paper, TextField, Typography,
  Drawer, List, ListItem, ListItemText, ListItemSecondaryAction, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Tooltip, Stack,
} from '@mui/material';
import { Send, History, Delete, Close, MenuBook, Highlight, NoteAdd } from '@mui/icons-material';
import type { Citation, ScriptureRef, SearchHistory, BibleVerse, UserHighlight } from '../../types';
import * as api from '../../api';
import { useAuth } from '../../auth/AuthContext';

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

const HIGHLIGHT_COLORS = [
  { color: '#FFD700', label: 'Yellow' },
  { color: '#90EE90', label: 'Green' },
  { color: '#87CEEB', label: 'Blue' },
  { color: '#FFB6C1', label: 'Pink' },
  { color: '#DDA0DD', label: 'Purple' },
];

export default function SermonSearch() {
  const { isLoggedIn } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<SearchHistory[]>([]);
  const [scripture, setScripture] = useState<{ ref: ScriptureRef; verses: BibleVerse[] } | null>(null);
  const [highlights, setHighlights] = useState<UserHighlight[]>([]);
  const [highlightPicker, setHighlightPicker] = useState<{ msgIndex: number; text: string } | null>(null);
  const [msgHighlights, setMsgHighlights] = useState<Record<number, string>>({}); // msgIndex → color
  const [noteDialog, setNoteDialog] = useState<{ text: string } | null>(null);
  const [noteForm, setNoteForm] = useState({ title: '', content: '' });
  const [selectedText, setSelectedText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const loadHistory = useCallback(async () => {
    if (!isLoggedIn()) return;
    const res = await api.getSearchHistory('sermon');
    setHistory(res.data);
  }, [isLoggedIn]);

  const loadHighlights = useCallback(async () => {
    if (!isLoggedIn()) return;
    const res = await api.getHighlights('sermon');
    setHighlights(res.data);
  }, [isLoggedIn]);

  useEffect(() => { loadHistory(); loadHighlights(); }, [loadHistory, loadHighlights]);

  const send = async (question: string) => {
    if (!question.trim() || loading) return;
    setMessages(m => [...m, { role: 'user', text: question }]);
    setInput('');
    setLoading(true);
    if (isLoggedIn()) api.saveSearchHistory(question, 'sermon').then(loadHistory);
    try {
      const res = await api.chatSearch(question);
      setMessages(m => [...m, {
        role: 'ai', text: res.data.answer,
        citations: res.data.citations, scriptures: res.data.scriptures,
      }]);
    } catch {
      setMessages(m => [...m, { role: 'ai', text: 'Sorry, something went wrong. Please try again.', error: true }]);
    } finally {
      setLoading(false);
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

  const captureSelection = () => {
    const sel = window.getSelection()?.toString().trim();
    if (sel) setSelectedText(sel);
  };

  const applyHighlight = async (color: string) => {
    if (!highlightPicker) return;
    const text = selectedText || highlightPicker.text.slice(0, 500);
    await api.createHighlight('sermon', 'search', text, color);
    setMsgHighlights(h => ({ ...h, [highlightPicker.msgIndex]: color }));
    loadHighlights();
    setHighlightPicker(null);
    setSelectedText('');
  };

  const openNoteDialog = (prefill: string) => {
    setNoteForm({ title: 'Sermon Note', content: prefill });
    setNoteDialog({ text: prefill });
  };

  const saveNote = async () => {
    await api.createNote({ title: noteForm.title, content: noteForm.content, sourceType: 'sermon' });
    setNoteDialog(null);
  };

  const applyHighlightToText = (text: string) => {
    let result = text;
    for (const h of highlights) {
      if (h.selectedText && result.includes(h.selectedText)) {
        result = result.replace(
          h.selectedText,
          `<mark style="background:${h.color};border-radius:2px;padding:1px 2px">${h.selectedText}</mark>`
        );
      }
    }
    return result;
  };

  return (
    <Box display="flex" flexDirection="column" height="calc(100vh - 64px)">
      {/* Header */}
      <Box p={3} pb={1} display="flex" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography variant="h5" fontWeight="bold">Sermon Search</Typography>
          <Typography variant="body2" color="text.secondary">Ask questions about the sermon archive — powered by AI</Typography>
        </Box>
        {isLoggedIn() && (
          <Tooltip title="Search history">
            <IconButton onClick={() => { setHistoryOpen(true); loadHistory(); }}><History /></IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Messages */}
      <Box flex={1} overflow="auto" px={3} pb={2} onMouseUp={captureSelection}>
        {messages.length === 0 ? (
          <Box py={4}>
            <Typography variant="body2" color="text.secondary" mb={2}>Suggested questions:</Typography>
            <Box display="flex" gap={1} flexWrap="wrap">
              {SUGGESTIONS.map(s => <Chip key={s} label={s} onClick={() => send(s)} variant="outlined" clickable />)}
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
                <Box maxWidth="82%">
                  <Typography variant="caption" color="text.secondary" mb={0.5} display="block">AI Answer</Typography>
                  <Paper variant="outlined" sx={{
                    px: 2, py: 1.5, borderRadius: 3,
                    borderLeft: msgHighlights[i] ? `6px solid ${msgHighlights[i]}` : undefined,
                    bgcolor: msgHighlights[i] ? msgHighlights[i] + '18' : undefined,
                  }}>
                    <Typography
                      variant="body1"
                      color={msg.error ? 'error' : 'inherit'}
                      sx={{ userSelect: 'text' }}
                    >
                      {msg.text}
                    </Typography>

                    {/* Action bar — highlight + note buttons */}
                    {isLoggedIn() && !msg.error && (
                      <Stack direction="row" spacing={1} mt={1.5}>
                        <Button
                          size="small" variant="outlined" startIcon={<Highlight />}
                          onClick={() => setHighlightPicker({ msgIndex: i, text: msg.text })}
                          sx={{ fontSize: 11 }}
                        >
                          Highlight
                        </Button>
                        <Button
                          size="small" variant="outlined" startIcon={<NoteAdd />}
                          onClick={() => openNoteDialog(msg.text.slice(0, 300))}
                          sx={{ fontSize: 11 }}
                        >
                          Add Note
                        </Button>
                      </Stack>
                    )}

                    {/* Sermon citations */}
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

                    {/* Scripture references */}
                    {msg.scriptures && msg.scriptures.length > 0 && (
                      <>
                        <Divider sx={{ my: 1.5 }} />
                        <Box display="flex" alignItems="center" gap={0.5} mb={0.5}>
                          <MenuBook fontSize="small" color="action" />
                          <Typography variant="caption" fontWeight="bold" color="text.secondary">Scriptures:</Typography>
                        </Box>
                        <Box display="flex" gap={0.5} flexWrap="wrap">
                          {msg.scriptures.map((s, j) => (
                            <Chip key={j} label={s.reference} size="small" variant="outlined" color="primary" clickable onClick={() => openScripture(s)} />
                          ))}
                        </Box>
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

      {/* Input */}
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

      {/* History drawer */}
      <Drawer anchor="right" open={historyOpen} onClose={() => setHistoryOpen(false)}>
        <Box width={320} p={2}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="h6">Search History</Typography>
            <Box display="flex" gap={1}>
              {history.length > 0 && (
                <Button size="small" color="error" onClick={async () => { await api.clearSearchHistory(); loadHistory(); }}>Clear all</Button>
              )}
              <IconButton size="small" onClick={() => setHistoryOpen(false)}><Close /></IconButton>
            </Box>
          </Box>
          <List dense>
            {history.length === 0 && <Typography variant="body2" color="text.secondary">No history yet.</Typography>}
            {history.map(h => (
              <ListItem key={h.id} disableGutters button onClick={() => { send(h.query); setHistoryOpen(false); }}>
                <ListItemText primary={h.query} secondary={new Date(h.createdAt).toLocaleDateString()} />
                <ListItemSecondaryAction>
                  <IconButton size="small" edge="end" onClick={async e => { e.stopPropagation(); await api.deleteSearchHistory(h.id); loadHistory(); }}>
                    <Delete fontSize="small" />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      {/* Highlight color picker */}
      <Dialog open={!!highlightPicker} onClose={() => setHighlightPicker(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Choose Highlight Color</DialogTitle>
        <DialogContent>
          {selectedText && (
            <Typography variant="body2" color="text.secondary" mb={2} sx={{ fontStyle: 'italic' }}>
              "{selectedText.slice(0, 100)}{selectedText.length > 100 ? '…' : ''}"
            </Typography>
          )}
          {!selectedText && (
            <Typography variant="body2" color="text.secondary" mb={2}>
              Select text in the answer first, then choose a color — or highlight the full response:
            </Typography>
          )}
          <Box display="flex" gap={1} flexWrap="wrap">
            {HIGHLIGHT_COLORS.map(h => (
              <Button
                key={h.color}
                variant="contained"
                onClick={() => applyHighlight(h.color)}
                sx={{ bgcolor: h.color, color: '#333', '&:hover': { bgcolor: h.color, opacity: 0.85 }, minWidth: 80 }}
              >
                {h.label}
              </Button>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHighlightPicker(null)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Add note dialog */}
      <Dialog open={!!noteDialog} onClose={() => setNoteDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Note</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} pt={1}>
            <TextField
              label="Title" fullWidth value={noteForm.title}
              onChange={e => setNoteForm(f => ({ ...f, title: e.target.value }))}
            />
            <TextField
              label="Note" multiline rows={5} fullWidth value={noteForm.content}
              onChange={e => setNoteForm(f => ({ ...f, content: e.target.value }))}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNoteDialog(null)}>Cancel</Button>
          <Button variant="contained" onClick={saveNote} disabled={!noteForm.title || !noteForm.content}>Save Note</Button>
        </DialogActions>
      </Dialog>

      {/* Scripture popup */}
      <Dialog open={!!scripture} onClose={() => setScripture(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{scripture?.ref.reference}</DialogTitle>
        <DialogContent dividers>
          {scripture?.verses.length === 0 ? (
            <Typography color="text.secondary">Verse not found in database.</Typography>
          ) : (
            scripture?.verses.map(v => (
              <Box key={v.id} mb={1}>
                <Typography component="span" variant="caption" fontWeight="bold" color="primary.main" mr={1}>{v.verse}</Typography>
                <Typography component="span" variant="body1">{v.text}</Typography>
              </Box>
            ))
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScripture(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
