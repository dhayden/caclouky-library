import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AppBar, Box, Button, IconButton, Menu, MenuItem, Toolbar, Typography
} from '@mui/material';
import { AccountCircle, LocalLibrary } from '@mui/icons-material';
import { useAuth } from '../auth/AuthContext';

export default function Navbar() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const logout = () => {
    auth.logout();
    setAnchorEl(null);
    navigate('/login');
  };

  return (
    <AppBar position="sticky">
      <Toolbar>
        <Box component={Link} to="/catalog" display="flex" alignItems="center" gap={1} sx={{ textDecoration: 'none', color: 'inherit', mr: 3 }}>
          <LocalLibrary />
          <Typography variant="h6" fontWeight="bold">Caclouky Library</Typography>
        </Box>

        <Button color="inherit" component={Link} to="/catalog">Catalog</Button>
        <Button color="inherit" component={Link} to="/search">Sermon Search</Button>

        {auth.isLoggedIn() && (
          <>
            <Button color="inherit" component={Link} to="/my/checkouts">My Checkouts</Button>
            <Button color="inherit" component={Link} to="/my/reservations">My Reservations</Button>
          </>
        )}

        {auth.isMinisterOrAdmin() && (
          <Button color="inherit" component={Link} to="/admin">Admin</Button>
        )}

        <Box flex={1} />

        {auth.isLoggedIn() ? (
          <>
            <IconButton color="inherit" onClick={e => setAnchorEl(e.currentTarget)}>
              <AccountCircle />
            </IconButton>
            <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={() => setAnchorEl(null)}>
              <MenuItem disabled>
                {auth.user?.firstName} {auth.user?.lastName}
              </MenuItem>
              <MenuItem onClick={logout}>Sign out</MenuItem>
            </Menu>
          </>
        ) : (
          <Button color="inherit" component={Link} to="/login">Sign in</Button>
        )}
      </Toolbar>
    </AppBar>
  );
}
