import { useEffect, useState } from 'react';
import {
  Alert, Box, Button, CircularProgress, Paper, Snackbar, Tab, Tabs,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography
} from '@mui/material';
import type { Checkout } from '../../types';
import * as api from '../../api';

export default function ManageCheckouts() {
  const [checkouts, setCheckouts] = useState<Checkout[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [toast, setToast] = useState<{ msg: string; severity: 'success' | 'error' } | null>(null);

  const load = () => {
    setLoading(true);
    api.getCheckouts().then(r => setCheckouts(r.data)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const active = checkouts.filter(c => !c.isReturned);
  const history = checkouts.filter(c => c.isReturned);
  const isOverdue = (c: Checkout) => !c.isReturned && new Date(c.dueDate) < new Date();

  const returnBook = async (c: Checkout) => {
    try {
      const res = await api.returnCheckout(c.id);
      const fee = (res.data as any).lateFee;
      setToast({ msg: fee > 0 ? `Returned. Late fee: $${fee.toFixed(2)}` : 'Book returned successfully.', severity: 'success' });
      load();
    } catch {
      setToast({ msg: 'Return failed.', severity: 'error' });
    }
  };

  if (loading) return <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>;

  return (
    <Box p={3}>
      <Typography variant="h5" mb={2}>Manage Checkouts</Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label={`Active (${active.length})`} />
        <Tab label={`History (${history.length})`} />
      </Tabs>

      {tab === 0 && (
        active.length === 0 ? <Typography color="text.secondary">No active checkouts.</Typography> : (
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead><TableRow>
                <TableCell>Member</TableCell><TableCell>Book</TableCell>
                <TableCell>Checked Out</TableCell><TableCell>Due Date</TableCell><TableCell>Action</TableCell>
              </TableRow></TableHead>
              <TableBody>
                {active.map(c => (
                  <TableRow key={c.id}>
                    <TableCell>{c.user.firstName} {c.user.lastName}</TableCell>
                    <TableCell>{c.book.title}</TableCell>
                    <TableCell>{new Date(c.checkedOutAt).toLocaleDateString()}</TableCell>
                    <TableCell sx={isOverdue(c) ? { color: 'error.main', fontWeight: 'bold' } : {}}>
                      {new Date(c.dueDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell><Button size="small" variant="outlined" onClick={() => returnBook(c)}>Return</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )
      )}

      {tab === 1 && (
        history.length === 0 ? <Typography color="text.secondary">No returned checkouts.</Typography> : (
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead><TableRow>
                <TableCell>Member</TableCell><TableCell>Book</TableCell>
                <TableCell>Checked Out</TableCell><TableCell>Returned</TableCell><TableCell>Late Fee</TableCell>
              </TableRow></TableHead>
              <TableBody>
                {history.map(c => (
                  <TableRow key={c.id}>
                    <TableCell>{c.user.firstName} {c.user.lastName}</TableCell>
                    <TableCell>{c.book.title}</TableCell>
                    <TableCell>{new Date(c.checkedOutAt).toLocaleDateString()}</TableCell>
                    <TableCell>{c.returnedAt ? new Date(c.returnedAt).toLocaleDateString() : '—'}</TableCell>
                    <TableCell>{c.lateFee ? `$${c.lateFee.toFixed(2)}` : '—'}</TableCell>
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
