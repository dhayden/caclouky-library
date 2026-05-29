import { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Checkbox, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, FormControlLabel, IconButton, Paper, Snackbar,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Typography
} from '@mui/material';
import { Add, Delete, Edit, LocalLibrary } from '@mui/icons-material';
import type { Book } from '../../types';
import * as api from '../../api';

const EMPTY: Partial<Book> = {
  title: '', author: '', isbn: '', genre: '', publisher: '',
  publishedYear: undefined, totalCopies: 1, availableCopies: 1,
  coverImageUrl: '', description: '', isRestricted: false,
};

export default function ManageBooks() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Book>>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; severity: 'success' | 'error' } | null>(null);

  const load = () => {
    setLoading(true);
    api.getBooks({ pageSize: 100 }).then(r => setBooks(r.data.books)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const openAdd = () => { setForm(EMPTY); setOpen(true); };
  const openEdit = (b: Book) => { setForm(b); setOpen(true); };

  const save = async () => {
    setSaving(true);
    try {
      if (form.id) await api.updateBook(form.id, form);
      else await api.createBook(form);
      setToast({ msg: 'Book saved.', severity: 'success' });
      setOpen(false);
      load();
    } catch (err: any) {
      setToast({ msg: err.response?.data?.title ?? 'Save failed.', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (b: Book) => {
    if (!window.confirm(`Delete "${b.title}"? This cannot be undone.`)) return;
    await api.deleteBook(b.id);
    setToast({ msg: 'Book deleted.', severity: 'success' });
    load();
  };

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">Manage Books</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={openAdd}>Add Book</Button>
      </Box>

      {loading ? <CircularProgress /> : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead><TableRow>
              <TableCell>Cover</TableCell><TableCell>Title / Author</TableCell>
              <TableCell>ISBN</TableCell><TableCell>Genre</TableCell>
              <TableCell>Copies</TableCell><TableCell>Actions</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {books.map(b => (
                <TableRow key={b.id}>
                  <TableCell>
                    {b.coverImageUrl
                      ? <Box component="img" src={b.coverImageUrl} sx={{ width: 40, height: 56, objectFit: 'cover' }} />
                      : <LocalLibrary color="disabled" />}
                  </TableCell>
                  <TableCell>
                    <Typography fontWeight="bold">{b.title}</Typography>
                    <Typography variant="caption" color="text.secondary">{b.author}</Typography>
                  </TableCell>
                  <TableCell>{b.isbn}</TableCell>
                  <TableCell>{b.genre}</TableCell>
                  <TableCell>{b.availableCopies}/{b.totalCopies}</TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => openEdit(b)}><Edit fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => remove(b)}><Delete fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{form.id ? 'Edit Book' : 'Add Book'}</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} pt={1}>
            <TextField label="Title" value={form.title ?? ''} onChange={set('title')} required fullWidth />
            <TextField label="Author" value={form.author ?? ''} onChange={set('author')} required fullWidth />
            <Box display="flex" gap={2}>
              <TextField label="ISBN" value={form.isbn ?? ''} onChange={set('isbn')} required fullWidth />
              <TextField label="Genre" value={form.genre ?? ''} onChange={set('genre')} fullWidth />
            </Box>
            <Box display="flex" gap={2}>
              <TextField label="Publisher" value={form.publisher ?? ''} onChange={set('publisher')} fullWidth />
              <TextField label="Year" type="number" value={form.publishedYear ?? ''} onChange={set('publishedYear')} fullWidth />
            </Box>
            <Box display="flex" gap={2}>
              <TextField label="Total Copies" type="number" value={form.totalCopies ?? 1} onChange={set('totalCopies')} required fullWidth inputProps={{ min: 1 }} />
              <TextField label="Available Copies" type="number" value={form.availableCopies ?? 0} onChange={set('availableCopies')} required fullWidth inputProps={{ min: 0 }} />
            </Box>
            <TextField label="Cover Image URL" value={form.coverImageUrl ?? ''} onChange={set('coverImageUrl')} fullWidth />
            <TextField label="Description" value={form.description ?? ''} onChange={set('description')} fullWidth multiline rows={3} />
            <FormControlLabel control={<Checkbox checked={form.isRestricted ?? false} onChange={set('isRestricted')} />} label="Ministers Only" />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={saving || !form.title || !form.author || !form.isbn}>
            {saving ? <CircularProgress size={20} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)}>
        <Alert severity={toast?.severity} onClose={() => setToast(null)}>{toast?.msg}</Alert>
      </Snackbar>
    </Box>
  );
}
