import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { AuthProvider } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import Navbar from './components/Navbar';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import BookList from './pages/catalog/BookList';
import BookDetail from './pages/catalog/BookDetail';
import SermonSearch from './pages/search/SermonSearch';
import BibleSearch from './pages/bible/BibleSearch';
import MyCheckouts from './pages/member/MyCheckouts';
import MyReservations from './pages/member/MyReservations';
import Notes from './pages/member/Notes';
import AdminShell from './pages/admin/AdminShell';
import AdminDashboard from './pages/admin/AdminDashboard';
import ManageBooks from './pages/admin/ManageBooks';
import ManageMembers from './pages/admin/ManageMembers';
import ManageCheckouts from './pages/admin/ManageCheckouts';
import ManageReservations from './pages/admin/ManageReservations';
import SermonDocs from './pages/admin/SermonDocs';

const theme = createTheme({
  palette: { primary: { main: '#1976d2' } },
  components: {
    MuiButton: { defaultProps: { disableElevation: true } },
  },
});

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <BrowserRouter>
          <Navbar />
          <Routes>
            <Route path="/" element={<Navigate to="/catalog" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/catalog" element={<BookList />} />
            <Route path="/catalog/:id" element={<BookDetail />} />
            <Route path="/search" element={<SermonSearch />} />
            <Route path="/bible" element={<BibleSearch />} />
            <Route path="/my/checkouts" element={<ProtectedRoute><MyCheckouts /></ProtectedRoute>} />
            <Route path="/my/reservations" element={<ProtectedRoute><MyReservations /></ProtectedRoute>} />
            <Route path="/my/notes" element={<ProtectedRoute><Notes /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute requireMinisterOrAdmin><AdminShell /></ProtectedRoute>}>
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="books" element={<ManageBooks />} />
              <Route path="reservations" element={<ManageReservations />} />
              <Route path="checkouts" element={<ManageCheckouts />} />
              <Route path="members" element={<ProtectedRoute requireAdmin><ManageMembers /></ProtectedRoute>} />
              <Route path="sermon-docs" element={<ProtectedRoute requireAdmin><SermonDocs /></ProtectedRoute>} />
            </Route>
            <Route path="*" element={<Navigate to="/catalog" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
