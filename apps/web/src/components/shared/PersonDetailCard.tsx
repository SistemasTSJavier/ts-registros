import { Link } from 'react-router-dom'
import type { AccessCredential, Document, Invitation, Person, ValidationItem } from '@/lib/schemas'
import { PERSON_FIELD_LABELS } from '@/lib/registration/constants'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { QRDisplay } from '@/components/shared/QRDisplay'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'

type EnrichedPerson = Person & {
  documents?: Document[]
  validationItems?: ValidationItem[]
  credential?: AccessCredential | null
  invitation?: Invitation | null
}

interface PersonDetailCardProps {
  person: EnrichedPerson
  showValidationLink?: boolean
}

export function PersonDetailCard({ person, showValidationLink = true }: PersonDetailCardProps) {
  const pendingItems = person.validationItems?.filter((i) => i.status === 'pending').length ?? 0

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-base">{person.personalData.nombreCompleto}</CardTitle>
          <p className="text-sm text-slate-500">{person.personalData.email}</p>
        </div>
        <StatusBadge status={person.overallStatus} />
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="grid gap-2 sm:grid-cols-2">
          {Object.entries(person.personalData).map(([key, value]) => (
            <p key={key}>
              <span className="text-slate-500">{PERSON_FIELD_LABELS[key] ?? key}:</span> {value}
            </p>
          ))}
          <p>
            <span className="text-slate-500">Verificación INE:</span>{' '}
            <span className="capitalize">{person.incodeStatus}</span>
          </p>
        </div>

        {person.documents && person.documents.length > 0 && (
          <div>
            <p className="mb-2 font-medium text-slate-700">Documentos cargados</p>
            <ul className="space-y-1">
              {person.documents.map((doc) => (
                <li key={doc.id} className="flex items-center justify-between gap-2">
                  <span>{doc.name}</span>
                  <Badge variant={doc.validationStatus === 'approved' ? 'approved' : doc.validationStatus === 'rejected' ? 'rejected' : 'pending_validation'}>
                    {doc.validationStatus === 'approved' ? 'Aprobado' : doc.validationStatus === 'rejected' ? 'Rechazado' : 'Pendiente'}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        )}

        {person.validationItems && person.validationItems.length > 0 && (
          <p className="text-slate-600">
            Validación: {person.validationItems.length - pendingItems}/{person.validationItems.length} ítems aprobados
          </p>
        )}

        {person.invitation && (
          <p className="text-slate-600">
            Invitación: {person.invitation.acceptedAt ? 'Aceptada' : 'Pendiente'}
          </p>
        )}

        {person.credential && (
          <div className="rounded-lg border bg-slate-50 p-4">
            <p className="mb-2 font-medium">Acceso emitido</p>
            <p className="text-slate-600">
              PIN: <strong>{person.credential.manualCode}</strong> · Válido hasta{' '}
              {formatDate(person.credential.validUntil)}
            </p>
          </div>
        )}

        {showValidationLink && person.overallStatus === 'pending_validation' && (
          <Link to={`/cliente/validaciones/${person.id}`} className="text-emerald-700 hover:underline">
            Revisar validación →
          </Link>
        )}

        {person.credential && person.overallStatus === 'access_issued' && (
          <QRDisplay
            qrPayload={person.credential.qrPayload}
            manualCode={person.credential.manualCode}
            validFrom={person.credential.validFrom}
            validUntil={person.credential.validUntil}
          />
        )}
      </CardContent>
    </Card>
  )
}
