import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box, Chip, CircularProgress, Divider, Fab, Paper, TextField, Typography,
  Drawer, List, ListItem, ListItemText, ListItemSecondaryAction, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Tooltip, Stack,
  ToggleButtonGroup, ToggleButton,
} from '@mui/material';
import { Send, History, Delete, Close, MenuBook, Highlight, NoteAdd, Search as SearchIcon, SmartToy } from '@mui/icons-material';
import type { Citation, ScriptureRef, SearchHistory, BibleVerse, UserHighlight, TextSearchResult } from '../../types';
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

type SearchMode = 'ai' | 'text';

const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

function parseSermonDate(fileName: string): string {
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

export default function SermonSearch() {
  const { isLoggedIn } = useAuth();
  const [mode, setMode] = useState<SearchMode>('ai');
  const [messages, setMessages] = useState<Message[]>([]);
  const [textResults, setTextResults] = useState<{ exactMatches: TextSearchResult[]; allWordMatches: TextSearchResult[] } | null>(null);
  const [lastTextQuery, setLastTextQuery] = useState('');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<SearchHistory[]>([]);
  const [scripture, setScripture] = useState<{ ref: ScriptureRef; verses: BibleVerse[] } | null>(null);
  const [, setHighlights] = useState<UserHighlight[]>([]);
  const [highlightPicker, setHighlightPicker] = useState<{ msgIndex: number; text: string } | null>(null);
  const [msgHighlights, setMsgHighlights] = useState<Record<number, string>>({});
  const [noteDialog, setNoteDialog] = useState<{ text: string } | null>(null);
  const [noteForm, setNoteForm] = useState({ title: '', content: '' });
  const [selectedText, setSelectedText] = useState('');
  const [citationDialog, setCitationDialog] = useState<{ citation: Citation; content: string } | null>(null);
  const [citationLoading, setCitationLoading] = useState(false);
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

  const switchMode = (m: SearchMode) => {
    setMode(m);
    setMessages([]);
    setTextResults(null);
    setInput('');
  };

  const sendAi = async (question: string) => {
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

  const sendText = async (query: string) => {
    if (!query.trim() || loading) return;
    setInput('');
    setLoading(true);
    setLastTextQuery(query);
    if (isLoggedIn()) api.saveSearchHistory(query, 'sermon').then(loadHistory);
    try {
      const res = await api.textSearch(query);
      setTextResults({ exactMatches: res.data.exactMatches, allWordMatches: res.data.allWordMatches });
    } catch {
      setTextResults(null);
    } finally {
      setLoading(false);
    }
  };

  const send = (q: string) => mode === 'ai' ? sendAi(q) : sendText(q);

  const openCitation = async (c: Citation) => {
    setCitationLoading(true);
    setCitationDialog({ citation: c, content: '' });
    try {
      const res = await api.getSermonPage(c.fileName, c.pageNumber);
      setCitationDialog({ citation: c, content: res.data.text });
    } catch {
      setCitationDialog({ citation: c, content: c.snippet ?? 'Could not load content.' });
    } finally {
      setCitationLoading(false);
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


  return (
    <Box display="flex" flexDirection="column" height="calc(100vh - 64px)">
      {/* Header */}
      <Box p={3} pb={1} display="flex" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="h5" fontWeight="bold">Sermon Search</Typography>
          <Typography variant="body2" color="text.secondary">Search the sermon archive by AI question or keyword</Typography>
        </Box>
        <Box display="flex" gap={1} alignItems="center">
          <ToggleButtonGroup size="small" value={mode} exclusive onChange={(_, v) => v && switchMode(v)}>
            <ToggleButton value="ai"><SmartToy fontSize="small" sx={{ mr: 0.5 }} />AI</ToggleButton>
            <ToggleButton value="text"><SearchIcon fontSize="small" sx={{ mr: 0.5 }} />Text</ToggleButton>
          </ToggleButtonGroup>
          {isLoggedIn() && (
            <Tooltip title="Search history">
              <IconButton onClick={() => { setHistoryOpen(true); loadHistory(); }}><History /></IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      {/* Content area */}
      <Box flex={1} overflow="auto" px={3} pb={2} onMouseUp={captureSelection}>

        {/* AI mode */}
        {mode === 'ai' && (
          messages.length === 0 ? (
            <Box py={4}>
              <Typography variant="body2" color="text.secondary" mb={2}>Suggested questions:</Typography>
              <Box display="flex" gap={1} flexWrap="wrap">
                {SUGGESTIONS.map(s => <Chip key={s} label={s} onClick={() => sendAi(s)} variant="outlined" clickable />)}
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
                      <Typography variant="body1" color={msg.error ? 'error' : 'inherit'} sx={{ userSelect: 'text' }}>
                        {msg.text}
                      </Typography>
                      {isLoggedIn() && !msg.error && (
                        <Stack direction="row" spacing={1} mt={1.5}>
                          <Button size="small" variant="outlined" startIcon={<Highlight />}
                            onClick={() => setHighlightPicker({ msgIndex: i, text: msg.text })} sx={{ fontSize: 11 }}>
                            Highlight
                          </Button>
                          <Button size="small" variant="outlined" startIcon={<NoteAdd />}
                            onClick={() => openNoteDialog(msg.text.slice(0, 300))} sx={{ fontSize: 11 }}>
                            Add Note
                          </Button>
                        </Stack>
                      )}
                      {msg.citations && msg.citations.length > 0 && (
                        <>
                          <Divider sx={{ my: 1.5 }} />
                          <Typography variant="caption" fontWeight="bold" color="text.secondary">Sources:</Typography>
                          {msg.citations.map((c, j) => {
                            const dateLabel = c.sermonDate ?? parseSermonDate(c.documentTitle);
                            const label = c.sectionTitle ? `${dateLabel} — ${c.sectionTitle}` : dateLabel;
                            return (
                              <Typography key={j} variant="caption" display="block"
                                color="primary" sx={{ cursor: 'pointer', textDecoration: 'underline', mt: 0.5 }}
                                onClick={() => openCitation(c)}>
                                {label}
                              </Typography>
                            );
                          })}
                        </>
                      )}
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
          )
        )}

        {/* Text mode */}
        {mode === 'text' && (
          !textResults && !loading ? (
            <Box py={4}>
              <Typography variant="body2" color="text.secondary">Enter keywords to search sermon text directly.</Typography>
            </Box>
          ) : textResults && (
            <>
              {([
                { label: 'Exact Match', items: textResults.exactMatches },
                { label: 'All Words',   items: textResults.allWordMatches },
              ] as const).map(({ label, items }) => items.length > 0 && (
                <Box key={label} mb={2}>
                  <Typography variant="subtitle1" fontWeight="bold" color="primary" mb={1}>
                    {label} ({items.length})
                  </Typography>
                  {items.map((r, i) => {
                    const dateLabel = r.sermonDate ?? parseSermonDate(r.documentTitle);
                    const titleLabel = r.sectionTitle ? `${dateLabel} — ${r.sectionTitle}` : dateLabel;
                    const query = lastTextQuery;
                    const parts = r.snippet.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
                    return (
                      <Paper key={i} variant="outlined" sx={{ p: 2, mb: 1.5, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                        onClick={() => openCitation({ documentTitle: r.documentTitle, fileName: r.fileName, pageNumber: r.pageNumber, snippet: r.snippet, sermonDate: r.sermonDate, sectionTitle: r.sectionTitle })}>
                        <Typography variant="subtitle2" color="primary" fontWeight="bold">{titleLabel}</Typography>
                        <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                          p.{r.pageNumber} · {r.fileName}
                        </Typography>
                        <Typography variant="body2">
                          {parts.map((p, pi) =>
                            p.toLowerCase() === query.toLowerCase()
                              ? <mark key={pi} style={{ backgroundColor: '#FFE066', padding: 0 }}>{p}</mark>
                              : p
                          )}
                        </Typography>
                      </Paper>
                    );
                  })}
                </Box>
              ))}
            </>
          )
        )}

        {loading && (
          <Box display="flex" alignItems="center" gap={1} mb={2} py={2}>
            <CircularProgress size={20} />
            <Typography variant="body2" color="text.secondary">Searching…</Typography>
          </Box>
        )}
        <div ref={bottomRef} />
      </Box>

      {/* Input */}
      <Box p={2} borderTop={1} borderColor="divider" display="flex" gap={1} alignItems="flex-end">
        <TextField
          fullWidth multiline maxRows={4}
          placeholder={mode === 'ai' ? 'Ask a question about the sermons…' : 'Search sermon text…'}
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

      {/* Citation content dialog */}
      <Dialog open={!!citationDialog} onClose={() => setCitationDialog(null)} maxWidth="md" fullWidth>
        {citationDialog && (() => {
          const c = citationDialog.citation;
          const dateLabel = c.sermonDate ?? parseSermonDate(c.documentTitle);
          const title = c.sectionTitle ? `${dateLabel} — ${c.sectionTitle}` : dateLabel;
          return (
            <>
              <DialogTitle>{title}</DialogTitle>
              <DialogContent dividers>
                {citationLoading
                  ? <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
                  : <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 2 }}>{citationDialog.content}</Typography>
                }
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setCitationDialog(null)}>Close</Button>
              </DialogActions>
            </>
          );
        })()}
      </Dialog>
    </Box>
  );
}
