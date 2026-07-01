import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/lib/auth/store'
import { usePortalStore } from '@/lib/auth/portal-store'
import type { Role } from '@/lib/schemas'

export function ProtectedRoute({ role, children }: { role: Role; children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const location = useLocation()

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (user.role !== role) {
    const redirect = user.role === 'admin' ? '/admin' : user.role === 'cliente' ? '/cliente' : '/'
    return <Navigate to={redirect} replace />
  }

  return <>{children}</>
}

export function PortalProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = usePortalStore((s) => s.token)
  if (!token) {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}
