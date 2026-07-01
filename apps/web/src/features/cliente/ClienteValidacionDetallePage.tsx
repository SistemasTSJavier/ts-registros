import { useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  useApprovePerson,
  usePersonValidation,
  useValidateItem,
} from '@/lib/api/hooks'
import { useAuthStore } from '@/lib/auth/store'
import { canCreate, canDelete } from '@/lib/auth/permissions'
import { PageHeader } from '@/components/shared/PageHeader'
import { ValidationChecklist } from '@/components/shared/ValidationChecklist'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { PageLoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { ErrorState } from '@/components/shared/ErrorState'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PERSON_FIELD_LABELS } from '@/lib/registration/constants'
import { Badge } from '@/components/ui/badge'

export function ClienteValidacionDetallePage() {
  const { personId = '' } = useParams()
  const user = useAuthStore((s) => s.user)
  const { data, isLoading, isError, refetch } = usePersonValidation(personId)
  const validateItem = useValidateItem()
  const approvePerson = useApprovePerson()
  const allowCreate = canCreate(user)
  const allowDelete = canDelete(user)

  if (isLoading) return <PageLoadingSkeleton />
  if (isError || !data) return <ErrorState onRetry={() => refetch()} />

  const { person, validationItems, documents } = data
  const allApproved = validationItems.every((i) => i.status === 'approved')

  return (
    <div>
      <PageHeader
        title="Revisar persona"
        breadcrumbs={[
          { label: 'Validaciones', href: '/cliente/validaciones' },
          { label: person.personalData.nombreCompleto ?? 'Persona' },
        ]}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Datos personales</CardTitle>
            <StatusBadge status={person.overallStatus} />
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {Object.entries(person.personalData).map(([key, value]) => (
              <p key={key}>
                <span className="text-slate-500">{PERSON_FIELD_LABELS[key] ?? key}:</span> {value}
              </p>
            ))}
            {documents.length > 0 && (
              <div className="pt-2">
                <p className="mb-1 font-medium text-slate-700">Documentos</p>
                {documents.map((doc) => (
                  <p key={doc.id} className="flex items-center justify-between gap-2">
                    <span>{doc.name}</span>
                    <Badge variant={doc.validationStatus === 'approved' ? 'approved' : 'pending_validation'}>
                      {doc.validationStatus}
                    </Badge>
                  </p>
                ))}
              </div>
            )}
            <p className="pt-2">
              <span className="text-slate-500">Estado Incode:</span>{' '}
              <span className="font-medium capitalize">{person.incodeStatus}</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Validación</CardTitle></CardHeader>
          <CardContent>
            <ValidationChecklist
              items={validationItems}
              onApprove={(id) => validateItem.mutate({ id, status: 'approved' })}
              onReject={(id, reason) => validateItem.mutate({ id, status: 'rejected', rejectionReason: reason })}
              readOnly={!allowCreate && !allowDelete}
              canApprove={allowCreate}
              canDelete={allowDelete}
            />
          </CardContent>
        </Card>
      </div>
      {(allowCreate || allowDelete) && (
        <div className="mt-6 flex gap-3">
          {allowCreate && (
            <Button
              variant="cliente"
              disabled={!allApproved || approvePerson.isPending}
              onClick={async () => {
                await approvePerson.mutateAsync(personId)
                toast.success('Persona aprobada. Acceso QR emitido (válido 12 h desde la cita).')
                refetch()
              }}
            >
              Aprobar todo y emitir acceso
            </Button>
          )}
          {allowDelete && (
            <Button variant="destructive" onClick={() => toast.info('Solicitud rechazada')}>
              Rechazar solicitud
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
