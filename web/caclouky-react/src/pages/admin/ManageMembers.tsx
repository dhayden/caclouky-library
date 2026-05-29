import { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Checkbox, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, FormControl, FormControlLabel, IconButton,
  InputLabel, MenuItem, Paper, Select, Snackbar, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Typography
} from '@mui/material';
import { Add, Edit, PersonOff } from '@mui/icons-material';
import type { Member } from '../../types';
import * as api from '../../api';

const EMPTY_FORM = { firstName: '', lastName: '', email: '', password: '', phone: '', address: '', role: 'GeneralAssembly', isActive: true };

export default function ManageMembers() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<typeof EMPTY_FORM & { id?: string }>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; severity: 'success' | 'error' } | null>(null);

  const load = () => {
    setLoading(true);
    api.getMembers().then(r => setMembers(r.data)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const set = (field: string) => (e: any) =>
    setForm(f => ({ ...f, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const openAdd = () => { setForm(EMPTY_FORM); setEditId(null); setOpen(true); };
  const openEdit = (m: Member) => {
    setForm({ firstName: m.firstName, lastName: m.lastName, email: m.email, password: '', phone: m.phone ?? '', address: m.address ?? '', role: m.roles[0] ?? 'GeneralAssembly', isActive: m.isActive });
    setEditId(m.id);
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      if (editId) await api.updateMember(editId, { firstName: form.firstName, lastName: form.lastName, email: form.email, phone: form.phone, address: form.address, role: form.role, isActive: form.isActive });
      else await api.createMember(form);
      setToast({ msg: 'Member saved.', severity: 'success' });
      setOpen(false);
      load();
    } catch (err: any) {
      const errs = err.response?.data?.errors;
      const msg = errs ? Object.values(errs).flat().join(', ') : (err.response?.data?.title ?? 'Save failed.');
      setToast({ msg: String(msg), severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async (m: Member) => {
    if (!window.confirm(`Deactivate ${m.firstName} ${m.lastName}?`)) return;
    await api.deactivateMember(m.id);
    load();
  };

  const roleColor = (role: string) => role === 'Admin' ? 'secondary' : role === 'Minister' ? 'primary' : 'default';

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">Members</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={openAdd}>Add Member</Button>
      </Box>

      {loading ? <CircularProgress /> : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead><TableRow>
              <TableCell>Name</TableCell><TableCell>Email</TableCell><TableCell>Phone</TableCell>
              <TableCell>Role</TableCell><TableCell>Status</TableCell><TableCell>Since</TableCell><TableCell>Actions</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {members.map(m => (
                <TableRow key={m.id}>
                  <TableCell>{m.lastName}, {m.firstName}</TableCell>
                  <TableCell>{m.email}</TableCell>
                  <TableCell>{m.phone || '—'}</TableCell>
                  <TableCell><Chip label={m.roles[0]} size="small" color={roleColor(m.roles[0]) as any} /></TableCell>
                  <TableCell><Chip label={m.isActive ? 'Active' : 'Inactive'} size="small" color={m.isActive ? 'success' : 'error'} /></TableCell>
                  <TableCell>{new Date(m.memberSince).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => openEdit(m)}><Edit fontSize="small" /></IconButton>
                    {m.isActive && <IconButton size="small" color="warning" onClick={() => deactivate(m)}><PersonOff fontSize="small" /></IconButton>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editId ? 'Edit Member' : 'Add Member'}</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} pt={1}>
            <Box display="flex" gap={2}>
              <TextField label="First Name" value={form.firstName} onChange={set('firstName')} required fullWidth />
              <TextField label="Last Name" value={form.lastName} onChange={set('lastName')} required fullWidth />
            </Box>
            <TextField label="Email" type="email" value={form.email} onChange={set('email')} required fullWidth />
            {!editId && <TextField label="Password" type="password" value={form.password} onChange={set('password')} required fullWidth inputProps={{ minLength: 6 }} />}
            <Box display="flex" gap={2}>
              <TextField label="Phone" value={form.phone} onChange={set('phone')} fullWidth />
              <FormControl fullWidth required>
                <InputLabel>Role</InputLabel>
                <Select value={form.role} label="Role" onChange={set('role')}>
                  <MenuItem value="GeneralAssembly">General Assembly</MenuItem>
                  <MenuItem value="Minister">Minister</MenuItem>
                  <MenuItem value="Admin">Admin</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <TextField label="Address" value={form.address} onChange={set('address')} fullWidth />
            <FormControlLabel control={<Checkbox checked={form.isActive} onChange={set('isActive')} />} label="Active" />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={saving || !form.firstName || !form.lastName || !form.email}>
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
