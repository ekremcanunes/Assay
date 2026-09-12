import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute({ children }) {
  const { session, loading } = useAuth()
  if (loading) return <div className="flex min-h-screen items-center justify-center bg-shell font-mono text-micro text-shell-muted">Loading...</div>
  if (!session) return <Navigate to="/login" replace />
  return children
}
