import { useEffect, useState } from 'react';
import {
  Alert, Box, Button, CircularProgress, Paper, Snackbar, Tab, Tabs,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography
} from '@mui/material';
import type { Reservation } from '../../types';
import * as api from '../../api';

export default function ManageReservations() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [toast, setToast] = useState<{ msg: string; severity: 'success' | 'error' } | null>(null);

  const load = () => {
    setLoading(true);
    api.getReservations().then(r => setReservations(r.data)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const pending = reservations.filter(r => r.status === 'Pending');
  const ready = reservations.filter(r => r.status === 'Ready');

  const markReady = async (id: number) => {
    await api.readyReservation(id);
    setToast({ msg: 'Marked as ready for pickup.', severity: 'success' });
    load();
  };

  const processCheckout = async (r: Reservation) => {
    try {
      await api.createCheckout(r.book.id, r.user.id);
      await api.fulfillReservation(r.id);
      setToast({ msg: `Checkout processed for ${r.user.firstName} ${r.user.lastName}.`, severity: 'success' });
      load();
    } catch {
      setToast({ msg: 'Checkout failed.', severity: 'error' });
    }
  };

  const cancel = async (id: number) => {
    await api.cancelReservation(id);
    setToast({ msg: 'Reservation cancelled.', severity: 'success' });
    load();
  };

  if (loading) return <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>;

  return (
    <Box p={3}>
      <Typography variant="h5" mb={2}>Manage Reservations</Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label={`Pending (${pending.length})`} />
        <Tab label={`Ready for Pickup (${ready.length})`} />
      </Tabs>

      {tab === 0 && (
        pending.length === 0 ? <Typography color="text.secondary">No pending reservations.</Typography> : (
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead><TableRow>
                <TableCell>Member</TableCell><TableCell>Book</TableCell><TableCell>Reserved</TableCell><TableCell>Action</TableCell>
              </TableRow></TableHead>
              <TableBody>
                {pending.map(r => (
                  <TableRow key={r.id}>
                    <TableCell>{r.user.firstName} {r.user.lastName}</TableCell>
                    <TableCell>{r.book.title}</TableCell>
                    <TableCell>{new Date(r.reservedAt).toLocaleDateString()}</TableCell>
                    <TableCell><Button size="small" variant="outlined" onClick={() => markReady(r.id)}>Mark Ready</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )
      )}

      {tab === 1 && (
        ready.length === 0 ? <Typography color="text.secondary">No reservations ready for pickup.</Typography> : (
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead><TableRow>
                <TableCell>Member</TableCell><TableCell>Book</TableCell><TableCell>Ready Since</TableCell><TableCell>Actions</TableCell>
              </TableRow></TableHead>
              <TableBody>
                {ready.map(r => (
                  <TableRow key={r.id}>
                    <TableCell>{r.user.firstName} {r.user.lastName}</TableCell>
                    <TableCell>{r.book.title}</TableCell>
                    <TableCell>{r.availableAt ? new Date(r.availableAt).toLocaleDateString() : '—'}</TableCell>
                    <TableCell sx={{ display: 'flex', gap: 1 }}>
                      <Button size="small" variant="contained" onClick={() => processCheckout(r)}>Process Checkout</Button>
                      <Button size="small" color="error" onClick={() => cancel(r.id)}>Cancel</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )
      )}

      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)}>
        <Alert severity={toast?.severity} onClose={() => setToast(null)}>{toast?.msg}</Alert>
      </Snackbar>
    </Box>
  );
}
