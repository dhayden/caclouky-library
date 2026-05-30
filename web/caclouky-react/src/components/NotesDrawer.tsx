import { useCallback, useEffect, useState } from 'react';
import {
  Badge, Box, Button, Divider, Drawer, IconButton, TextField,
  Tooltip, Typography, Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import { NoteAlt, Add, Edit, Delete, Close } from '@mui/icons-material';
import type { UserNote } from '../types';
import * as api from '../api';

export default function NotesDrawer() {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState<UserNote[]>([]);
  const [editNote, setEditNote] = useState<UserNote | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [form, setForm] = useState({ title: '', content: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api.getNotes().then(r => setNotes(r.data)).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  const openEdit = (n: UserNote) => {
    setForm({ title: n.title, content: n.content });
    setEditNote(n);
  };

  const openNew = () => {
    setForm({ title: '', content: '' });
    setNewOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      if (editNote) await api.updateNote(editNote.id, { ...form });
      else await api.createNote({ ...form });
      setEditNote(null);
      setNewOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    await api.deleteNote(id);
    load();
  };

  return (
    <>
      <Tooltip title="My Notes">
        <IconButton color="inherit" onClick={() => { setOpen(true); load(); }}>
          <Badge badgeContent={notes.length || null} color="warning">
            <NoteAlt />
          </Badge>
        </IconButton>
      </Tooltip>

      <Drawer anchor="right" open={open} onClose={() => setOpen(false)}
        PaperProps={{ sx: { width: 360 } }}>
        <Box p={2} display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">My Notes</Typography>
          <Box display="flex" gap={1}>
            <Button size="small" variant="contained" startIcon={<Add />} onClick={openNew}>New</Button>
            <IconButton size="small" onClick={() => setOpen(false)}><Close /></IconButton>
          </Box>
        </Box>
        <Divider />

        <Box flex={1} overflow="auto" p={1}>
          {notes.length === 0 && (
            <Box p={3} textAlign="center">
              <Typography color="text.secondary" variant="body2">No notes yet.</Typography>
              <Typography color="text.secondary" variant="caption">
                Add notes from the Sermon Search or Bible pages using the 📝 buttons.
              </Typography>
            </Box>
          )}
          {notes.map(n => (
            <Box key={n.id} p={1.5} mb={1} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', '&:hover': { borderColor: 'primary.light' } }}>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                <Typography variant="subtitle2" fontWeight="bold">{n.title}</Typography>
                <Box display="flex" gap={0.5}>
                  <IconButton size="small" onClick={() => openEdit(n)}><Edit fontSize="small" /></IconButton>
                  <IconButton size="small" color="error" onClick={() => remove(n.id)}><Delete fontSize="small" /></IconButton>
                </Box>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
                {n.content.length > 150 ? n.content.slice(0, 150) + '…' : n.content}
              </Typography>
              {n.sourceRef && (
                <Typography variant="caption" color="primary.main" display="block" mt={0.5}>
                  {n.sourceType === 'bible' ? '📖' : '📜'} {n.sourceRef}
                </Typography>
              )}
              <Typography variant="caption" color="text.disabled">
                {new Date(n.updatedAt).toLocaleDateString()}
              </Typography>
            </Box>
          ))}
        </Box>
      </Drawer>

      {/* Create / Edit dialog */}
      <Dialog open={!!editNote || newOpen} onClose={() => { setEditNote(null); setNewOpen(false); }} maxWidth="sm" fullWidth>
        <DialogTitle>{editNote ? 'Edit Note' : 'New Note'}</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} pt={1}>
            <TextField label="Title" fullWidth value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            <TextField label="Note" multiline rows={5} fullWidth value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setEditNote(null); setNewOpen(false); }}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={saving || !form.title || !form.content}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
