import { useCallback, useEffect, useState } from 'react';
import {
  Box, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  Button, Divider, FormControl, InputLabel, MenuItem, Paper, Select,
  TextField, Typography, IconButton, Tooltip,
} from '@mui/material';
import { Search, History, Delete, Close, Bookmark } from '@mui/icons-material';
import type { BibleVerse, SearchHistory, UserHighlight } from '../../types';
import * as api from '../../api';
import { useAuth } from '../../auth/AuthContext';

const HIGHLIGHT_COLORS = ['#FFD700', '#90EE90', '#87CEEB', '#FFB6C1', '#DDA0DD'];

export default function BibleSearch() {
  const { isLoggedIn } = useAuth();
  const [books, setBooks] = useState<string[]>([]);
  const [selectedBook, setSelectedBook] = useState('');
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [chapterVerses, setChapterVerses] = useState<BibleVerse[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<BibleVerse[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<SearchHistory[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [highlights, setHighlights] = useState<UserHighlight[]>([]);
  const [verseDialog, setVerseDialog] = useState<BibleVerse | null>(null);

  useEffect(() => { api.getBibleBooks().then(r => { setBooks(r.data); if (r.data.length) setSelectedBook(r.data[0]); }); }, []);

  const loadHighlights = useCallback(async () => {
    if (!isLoggedIn()) return;
    const res = await api.getHighlights('bible');
    setHighlights(res.data);
  }, [isLoggedIn]);

  const loadHistory = useCallback(async () => {
    if (!isLoggedIn()) return;
    const res = await api.getSearchHistory('bible');
    setHistory(res.data);
  }, [isLoggedIn]);

  useEffect(() => { loadHighlights(); loadHistory(); }, [loadHighlights, loadHistory]);

  useEffect(() => {
    if (!selectedBook) return;
    setLoading(true);
    api.getBibleChapter(selectedBook, selectedChapter)
      .then(r => setChapterVerses(r.data))
      .catch(() => setChapterVerses([]))
      .finally(() => setLoading(false));
  }, [selectedBook, selectedChapter]);

  const doSearch = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    if (isLoggedIn()) api.saveSearchHistory(q, 'bible').then(loadHistory);
    try {
      const res = await api.searchBible(q);
      setSearchResults(res.data);
    } finally {
      setLoading(false);
    }
  };

  const highlight = async (verse: BibleVerse) => {
    if (!isLoggedIn()) return;
    const ref = `${verse.book}:${verse.chapter}:${verse.verse}`;
    const color = HIGHLIGHT_COLORS[highlights.length % HIGHLIGHT_COLORS.length];
    await api.createHighlight('bible', ref, verse.text, color);
    loadHighlights();
  };

  const isHighlighted = (verse: BibleVerse) =>
    highlights.find(h => h.sourceRef === `${verse.book}:${verse.chapter}:${verse.verse}`);

  const maxChapter = chapterVerses.length > 0 ? (chapterVerses[chapterVerses.length - 1]?.chapter ?? selectedChapter) : selectedChapter;

  const verses = searchResults ?? chapterVerses;

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
        <Typography variant="h5" fontWeight="bold">King James Bible</Typography>
        {isLoggedIn() && (
          <Tooltip title="Search history">
            <IconButton onClick={() => { setHistoryOpen(true); loadHistory(); }}><History /></IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Search bar */}
      <Box display="flex" gap={1} mb={3}>
        <TextField
          fullWidth size="small" placeholder="Search for a word or phrase…"
          value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { setSearchResults(null); doSearch(searchQuery); } }}
        />
        <Button variant="contained" startIcon={<Search />} onClick={() => doSearch(searchQuery)} disabled={loading}>
          Search
        </Button>
        {searchResults && (
          <Button variant="outlined" onClick={() => { setSearchResults(null); setSearchQuery(''); }}>
            Clear
          </Button>
        )}
      </Box>

      {/* Book + chapter nav (shown when not searching) */}
      {!searchResults && (
        <Box display="flex" gap={2} mb={3} flexWrap="wrap" alignItems="center">
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Book</InputLabel>
            <Select value={selectedBook} label="Book" onChange={e => { setSelectedBook(e.target.value); setSelectedChapter(1); }}>
              {books.map(b => <MenuItem key={b} value={b}>{b}</MenuItem>)}
            </Select>
          </FormControl>
          <Box display="flex" alignItems="center" gap={1}>
            <Button size="small" disabled={selectedChapter <= 1} onClick={() => setSelectedChapter(c => c - 1)}>‹</Button>
            <Typography variant="body2">Chapter {selectedChapter}</Typography>
            <Button size="small" onClick={() => setSelectedChapter(c => c + 1)}>›</Button>
          </Box>
        </Box>
      )}

      {searchResults && (
        <Typography variant="body2" color="text.secondary" mb={2}>
          {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{searchQuery}"
        </Typography>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>
      ) : (
        <Paper variant="outlined">
          {verses.map((v, i) => {
            const hl = isHighlighted(v);
            return (
              <Box key={v.id}>
                {i > 0 && searchResults && <Divider />}
                <Box
                  px={2} py={1.5}
                  display="flex" gap={1.5} alignItems="flex-start"
                  sx={{ bgcolor: hl ? hl.color + '44' : 'transparent', cursor: 'pointer', '&:hover': { bgcolor: hl ? hl.color + '66' : 'action.hover' } }}
                  onClick={() => setVerseDialog(v)}
                >
                  <Typography variant="caption" color="primary.main" fontWeight="bold" minWidth={searchResults ? 120 : 24} mt={0.3}>
                    {searchResults ? `${v.book} ${v.chapter}:${v.verse}` : v.verse}
                  </Typography>
                  <Typography variant="body1" flex={1}>{v.text}</Typography>
                  {isLoggedIn() && (
                    <Tooltip title={hl ? 'Highlighted' : 'Highlight verse'}>
                      <IconButton size="small" onClick={e => { e.stopPropagation(); highlight(v); }}>
                        <Bookmark fontSize="small" color={hl ? 'warning' : 'disabled'} />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </Box>
            );
          })}
          {verses.length === 0 && (
            <Box p={4} textAlign="center">
              <Typography color="text.secondary">
                {searchResults ? 'No results found.' : 'Loading…'}
              </Typography>
            </Box>
          )}
        </Paper>
      )}

      {/* Verse detail dialog */}
      <Dialog open={!!verseDialog} onClose={() => setVerseDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{verseDialog && `${verseDialog.book} ${verseDialog.chapter}:${verseDialog.verse}`}</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ fontStyle: 'italic', lineHeight: 2 }}>{verseDialog?.text}</Typography>
        </DialogContent>
        <DialogActions>
          {isLoggedIn() && verseDialog && (
            <Button startIcon={<Bookmark />} onClick={() => { highlight(verseDialog); setVerseDialog(null); }}>
              Highlight
            </Button>
          )}
          <Button onClick={() => setVerseDialog(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* History drawer */}
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
    </Box>
  );
}
