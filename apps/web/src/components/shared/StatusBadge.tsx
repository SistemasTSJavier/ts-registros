import type { Status } from '@/lib/schemas'
import { Badge } from '@/components/ui/badge'

const STATUS_LABELS: Record<Status, string> = {
  draft: 'Borrador',
  invited: 'Invitación enviada',
  in_progress: 'En proceso',
  pending_validation: 'Pendiente validación',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  access_issued: 'Acceso emitido',
  expired: 'Expirado',
  revoked: 'Revocado',
}

export function StatusBadge({ status }: { status: Status }) {
  return <Badge variant={status}>{STATUS_LABELS[status]}</Badge>
}
