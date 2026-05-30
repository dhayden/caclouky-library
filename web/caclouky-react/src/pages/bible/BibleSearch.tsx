import { useCallback, useEffect, useState } from 'react';
import {
  Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, FormControl, IconButton, InputLabel, Link, MenuItem,
  Paper, Select, TextField, Tooltip, Typography,
} from '@mui/material';
import { Search, NoteAdd, History, Delete, Close, Bookmark } from '@mui/icons-material';
import type { BibleVerse, SearchHistory, UserHighlight } from '../../types';
import * as api from '../../api';
import { useAuth } from '../../auth/AuthContext';

type CrossRef = { documentTitle: string; fileName: string; pageNumber: number };
type NoteRef  = { id: number; title: string; content: string; updatedAt: string };

const HIGHLIGHT_COLORS = ['#FFD700', '#90EE90', '#87CEEB', '#FFB6C1', '#DDA0DD'];

export default function BibleSearch() {
  const { isLoggedIn } = useAuth();
  const [books, setBooks] = useState<string[]>([]);
  const [selectedBook, setSelectedBook] = useState('');
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [verses, setVerses] = useState<BibleVerse[]>([]);
  const [crossRefs, setCrossRefs] = useState<Record<number, CrossRef[]>>({});
  const [chapterNotes, setChapterNotes] = useState<Record<number, NoteRef[]>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<BibleVerse[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<SearchHistory[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [noteDialog, setNoteDialog] = useState<{ verseNum: number; verseText: string } | null>(null);
  const [noteForm, setNoteForm] = useState({ title: '', content: '' });
  const [highlightVerse, setHighlightVerse] = useState<{ verseNum: number; text: string } | null>(null);
  const [highlights, setHighlights] = useState<UserHighlight[]>([]);

  useEffect(() => {
    api.getBibleBooks().then(r => {
      setBooks(r.data);
      if (r.data.length) setSelectedBook(r.data[0]);
    });
  }, []);

  const loadHistory = useCallback(async () => {
    if (!isLoggedIn()) return;
    const res = await api.getSearchHistory('bible');
    setHistory(res.data);
  }, [isLoggedIn]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  // Load chapter + cross-refs + notes whenever book/chapter changes
  useEffect(() => {
    if (!selectedBook || searchResults) return;
    setLoading(true);
    setCrossRefs({});
    setChapterNotes({});

    const chapterP = api.getBibleChapter(selectedBook, selectedChapter)
      .then(r => setVerses(r.data));
    const refsP = api.getBibleCrossReferences(selectedBook, selectedChapter)
      .then(r => setCrossRefs(r.data as any));
    const notesP = isLoggedIn()
      ? api.getBibleChapterNotes(selectedBook, selectedChapter).then(r => setChapterNotes(r.data as any))
      : Promise.resolve();
    const hlP = isLoggedIn()
      ? api.getHighlights('bible').then(r => setHighlights(r.data))
      : Promise.resolve();

    Promise.all([chapterP, refsP, notesP, hlP]).finally(() => setLoading(false));
  }, [selectedBook, selectedChapter, searchResults, isLoggedIn]);

  const doSearch = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setSearchResults(null);
    if (isLoggedIn()) api.saveSearchHistory(q, 'bible').then(loadHistory);
    try {
      const res = await api.searchBible(q);
      setSearchResults(res.data);
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => { setSearchResults(null); setSearchQuery(''); };

  const saveNote = async () => {
    if (!noteDialog) return;
    const ref = `${selectedBook}:${selectedChapter}:${noteDialog.verseNum}`;
    await api.createNote({ title: noteForm.title, content: noteForm.content, sourceType: 'bible', sourceRef: ref });
    setNoteDialog(null);
    // Reload notes for chapter
    if (isLoggedIn()) {
      api.getBibleChapterNotes(selectedBook, selectedChapter).then(r => setChapterNotes(r.data as any));
    }
  };

  const saveHighlight = async (color: string) => {
    if (!highlightVerse) return;
    const ref = `${selectedBook}:${selectedChapter}:${highlightVerse.verseNum}`;
    await api.createHighlight('bible', ref, highlightVerse.text, color);
    setHighlights(hs => [...hs.filter(h => h.sourceRef !== ref), {
      id: Date.now(), userId: '', sourceType: 'bible', sourceRef: ref,
      selectedText: highlightVerse.text, color, createdAt: new Date().toISOString()
    }]);
    setHighlightVerse(null);
  };

  const verseHighlight = (verseNum: number): string | undefined => {
    const ref = `${selectedBook}:${selectedChapter}:${verseNum}`;
    return highlights.find(h => h.sourceRef === ref)?.color;
  };

  const displayVerses = searchResults ?? verses;

  return (
    <Box p={3} height="calc(100vh - 64px)" display="flex" flexDirection="column">
      {/* Controls */}
      <Box display="flex" gap={1} mb={2} flexWrap="wrap" alignItems="center">
        {/* Book selector */}
        {!searchResults && (
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Book</InputLabel>
            <Select value={selectedBook} label="Book" onChange={e => { setSelectedBook(e.target.value); setSelectedChapter(1); }}>
              {books.map(b => <MenuItem key={b} value={b}>{b}</MenuItem>)}
            </Select>
          </FormControl>
        )}

        {/* Chapter nav */}
        {!searchResults && (
          <Box display="flex" alignItems="center" gap={0.5}>
            <Button size="small" disabled={selectedChapter <= 1} onClick={() => setSelectedChapter(c => c - 1)}>‹</Button>
            <Typography variant="body2" sx={{ minWidth: 80, textAlign: 'center' }}>
              Chapter {selectedChapter}
            </Typography>
            <Button size="small" onClick={() => setSelectedChapter(c => c + 1)}>›</Button>
          </Box>
        )}

        <Box flex={1} />

        {/* Search */}
        <Box display="flex" gap={1} alignItems="center">
          <TextField
            size="small" placeholder="Search verses…" value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doSearch(searchQuery)}
            sx={{ width: 220 }}
          />
          <Button variant="contained" size="small" startIcon={<Search />} onClick={() => doSearch(searchQuery)}>Search</Button>
          {searchResults && <Button size="small" onClick={clearSearch}>Clear</Button>}
          {isLoggedIn() && (
            <Tooltip title="Search history">
              <IconButton size="small" onClick={() => { setHistoryOpen(true); loadHistory(); }}><History /></IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      {searchResults && (
        <Typography variant="body2" color="text.secondary" mb={1}>
          {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{searchQuery}"
        </Typography>
      )}

      {/* Two-column verse layout */}
      {loading ? (
        <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>
      ) : (
        <Box flex={1} overflow="auto">
          {/* Column headers */}
          {!searchResults && (
            <Box display="grid" gridTemplateColumns="3fr 2fr" gap={2} mb={1} px={1}>
              <Typography variant="caption" color="text.secondary" fontWeight="bold" textTransform="uppercase">
                {selectedBook} {selectedChapter} — King James Version
              </Typography>
              <Typography variant="caption" color="text.secondary" fontWeight="bold" textTransform="uppercase">
                Sermon References &amp; Notes
              </Typography>
            </Box>
          )}

          {displayVerses.map(v => {
            const refs  = crossRefs[v.verse] ?? [];
            const notes = chapterNotes[v.verse] ?? [];
            const hasRightContent = refs.length > 0 || notes.length > 0;
            const hlColor = verseHighlight(v.verse);

            return (
              <Box
                key={v.id}
                display="grid"
                gridTemplateColumns={searchResults ? '1fr' : '3fr 2fr'}
                gap={2}
                px={1} py={1}
                sx={{
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  bgcolor: hlColor ? hlColor + '55' : 'transparent',
                  borderLeft: hlColor ? `4px solid ${hlColor}` : '4px solid transparent',
                  '&:hover': { bgcolor: hlColor ? hlColor + '77' : 'action.hover' },
                }}
              >
                {/* Left: KJV verse */}
                <Box>
                  {searchResults && (
                    <Typography variant="caption" color="primary.main" fontWeight="bold" display="block" mb={0.3}>
                      {v.book} {v.chapter}:{v.verse}
                    </Typography>
                  )}
                  <Typography variant="body1" lineHeight={1.8}>
                    <Box component="sup" sx={{ color: 'primary.main', fontWeight: 'bold', fontSize: '0.7em', mr: 0.5 }}>
                      {v.verse}
                    </Box>
                    {v.text}
                    {isLoggedIn() && !searchResults && (
                      <Box component="span" ml={1}>
                        <Tooltip title="Add note for this verse">
                          <IconButton size="small" sx={{ p: 0.3 }}
                            onClick={() => { setNoteForm({ title: `${selectedBook} ${selectedChapter}:${v.verse}`, content: '' }); setNoteDialog({ verseNum: v.verse, verseText: v.text }); }}>
                            <NoteAdd sx={{ fontSize: 14, color: 'text.disabled' }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Highlight this verse">
                          <IconButton size="small" sx={{ p: 0.3 }}
                            onClick={() => setHighlightVerse({ verseNum: v.verse, text: v.text })}>
                            <Bookmark sx={{ fontSize: 14, color: 'text.disabled' }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    )}
                  </Typography>
                </Box>

                {/* Right: sermon refs + notes */}
                {!searchResults && (
                  <Box sx={{ borderLeft: '2px solid', borderColor: hasRightContent ? 'primary.light' : 'divider', pl: 1.5 }}>
                    {refs.map((ref, ri) => (
                      <Box key={ri} mb={0.5}>
                        <Link
                          href={`/api/sermon-docs/page/${ref.fileName}/${ref.pageNumber}`}
                          target="_blank"
                          rel="noopener"
                          variant="caption"
                          sx={{ display: 'flex', alignItems: 'center', gap: 0.5, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                        >
                          📜 <strong>{ref.documentTitle}</strong>&nbsp;p.{ref.pageNumber}
                        </Link>
                      </Box>
                    ))}
                    {notes.map((note, ni) => (
                      <Box key={ni} mt={refs.length > 0 ? 0.5 : 0}>
                        {ni === 0 && refs.length > 0 && <Divider sx={{ my: 0.5 }} />}
                        <Tooltip title={note.content}>
                          <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', fontStyle: 'italic', cursor: 'help' }}>
                            📝 {note.title}
                          </Typography>
                        </Tooltip>
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            );
          })}

          {displayVerses.length === 0 && !loading && (
            <Box py={8} textAlign="center">
              <Typography color="text.secondary">
                {selectedBook ? 'No verses found — the KJV Bible may still be loading. Check back in a minute.' : 'Select a book to begin.'}
              </Typography>
            </Box>
          )}
        </Box>
      )}

      {/* History dialog */}
      <Dialog open={historyOpen} onClose={() => setHistoryOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            Bible Search History
            <IconButton size="small" onClick={() => setHistoryOpen(false)}><Close /></IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {history.length === 0 && <Typography color="text.secondary">No history yet.</Typography>}
          {history.map(h => (
            <Box key={h.id} display="flex" justifyContent="space-between" alignItems="center" py={0.5}>
              <Chip label={h.query} size="small" clickable onClick={() => { doSearch(h.query); setHistoryOpen(false); }} />
              <IconButton size="small" onClick={async () => { await api.deleteSearchHistory(h.id); loadHistory(); }}>
                <Delete fontSize="small" />
              </IconButton>
            </Box>
          ))}
        </DialogContent>
        <DialogActions>
          {history.length > 0 && <Button color="error" onClick={async () => { await api.clearSearchHistory(); loadHistory(); }}>Clear all</Button>}
        </DialogActions>
      </Dialog>

      {/* Add note dialog */}
      <Dialog open={!!noteDialog} onClose={() => setNoteDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Note for {selectedBook} {selectedChapter}:{noteDialog?.verseNum}</DialogTitle>
        <DialogContent>
          {noteDialog && (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: 2 }}>
              <sup>{noteDialog.verseNum}</sup> {noteDialog.verseText}
            </Typography>
          )}
          <Box display="flex" flexDirection="column" gap={2}>
            <TextField label="Title" fullWidth value={noteForm.title} onChange={e => setNoteForm(f => ({ ...f, title: e.target.value }))} />
            <TextField label="Note" multiline rows={4} fullWidth value={noteForm.content} onChange={e => setNoteForm(f => ({ ...f, content: e.target.value }))} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNoteDialog(null)}>Cancel</Button>
          <Button variant="contained" onClick={saveNote} disabled={!noteForm.title || !noteForm.content}>Save Note</Button>
        </DialogActions>
      </Dialog>

      {/* Highlight color picker */}
      <Dialog open={!!highlightVerse} onClose={() => setHighlightVerse(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Highlight Verse {selectedChapter}:{highlightVerse?.verseNum}</DialogTitle>
        <DialogContent>
          <Box display="flex" gap={1} flexWrap="wrap">
            {HIGHLIGHT_COLORS.map((color, i) => (
              <Button key={color} variant="contained" onClick={() => saveHighlight(color)}
                sx={{ bgcolor: color, color: '#333', '&:hover': { bgcolor: color, opacity: 0.85 } }}>
                {['Yellow', 'Green', 'Blue', 'Pink', 'Purple'][i]}
              </Button>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHighlightVerse(null)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
