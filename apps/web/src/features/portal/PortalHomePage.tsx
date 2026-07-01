import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User } from 'lucide-react'
import { usePortalSession } from '@/lib/api/hooks'
import { usePortalStore } from '@/lib/auth/portal-store'
import { PageLoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { ErrorState } from '@/components/shared/ErrorState'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function PortalHomePage() {
  const navigate = useNavigate()
  const personId = usePortalStore((s) => s.personId)
  const { data, isLoading, isError, refetch } = usePortalSession()

  useEffect(() => {
    if (personId && data?.persons.some((p) => p.id === personId)) {
      const person = data.persons.find((p) => p.id === personId)
      if (person?.overallStatus === 'in_progress' || person?.overallStatus === 'invited') {
        navigate(`/portal/personas/${personId}/documentos`, { replace: true })
      }
    }
  }, [personId, data, navigate])

  if (isLoading) return <PageLoadingSkeleton />
  if (isError || !data) return <ErrorState onRetry={() => refetch()} />

  const { registration, tenant, type, persons } = data

  return (
    <div className="space-y-6">
      <Card className="border-indigo-100">
        <CardHeader>
          <CardTitle className="text-indigo-900">{tenant.name}</CardTitle>
          <CardDescription>Registro: {type.name}</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-slate-600">
          <p>
            <span className="text-slate-500">Cita:</span> {registration.payload.fechaCita ?? '—'}
          </p>
          {registration.payload.responsable && (
            <p className="mt-1">
              <span className="text-slate-500">Contacto:</span> {registration.payload.responsable}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Mis datos</h2>
      </div>

      {persons.length === 0 ? (
        <EmptyState
          icon={User}
          title="Sin registro asignado"
          description="Usa el enlace de invitación que recibiste por correo."
        />
      ) : (
        <ul className="space-y-3">
          {persons.map((person) => (
            <li key={person.id}>
              <Link to={`/portal/personas/${person.id}`}>
                <Card className="transition-shadow hover:shadow-md">
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium">{person.personalData.nombreCompleto ?? 'Sin nombre'}</p>
                      <p className="text-sm text-slate-500">{person.personalData.puesto ?? ''}</p>
                    </div>
                    <StatusBadge status={person.overallStatus} />
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {persons.length > 0 && (
        <Link
          to={`/portal/personas/${persons[0].id}/documentos`}
          className={cn(buttonVariants({ variant: 'portal' }), 'w-full text-center')}
        >
          Continuar con documentos
        </Link>
      )}
    </div>
  )
}
