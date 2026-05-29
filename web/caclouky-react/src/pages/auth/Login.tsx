import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Box, Button, Card, CardContent, CircularProgress, IconButton, InputAdornment, TextField, Typography, Alert } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useAuth } from '../../auth/AuthContext';
import * as api from '../../api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const auth = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.login(email, password);
      auth.login(res.data.token, res.data.user);
      navigate('/catalog');
    } catch {
      setError('Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
      <Card sx={{ width: 400, p: 2 }}>
        <CardContent>
          <Typography variant="h5" mb={3} textAlign="center">Sign In</Typography>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Box component="form" onSubmit={handleSubmit} display="flex" flexDirection="column" gap={2}>
            <TextField label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required fullWidth />
            <TextField
              label="Password" type={showPass ? 'text' : 'password'}
              value={password} onChange={e => setPassword(e.target.value)} required fullWidth
              InputProps={{ endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPass(v => !v)} edge="end">
                    {showPass ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )}}
            />
            <Button type="submit" variant="contained" size="large" disabled={loading || !email || !password}>
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
            </Button>
            <Typography variant="body2" textAlign="center">
              Don't have an account? <Link to="/register">Register</Link>
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
