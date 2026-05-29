import { useEffect, useState } from 'react';
import {
  Box, Chip, CircularProgress, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Typography
} from '@mui/material';
import { Warning } from '@mui/icons-material';
import type { Checkout } from '../../types';
import * as api from '../../api';

export default function MyCheckouts() {
  const [checkouts, setCheckouts] = useState<Checkout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getCheckouts().then(r => setCheckouts(r.data)).finally(() => setLoading(false));
  }, []);

  const isOverdue = (c: Checkout) => !c.isReturned && new Date(c.dueDate) < new Date();

  if (loading) return <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>;

  return (
    <Box p={3}>
      <Typography variant="h5" mb={3}>My Checkouts</Typography>
      {checkouts.length === 0 ? (
        <Typography color="text.secondary">You have no checkouts.</Typography>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Book</TableCell>
                <TableCell>Checked Out</TableCell>
                <TableCell>Due Date</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {checkouts.map(c => (
                <TableRow key={c.id} sx={isOverdue(c) ? { bgcolor: 'error.50' } : {}}>
                  <TableCell>
                    <Typography fontWeight="bold">{c.book.title}</Typography>
                    <Typography variant="body2" color="text.secondary">{c.book.author}</Typography>
                  </TableCell>
                  <TableCell>{new Date(c.checkedOutAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={0.5} color={isOverdue(c) ? 'error.main' : 'inherit'}>
                      {isOverdue(c) && <Warning fontSize="small" />}
                      {new Date(c.dueDate).toLocaleDateString()}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {c.isReturned
                      ? <Chip label={`Returned ${new Date(c.returnedAt!).toLocaleDateString()}`} size="small" />
                      : isOverdue(c)
                        ? <Chip label="Overdue" size="small" color="error" />
                        : <Chip label="Active" size="small" color="success" />}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
