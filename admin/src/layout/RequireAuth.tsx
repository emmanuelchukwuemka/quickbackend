import { Navigate, Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function RequireAuth() {
  const { admin, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-400">
        <Loader2 size={24} className="animate-spin" />
      </div>
    );
  }

  if (!admin) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
