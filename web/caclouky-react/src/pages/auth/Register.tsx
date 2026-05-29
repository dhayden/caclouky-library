import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Box, Button, Card, CardContent, CircularProgress, TextField, Typography, Alert } from '@mui/material';
import * as api from '../../api';

export default function Register() {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.register(form);
      navigate('/login');
    } catch (err: any) {
      setError(err.response?.data?.title ?? 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
      <Card sx={{ width: 400, p: 2 }}>
        <CardContent>
          <Typography variant="h5" mb={3} textAlign="center">Create Account</Typography>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Box component="form" onSubmit={handleSubmit} display="flex" flexDirection="column" gap={2}>
            <Box display="flex" gap={2}>
              <TextField label="First Name" value={form.firstName} onChange={set('firstName')} required fullWidth />
              <TextField label="Last Name" value={form.lastName} onChange={set('lastName')} required fullWidth />
            </Box>
            <TextField label="Email" type="email" value={form.email} onChange={set('email')} required fullWidth />
            <TextField label="Password" type="password" value={form.password} onChange={set('password')} required fullWidth inputProps={{ minLength: 6 }} />
            <Button type="submit" variant="contained" size="large" disabled={loading}>
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Register'}
            </Button>
            <Typography variant="body2" textAlign="center">
              Already have an account? <Link to="/login">Sign in</Link>
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
