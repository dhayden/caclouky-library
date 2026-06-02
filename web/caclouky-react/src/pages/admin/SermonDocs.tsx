import { useEffect, useRef, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, IconButton, LinearProgress,
  Paper, Snackbar, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Typography
} from '@mui/material';
import { Delete, Refresh, Upload } from '@mui/icons-material';
import type { SermonDoc, IndexStatus } from '../../types';
import * as api from '../../api';

export default function SermonDocs() {
  const [docs, setDocs] = useState<SermonDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [indexStatus, setIndexStatus] = useState<IndexStatus | null>(null);
  const [toast, setToast] = useState<{ msg: string; severity: 'success' | 'error' } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadDocs = () => api.getSermonDocs().then(r => setDocs(r.data)).finally(() => setLoading(false));
  useEffect(() => { loadDocs(); return () => { if (pollRef.current) clearInterval(pollRef.current); }; }, []);

  const startPolling = () => {
    pollRef.current = setInterval(async () => {
      const res = await api.getIndexStatus();
      setIndexStatus(res.data);
      if (!res.data.isRunning) {
        clearInterval(pollRef.current!);
        setIndexStatus(null);
        loadDocs();
        setToast({ msg: `Indexed ${res.data.completed} PDFs${res.data.failed > 0 ? `, ${res.data.failed} failed` : ''}.`, severity: res.data.failed > 0 ? 'error' : 'success' });
      }
    }, 2000);
  };

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await api.uploadSermonDoc(file);
      if (res.data.queued > 0) startPolling();
      else { setToast({ msg: res.data.message, severity: 'success' }); loadDocs(); }
    } catch {
      setToast({ msg: 'Upload failed.', severity: 'error' });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const indexAll = async () => {
    try {
      const res = await api.indexAllSermonDocs();
      if (res.data.queued > 0) { startPolling(); }
      else setToast({ msg: res.data.message, severity: 'success' });
    } catch (err: any) {
      setToast({ msg: err.response?.data?.message ?? 'Index failed.', severity: 'error' });
    }
  };

  const reindex = async (doc: SermonDoc) => {
    await api.reindexSermonDoc(doc.id);
    setToast({ msg: `${doc.title} re-indexed.`, severity: 'success' });
    loadDocs();
  };

  const remove = async (doc: SermonDoc) => {
    if (!window.confirm(`Delete "${doc.title}"? This cannot be undone.`)) return;
    await api.deleteSermonDoc(doc.id);
    setToast({ msg: `${doc.title} deleted.`, severity: 'success' });
    loadDocs();
  };

  const busy = uploading || !!indexStatus?.isRunning;

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="h5">Sermon Document Management</Typography>
        <Box display="flex" gap={1}>
          <input ref={fileRef} type="file" accept=".pdf,.html" hidden onChange={upload} />
          <Button variant="outlined" startIcon={<Upload />} onClick={() => fileRef.current?.click()} disabled={busy}>
            Upload PDF / HTML
          </Button>
          <Button variant="outlined" color="secondary" onClick={indexAll} disabled={busy}>
            Index All
          </Button>
        </Box>
      </Box>
      <Typography variant="body2" color="text.secondary" mb={2}>
        Upload PDF or HTML files individually, or drop files into the sermon-pdfs folder on the server and click Index All.
      </Typography>

      {uploading && (
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <CircularProgress size={20} />
          <Typography variant="body2">Uploading and indexing — this may take a minute…</Typography>
        </Box>
      )}

      {indexStatus?.isRunning && (
        <Box mb={2}>
          <Typography variant="body2" mb={0.5}>
            Indexing {indexStatus.completed} of {indexStatus.total} files… {indexStatus.currentFile}
          </Typography>
          <LinearProgress variant="determinate" value={indexStatus.total ? (indexStatus.completed / indexStatus.total) * 100 : 0} />
          {indexStatus.failed > 0 && <Typography variant="caption" color="error">{indexStatus.failed} failed</Typography>}
        </Box>
      )}

      {loading ? <CircularProgress /> : docs.length === 0 ? (
        <Typography color="text.secondary">No sermon PDFs uploaded yet.</Typography>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead><TableRow>
              <TableCell>Document</TableCell><TableCell>Pages</TableCell>
              <TableCell>Status</TableCell><TableCell>Uploaded</TableCell><TableCell>Actions</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {docs.map(doc => (
                <TableRow key={doc.id}>
                  <TableCell>
                    <Typography fontWeight="bold">{doc.title}</Typography>
                    <Typography variant="caption" color="text.secondary">{doc.fileName}</Typography>
                  </TableCell>
                  <TableCell>{doc.pageCount}</TableCell>
                  <TableCell>
                    <Chip label={doc.isIndexed ? 'Indexed' : 'Pending'} size="small" color={doc.isIndexed ? 'primary' : 'default'} />
                  </TableCell>
                  <TableCell>{new Date(doc.uploadedAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => reindex(doc)} disabled={busy} title="Re-index"><Refresh fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => remove(doc)} disabled={busy} title="Delete"><Delete fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Snackbar open={!!toast} autoHideDuration={5000} onClose={() => setToast(null)}>
        <Alert severity={toast?.severity} onClose={() => setToast(null)}>{toast?.msg}</Alert>
      </Snackbar>
    </Box>
  );
}
