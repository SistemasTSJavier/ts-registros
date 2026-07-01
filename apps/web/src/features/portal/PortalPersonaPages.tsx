import { Link, useParams } from 'react-router-dom'
import { usePortalPerson, useStartIncodeMock, useUploadDocument } from '@/lib/api/hooks'
import { REQUIRED_PORTAL_DOCUMENTS } from '@/lib/registration/constants'
import { PageLoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { ErrorState } from '@/components/shared/ErrorState'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Stepper } from '@/components/shared/Stepper'
import { ValidationChecklist } from '@/components/shared/ValidationChecklist'
import { QRDisplay } from '@/components/shared/QRDisplay'
import { FileUploadZone } from '@/components/shared/FileUploadZone'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PERSON_FIELD_LABELS } from '@/lib/registration/constants'
import { cn } from '@/lib/utils'

export function PortalPersonaDetallePage() {
  const { id = '' } = useParams()
  const { data, isLoading, isError, refetch } = usePortalPerson(id)

  if (isLoading) return <PageLoadingSkeleton />
  if (isError || !data) return <ErrorState onRetry={() => refetch()} />

  const { person, validationItems, credential } = data

  const steps = [
    { id: '1', label: 'Datos' },
    { id: '2', label: 'Docs' },
    { id: '3', label: 'INE' },
    { id: '4', label: 'Revisión' },
    { id: '5', label: 'Acceso' },
  ]

  const currentStep =
    person.overallStatus === 'access_issued'
      ? 4
      : person.overallStatus === 'pending_validation'
        ? 3
        : person.incodeStatus === 'verified'
          ? 2
          : 1

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{person.personalData.nombreCompleto}</h1>
        <StatusBadge status={person.overallStatus} />
      </div>

      <Stepper steps={steps} currentStep={currentStep} variant="portal" />

      <Card>
        <CardHeader><CardTitle>Datos registrados</CardTitle></CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          {Object.entries(person.personalData).map(([key, value]) => (
            <p key={key}>
              <span className="text-slate-500">{PERSON_FIELD_LABELS[key] ?? key}:</span> {value}
            </p>
          ))}
        </CardContent>
      </Card>

      {person.overallStatus === 'access_issued' && credential ? (
        <QRDisplay
          qrPayload={credential.qrPayload}
          manualCode={credential.manualCode}
          validFrom={credential.validFrom}
          validUntil={credential.validUntil}
        />
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Estado de validación</CardTitle>
            </CardHeader>
            <CardContent>
              <ValidationChecklist items={validationItems} onApprove={() => {}} onReject={() => {}} readOnly />
            </CardContent>
          </Card>
          {(person.overallStatus === 'in_progress' || person.overallStatus === 'invited') && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                to={`/portal/personas/${id}/documentos`}
                className={cn(buttonVariants({ variant: 'portal' }), 'text-center')}
              >
                Subir documentos
              </Link>
              <Link
                to={`/portal/personas/${id}/verificacion`}
                className={cn(buttonVariants({ variant: 'outline' }), 'text-center')}
              >
                Verificación INE
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export function PortalDocumentosPage() {
  const { id = '' } = useParams()
  const uploadDocument = useUploadDocument(id)
  const { data, refetch } = usePortalPerson(id)

  const uploadedTypes = new Set(data?.documents.map((d) => d.type) ?? [])

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Documentos requeridos</h1>
      <p className="text-sm text-slate-600">
        Sube INE, CURP, acta de nacimiento y fotografía. El cliente validará cada archivo antes de emitir tu acceso.
      </p>
      {REQUIRED_PORTAL_DOCUMENTS.map((doc) => (
        <FileUploadZone
          key={doc.key}
          label={doc.label}
          docType={doc.type}
          uploaded={
            uploadedTypes.has(doc.type)
              ? { name: doc.label, type: doc.type, fileName: `${doc.type}.pdf` }
              : null
          }
          onUpload={async (file) => {
            await uploadDocument.mutateAsync(file)
            refetch()
          }}
        />
      ))}
      <div className="flex gap-2">
        <Link to={`/portal/personas/${id}/verificacion`} className={cn(buttonVariants({ variant: 'portal' }))}>
          Verificación INE
        </Link>
        <Link to={`/portal/personas/${id}`} className={cn(buttonVariants({ variant: 'outline' }))}>
          Ver estado
        </Link>
      </div>
    </div>
  )
}

export function PortalVerificacionPage() {
  const { id = '' } = useParams()
  const startIncode = useStartIncodeMock(id)
  const { data, refetch } = usePortalPerson(id)

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Verificación INE</h1>
      <Card>
        <CardContent className="p-6 text-center">
          {data?.person.incodeStatus === 'verified' ? (
            <p className="font-medium text-emerald-600">Identidad verificada correctamente</p>
          ) : (
            <Button
              variant="portal"
              onClick={async () => {
                await startIncode.mutateAsync()
                refetch()
              }}
              disabled={startIncode.isPending}
            >
              {startIncode.isPending ? 'Verificando...' : 'Iniciar verificación Incode'}
            </Button>
          )}
        </CardContent>
      </Card>
      <Link to={`/portal/personas/${id}`} className={cn(buttonVariants({ variant: 'outline' }))}>
        Volver
      </Link>
    </div>
  )
}

export function PortalAccesoPage() {
  const { id = '' } = useParams()
  const { data, isLoading } = usePortalPerson(id)

  if (isLoading || !data?.credential) return <PageLoadingSkeleton />

  const { credential } = data
  return (
    <div>
      <h1 className="mb-6 text-center text-xl font-bold">Tu acceso a planta</h1>
      <p className="mb-4 text-center text-sm text-slate-500">Válido 12 horas desde la fecha de tu cita</p>
      <QRDisplay
        qrPayload={credential.qrPayload}
        manualCode={credential.manualCode}
        validFrom={credential.validFrom}
        validUntil={credential.validUntil}
      />
    </div>
  )
}
