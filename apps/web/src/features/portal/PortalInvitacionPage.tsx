import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useAcceptInvitation, useInvitation } from '@/lib/api/hooks'
import { usePortalStore } from '@/lib/auth/portal-store'
import { PageLoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { ErrorState } from '@/components/shared/ErrorState'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2 } from 'lucide-react'
import { PERSON_FIELD_LABELS } from '@/lib/registration/constants'

export function PortalInvitacionPage() {
  const { token = '' } = useParams()
  const { data, isLoading, isError, refetch } = useInvitation(token)
  const acceptInvitation = useAcceptInvitation()
  const setPortalSession = usePortalStore((s) => s.setPortalSession)
  const navigate = useNavigate()

  if (isLoading) return <PageLoadingSkeleton />
  if (isError || !data) return <ErrorState message="Invitación inválida o expirada" onRetry={() => refetch()} />

  const { registration, tenant, type, person } = data

  const handleAccept = async () => {
    await acceptInvitation.mutateAsync(token)
    setPortalSession(token, registration.id, person?.id ?? null)
    toast.success('Invitación aceptada')
    if (person) {
      navigate(`/portal/personas/${person.id}/documentos`)
    } else {
      navigate('/portal')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-indigo-50 to-white p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Building2 className="mx-auto h-12 w-12 text-indigo-600" />
          <CardTitle className="mt-4">Registro en línea</CardTitle>
          <CardDescription>
            <strong>{tenant.name}</strong> te invita a completar tu documentación
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-slate-50 p-4 text-sm">
            <p><span className="text-slate-500">Tipo:</span> {type.name}</p>
            <p className="mt-1">
              <span className="text-slate-500">Cita:</span>{' '}
              {registration.payload.fechaCita ?? '—'}
            </p>
            {person && (
              <>
                <p className="mt-1">
                  <span className="text-slate-500">Nombre:</span> {person.personalData.nombreCompleto}
                </p>
                <p className="mt-1">
                  <span className="text-slate-500">{PERSON_FIELD_LABELS.puesto}:</span>{' '}
                  {person.personalData.puesto}
                </p>
              </>
            )}
          </div>
          <p className="text-sm text-slate-600">
            Deberás subir: INE, CURP, acta de nacimiento y fotografía. El cliente validará cada documento antes de
            emitir tu acceso QR (válido 12 horas desde la cita).
          </p>
          <Button variant="portal" className="w-full" onClick={handleAccept} disabled={acceptInvitation.isPending}>
            {acceptInvitation.isPending ? 'Procesando...' : 'Comenzar carga de documentos'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
