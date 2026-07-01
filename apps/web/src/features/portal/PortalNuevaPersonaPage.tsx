import { Navigate } from 'react-router-dom'
import { usePortalSession } from '@/lib/api/hooks'
import { PageLoadingSkeleton } from '@/components/shared/LoadingSkeleton'

export function PortalNuevaPersonaPage() {
  const { data, isLoading } = usePortalSession()

  if (isLoading) return <PageLoadingSkeleton />
  if (data?.persons[0]) {
    return <Navigate to={`/portal/personas/${data.persons[0].id}/documentos`} replace />
  }
  return <Navigate to="/portal" replace />
}
