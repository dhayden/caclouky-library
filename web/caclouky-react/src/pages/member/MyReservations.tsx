import { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Paper, Snackbar, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, Typography
} from '@mui/material';
import type { Reservation } from '../../types';
import * as api from '../../api';

const STATUS_COLORS: Record<string, 'warning' | 'success' | 'info' | 'default'> = {
  Pending: 'warning', Ready: 'success', Fulfilled: 'info', Cancelled: 'default',
};

export default function MyReservations() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  useEffect(() => {
    api.getReservations().then(r => setReservations(r.data)).finally(() => setLoading(false));
  }, []);

  const cancel = async (id: number) => {
    await api.cancelReservation(id);
    setReservations(rs => rs.map(r => r.id === id ? { ...r, status: 'Cancelled' } : r));
    setToast('Reservation cancelled.');
  };

  if (loading) return <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>;

  return (
    <Box p={3}>
      <Typography variant="h5" mb={3}>My Reservations</Typography>
      {reservations.length === 0 ? (
        <Typography color="text.secondary">You have no reservations yet.</Typography>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Book</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Reserved On</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reservations.map(r => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Typography fontWeight="bold">{r.book.title}</Typography>
                    <Typography variant="body2" color="text.secondary">{r.book.author}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={r.status} size="small" color={STATUS_COLORS[r.status]} />
                  </TableCell>
                  <TableCell>{new Date(r.reservedAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {(r.status === 'Pending' || r.status === 'Ready') && (
                      <Button size="small" color="error" onClick={() => cancel(r.id)}>Cancel</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast('')}>
        <Alert severity="success" onClose={() => setToast('')}>{toast}</Alert>
      </Snackbar>
    </Box>
  );
}
