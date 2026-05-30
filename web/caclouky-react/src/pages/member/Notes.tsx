import { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Card, CardActions, CardContent, CircularProgress,
  Dialog, DialogActions, DialogContent, DialogTitle, IconButton,
  Snackbar, TextField, Typography,
} from '@mui/material';
import { Add, Delete, Edit } from '@mui/icons-material';
import type { UserNote } from '../../types';
import * as api from '../../api';

const EMPTY = { title: '', content: '', sourceType: '', sourceRef: '' };

export default function Notes() {
  const [notes, setNotes] = useState<UserNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  const load = () => {
    setLoading(true);
    api.getNotes().then(r => setNotes(r.data)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setForm(EMPTY); setEditId(null); setOpen(true); };
  const openEdit = (n: UserNote) => {
    setForm({ title: n.title, content: n.content, sourceType: n.sourceType ?? '', sourceRef: n.sourceRef ?? '' });
    setEditId(n.id);
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const data = { title: form.title, content: form.content, sourceType: form.sourceType || undefined, sourceRef: form.sourceRef || undefined };
      if (editId) await api.updateNote(editId, data);
      else await api.createNote(data);
      setOpen(false);
      setToast('Note saved.');
      load();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    await api.deleteNote(id);
    setToast('Note deleted.');
    load();
  };

  if (loading) return <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>;

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">My Notes</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={openNew}>New Note</Button>
      </Box>

      {notes.length === 0 && (
        <Typography color="text.secondary">No notes yet. Create one to get started.</Typography>
      )}

      <Box display="flex" flexWrap="wrap" gap={2}>
        {notes.map(n => (
          <Card key={n.id} sx={{ width: 300, display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flex: 1 }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>{n.title}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                {n.content.length > 200 ? n.content.slice(0, 200) + '…' : n.content}
              </Typography>
              {n.sourceRef && (
                <Typography variant="caption" color="primary.main" display="block" mt={1}>
                  {n.sourceType === 'bible' ? '📖' : '📜'} {n.sourceRef}
                </Typography>
              )}
              <Typography variant="caption" color="text.disabled" display="block" mt={1}>
                {new Date(n.updatedAt).toLocaleDateString()}
              </Typography>
            </CardContent>
            <CardActions>
              <IconButton size="small" onClick={() => openEdit(n)}><Edit fontSize="small" /></IconButton>
              <IconButton size="small" color="error" onClick={() => remove(n.id)}><Delete fontSize="small" /></IconButton>
            </CardActions>
          </Card>
        ))}
      </Box>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editId ? 'Edit Note' : 'New Note'}</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} pt={1}>
            <TextField label="Title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required fullWidth />
            <TextField
              label="Content" value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              multiline rows={6} fullWidth
            />
            <TextField
              label="Reference (optional)" placeholder="e.g. John 3:16 or sermon 441003 p.15"
              value={form.sourceRef} onChange={e => setForm(f => ({ ...f, sourceRef: e.target.value }))} fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={saving || !form.title || !form.content}>
            {saving ? <CircularProgress size={20} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast('')}>
        <Alert severity="success" onClose={() => setToast('')}>{toast}</Alert>
      </Snackbar>
    </Box>
  );
}
