import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert, Box, Button, Card, CardContent, CircularProgress,
  Paper, Snackbar, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Typography
} from '@mui/material';
import { AssignmentReturn, EventNote, Warning } from '@mui/icons-material';
import type { Checkout, Reservation } from '../../types';
import * as api from '../../api';

export default function AdminDashboard() {
  const [checkouts, setCheckouts] = useState<Checkout[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([api.getCheckouts(), api.getReservations()]).then(([c, r]) => {
      setCheckouts(c.data);
      setReservations(r.data);
    }).finally(() => setLoading(false));
  }, []);

  const overdue = checkouts.filter(c => !c.isReturned && new Date(c.dueDate) < new Date());
  const active = checkouts.filter(c => !c.isReturned);
  const pending = reservations.filter(r => r.status === 'Pending');

  const markReady = async (id: number) => {
    await api.readyReservation(id);
    setReservations(rs => rs.map(r => r.id === id ? { ...r, status: 'Ready' } : r));
    setToast('Marked as ready for pickup.');
  };

  if (loading) return <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>;

  return (
    <Box p={3}>
      <Typography variant="h5" mb={3}>Dashboard</Typography>

      <Box display="flex" gap={2} mb={4} flexWrap="wrap">
        {[
          { label: 'Active Checkouts', value: active.length, icon: <AssignmentReturn /> },
          { label: 'Overdue', value: overdue.length, icon: <Warning />, warn: overdue.length > 0 },
          { label: 'Pending Reservations', value: pending.length, icon: <EventNote /> },
        ].map(stat => (
          <Card key={stat.label} sx={{ flex: 1, minWidth: 140 }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} color={stat.warn ? 'warning.main' : 'text.secondary'}>
                {stat.icon}
                <Typography variant="body2">{stat.label}</Typography>
              </Box>
              <Typography variant="h3" mt={1} color={stat.warn ? 'warning.main' : 'inherit'}>{stat.value}</Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      {overdue.length > 0 && (
        <Box mb={4}>
          <Typography variant="h6" mb={1}>Overdue Checkouts</Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead><TableRow>
                <TableCell>Member</TableCell><TableCell>Book</TableCell><TableCell>Due</TableCell>
              </TableRow></TableHead>
              <TableBody>
                {overdue.map(c => (
                  <TableRow key={c.id}>
                    <TableCell>{c.user.firstName} {c.user.lastName}</TableCell>
                    <TableCell>{c.book.title}</TableCell>
                    <TableCell sx={{ color: 'error.main' }}>{new Date(c.dueDate).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {pending.length > 0 && (
        <Box mb={4}>
          <Typography variant="h6" mb={1}>Pending Reservations</Typography>
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
                    <TableCell><Button size="small" onClick={() => markReady(r.id)}>Mark Ready</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      <Box display="flex" gap={2} flexWrap="wrap">
        <Button variant="outlined" onClick={() => navigate('/admin/books')}>Manage Books</Button>
        <Button variant="outlined" onClick={() => navigate('/admin/checkouts')}>Manage Checkouts</Button>
        <Button variant="outlined" onClick={() => navigate('/admin/members')}>Manage Members</Button>
      </Box>

      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast('')}>
        <Alert severity="success" onClose={() => setToast('')}>{toast}</Alert>
      </Snackbar>
    </Box>
  );
}
