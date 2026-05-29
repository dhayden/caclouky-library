import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

interface Props {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireMinisterOrAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin, requireMinisterOrAdmin }: Props) {
  const auth = useAuth();
  if (!auth.isLoggedIn()) return <Navigate to="/login" replace />;
  if (requireAdmin && !auth.isAdmin()) return <Navigate to="/" replace />;
  if (requireMinisterOrAdmin && !auth.isMinisterOrAdmin()) return <Navigate to="/" replace />;
  return <>{children}</>;
}
