import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Alert, Box, Button, Chip, CircularProgress, Divider, Snackbar, Typography
} from '@mui/material';
import { ArrowBack, LocalLibrary } from '@mui/icons-material';
import type { Book } from '../../types';
import * as api from '../../api';
import { useAuth } from '../../auth/AuthContext';

export default function BookDetail() {
  const { id } = useParams<{ id: string }>();
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [reserving, setReserving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; severity: 'success' | 'error' } | null>(null);
  const auth = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;
    api.getBook(Number(id)).then(r => setBook(r.data)).finally(() => setLoading(false));
  }, [id]);

  const reserve = async () => {
    if (!book) return;
    setReserving(true);
    try {
      await api.createReservation(book.id);
      setToast({ msg: 'Reservation placed successfully!', severity: 'success' });
    } catch (err: any) {
      setToast({ msg: err.response?.data?.message ?? 'Could not reserve book.', severity: 'error' });
    } finally {
      setReserving(false);
    }
  };

  if (loading) return <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>;
  if (!book) return <Typography p={4}>Book not found.</Typography>;

  return (
    <Box p={4} maxWidth={800} mx="auto">
      <Button startIcon={<ArrowBack />} onClick={() => navigate('/catalog')} sx={{ mb: 3 }}>Back</Button>
      <Box display="flex" gap={4} flexWrap="wrap">
        <Box flexShrink={0}>
          {book.coverImageUrl ? (
            <Box component="img" src={book.coverImageUrl} alt={book.title} sx={{ width: 220, borderRadius: 1, boxShadow: 3 }} />
          ) : (
            <Box width={220} height={300} display="flex" alignItems="center" justifyContent="center" bgcolor="grey.100" borderRadius={1}>
              <LocalLibrary sx={{ fontSize: 80, color: 'grey.400' }} />
            </Box>
          )}
        </Box>
        <Box flex={1} minWidth={200}>
          <Typography variant="h4" fontWeight="bold">{book.title}</Typography>
          <Typography variant="h6" color="text.secondary" mb={2}>by {book.author}</Typography>
          <Box display="flex" gap={1} mb={2} flexWrap="wrap">
            {book.genre && <Chip label={book.genre} />}
            {book.publishedYear && <Chip label={String(book.publishedYear)} variant="outlined" />}
            {book.isRestricted && <Chip label="Ministers Only" color="warning" />}
          </Box>
          <Divider sx={{ my: 2 }} />
          <Typography color={book.availableCopies > 0 ? 'success.main' : 'error.main'} fontWeight="bold" mb={1}>
            {book.availableCopies} of {book.totalCopies} copies available
          </Typography>
          {book.isbn && <Typography variant="body2" mb={0.5}>ISBN: {book.isbn}</Typography>}
          {book.publisher && <Typography variant="body2" mb={0.5}>Publisher: {book.publisher}</Typography>}
          {book.description && <Typography variant="body2" mt={2}>{book.description}</Typography>}
          <Box mt={3}>
            {!auth.isLoggedIn() ? (
              <Button variant="outlined" onClick={() => navigate('/login')}>Log in to reserve</Button>
            ) : (
              <Button variant="contained" onClick={reserve} disabled={reserving}>
                {reserving ? <><CircularProgress size={20} sx={{ mr: 1 }} />Reserving…</> :
                  book.availableCopies === 0 ? 'Reserve (join waitlist)' : 'Reserve'}
              </Button>
            )}
          </Box>
        </Box>
      </Box>
      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)}>
        <Alert severity={toast?.severity} onClose={() => setToast(null)}>{toast?.msg}</Alert>
      </Snackbar>
    </Box>
  );
}
