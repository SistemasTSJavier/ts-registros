import { useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useRegistration } from '@/lib/api/hooks'
import { useAuthStore } from '@/lib/auth/store'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { PersonDetailCard } from '@/components/shared/PersonDetailCard'
import { AppointmentEmailPreview } from '@/components/shared/AppointmentEmailPreview'
import { AuditTimeline } from '@/components/shared/AuditTimeline'
import { PageLoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { ErrorState } from '@/components/shared/ErrorState'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'
import { PERSON_FIELD_LABELS } from '@/lib/registration/constants'

const PAYLOAD_LABELS: Record<string, string> = {
  fechaCita: 'Fecha de cita',
  area: 'Área',
  responsable: 'Responsable',
  notas: 'Notas',
  razonSocial: 'Razón social',
  giro: 'Giro',
  servicios: 'Servicios',
  motivo: 'Motivo',
}

export function ClienteRegistroDetallePage() {
  const { id = '' } = useParams()
  const tenant = useAuthStore((s) => s.tenant)
  const { data, isLoading, isError, refetch } = useRegistration(id)

  if (isLoading) return <PageLoadingSkeleton />
  if (isError || !data || !tenant) return <ErrorState onRetry={() => refetch()} />

  const { registration, persons, logs } = data

  return (
    <div>
      <PageHeader
        title={`Registro: ${registration.typeName}`}
        breadcrumbs={[{ label: 'Registros', href: '/cliente/registros' }, { label: registration.typeName }]}
      />
      <div className="mb-6 flex flex-wrap gap-2">
        <StatusBadge status={registration.status} />
        <Button variant="outline" size="sm" onClick={() => toast.success('Invitaciones reenviadas')}>
          Reenviar invitaciones
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader><CardTitle>Datos del registro</CardTitle></CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <p><span className="text-slate-500">Creado:</span> {formatDate(registration.createdAt)}</p>
          <p><span className="text-slate-500">Personas:</span> {persons.length}</p>
          {Object.entries(registration.payload).map(([k, v]) => (
            <p key={k}>
              <span className="text-slate-500">{PAYLOAD_LABELS[k] ?? k}:</span> {v}
            </p>
          ))}
        </CardContent>
      </Card>

      <section className="mb-6 space-y-4">
        <h2 className="text-lg font-semibold">Personas y documentación</h2>
        <p className="text-sm text-slate-500">
          Datos solicitados: {Object.values(PERSON_FIELD_LABELS).join(', ')}. Documentos requeridos en portal: INE, CURP,
          acta de nacimiento y fotografía.
        </p>
        {persons.map((person) => (
          <div key={person.id} className="space-y-4">
            <PersonDetailCard person={person} />
            <AppointmentEmailPreview
              tenant={tenant}
              registration={registration}
              person={person}
              credential={person.credential}
              registrationUrl={
                person.invitation
                  ? `${window.location.origin}/portal/invitacion/${person.invitation.token}`
                  : undefined
              }
            />
          </div>
        ))}
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Historial</h2>
        <AuditTimeline logs={logs} />
      </section>
    </div>
  )
}
