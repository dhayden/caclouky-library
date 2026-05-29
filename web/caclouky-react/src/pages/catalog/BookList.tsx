import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, CardMedia, CardActionArea, Chip, CircularProgress,
  FormControl, Grid, InputLabel, MenuItem, Pagination, Select, TextField, Typography
} from '@mui/material';
import { LocalLibrary } from '@mui/icons-material';
import type { Book } from '../../types';
import * as api from '../../api';

const PAGE_SIZES = [12, 24, 48];

export default function BookList() {
  const [books, setBooks] = useState<Book[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [search, setSearch] = useState('');
  const [genre, setGenre] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.getGenres().then(r => setGenres(r.data));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getBooks({ search, genre, page, pageSize });
      setBooks(res.data.books);
      setTotal(res.data.total);
    } finally {
      setLoading(false);
    }
  }, [search, genre, page, pageSize]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => { setPage(1); }, [search, genre]);

  return (
    <Box p={3}>
      <Box display="flex" gap={2} mb={3} flexWrap="wrap">
        <TextField
          label="Search books…" value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{ flex: 1, minWidth: 200 }} size="small"
        />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Genre</InputLabel>
          <Select value={genre} label="Genre" onChange={e => setGenre(e.target.value)}>
            <MenuItem value="">All Genres</MenuItem>
            {genres.map(g => <MenuItem key={g} value={g}>{g}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 100 }}>
          <InputLabel>Per page</InputLabel>
          <Select value={pageSize} label="Per page" onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}>
            {PAGE_SIZES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>
      ) : (
        <>
          <Grid container spacing={2}>
            {books.map(book => (
              <Grid item key={book.id} xs={12} sm={6} md={4} lg={3}>
                <Card sx={{ height: '100%' }}>
                  <CardActionArea onClick={() => navigate(`/catalog/${book.id}`)} sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
                    {book.coverImageUrl ? (
                      <CardMedia component="img" height="180" image={book.coverImageUrl} alt={book.title} sx={{ objectFit: 'cover' }} />
                    ) : (
                      <Box height={180} display="flex" alignItems="center" justifyContent="center" bgcolor="grey.100">
                        <LocalLibrary sx={{ fontSize: 64, color: 'grey.400' }} />
                      </Box>
                    )}
                    <CardContent sx={{ flex: 1 }}>
                      <Typography variant="subtitle1" fontWeight="bold" noWrap>{book.title}</Typography>
                      <Typography variant="body2" color="text.secondary" noWrap>{book.author}</Typography>
                      <Box mt={1} display="flex" gap={0.5} flexWrap="wrap">
                        {book.genre && <Chip label={book.genre} size="small" />}
                        {book.isRestricted && <Chip label="Ministers Only" size="small" color="warning" />}
                      </Box>
                      <Typography variant="caption" color={book.availableCopies > 0 ? 'success.main' : 'error.main'} mt={1} display="block">
                        {book.availableCopies > 0 ? `${book.availableCopies} available` : 'Not available'}
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>

          {total > pageSize && (
            <Box display="flex" justifyContent="center" mt={4}>
              <Pagination count={Math.ceil(total / pageSize)} page={page} onChange={(_, v) => setPage(v)} color="primary" />
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
