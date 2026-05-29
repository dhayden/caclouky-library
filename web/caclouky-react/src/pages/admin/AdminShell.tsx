import { NavLink, Outlet } from 'react-router-dom';
import { Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Typography } from '@mui/material';
import { Dashboard, MenuBook, People, AssignmentReturn, EventNote, PictureAsPdf } from '@mui/icons-material';
import { useAuth } from '../../auth/AuthContext';

const DRAWER_WIDTH = 220;

const navItems = [
  { label: 'Dashboard', path: '/admin/dashboard', icon: <Dashboard /> },
  { label: 'Books', path: '/admin/books', icon: <MenuBook /> },
  { label: 'Reservations', path: '/admin/reservations', icon: <EventNote /> },
  { label: 'Checkouts', path: '/admin/checkouts', icon: <AssignmentReturn /> },
  { label: 'Members', path: '/admin/members', icon: <People />, adminOnly: true },
  { label: 'Sermon Docs', path: '/admin/sermon-docs', icon: <PictureAsPdf />, adminOnly: true },
];

export default function AdminShell() {
  const auth = useAuth();

  return (
    <Box display="flex" height="calc(100vh - 64px)">
      <Drawer variant="permanent" sx={{ width: DRAWER_WIDTH, flexShrink: 0, '& .MuiDrawer-paper': { width: DRAWER_WIDTH, position: 'relative', height: '100%' } }}>
        <Box p={2}>
          <Typography variant="overline" color="text.secondary">Admin Portal</Typography>
        </Box>
        <List dense>
          {navItems.filter(n => !n.adminOnly || auth.isAdmin()).map(n => (
            <ListItem key={n.path} disablePadding>
              <ListItemButton component={NavLink} to={n.path}
                sx={{ '&.active': { bgcolor: 'primary.50', color: 'primary.main', '& .MuiListItemIcon-root': { color: 'primary.main' } } }}>
                <ListItemIcon sx={{ minWidth: 36 }}>{n.icon}</ListItemIcon>
                <ListItemText primary={n.label} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Drawer>
      <Box flex={1} overflow="auto">
        <Outlet />
      </Box>
    </Box>
  );
}
