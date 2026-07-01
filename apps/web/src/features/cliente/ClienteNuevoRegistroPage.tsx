import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Users, Truck, Building2 } from 'lucide-react'
import { useCreateRegistration, useRegistrationTypes } from '@/lib/api/hooks'
import { useAuthStore } from '@/lib/auth/store'
import { canCreate } from '@/lib/auth/permissions'
import { PageHeader } from '@/components/shared/PageHeader'
import { DynamicForm } from '@/components/shared/DynamicForm'
import { PersonsEditor } from '@/components/shared/PersonsEditor'
import { PageLoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Stepper } from '@/components/shared/Stepper'
import { cn } from '@/lib/utils'
import { arePersonsValid, listPersonValidationIssues } from '@/lib/registration/validate-person'
import type { RegistrationPersonInput, RegistrationType } from '@/lib/schemas'

const STEPS = [
  { id: 'tipo', label: 'Tipo' },
  { id: 'datos', label: 'Cita' },
  { id: 'personas', label: 'Personas' },
  { id: 'envio', label: 'Envío' },
]

const TYPE_ICONS: Record<string, typeof Users> = {
  visitante: Users,
  proveedor: Truck,
  cliente: Building2,
}

const DEFAULT_PERSON: RegistrationPersonInput = {
  nombreCompleto: '',
  telefono: '',
  curp: '',
  email: '',
  puesto: '',
}

export function ClienteNuevoRegistroPage() {
  const user = useAuthStore((s) => s.user)
  const [step, setStep] = useState(0)
  const [selectedType, setSelectedType] = useState<RegistrationType | null>(null)
  const [payload, setPayload] = useState<Record<string, string>>({})
  const [persons, setPersons] = useState<RegistrationPersonInput[]>([{ ...DEFAULT_PERSON }])
  const [sentInvitations, setSentInvitations] = useState<
    Array<{ personId: string; email: string; token: string; loginUrl: string }>
  >([])
  const [createdRegistrationId, setCreatedRegistrationId] = useState<string | null>(null)
  const [personsTouched, setPersonsTouched] = useState(false)
  const { data: types, isLoading } = useRegistrationTypes()
  const createRegistration = useCreateRegistration()
  const navigate = useNavigate()

  if (!canCreate(user)) return <Navigate to="/cliente/registros" replace />
  if (isLoading) return <PageLoadingSkeleton />

  const personsValid = arePersonsValid(persons)
  const personIssues = listPersonValidationIssues(persons)

  const handleSend = async () => {
    if (!selectedType) return
    try {
      const result = await createRegistration.mutateAsync({
        typeId: selectedType.id,
        payload,
        persons,
      })
      setSentInvitations(result.invitations)
      setCreatedRegistrationId(result.registration.id)
      setStep(3)
      toast.success(`Invitaciones enviadas a ${result.invitations.length} persona(s)`)
    } catch {
      toast.error('Error al crear registro')
    }
  }

  return (
    <div>
      <PageHeader
        title="Crear registro"
        breadcrumbs={[{ label: 'Registros', href: '/cliente/registros' }, { label: 'Nuevo' }]}
      />
      <div className="mb-8">
        <Stepper steps={STEPS} currentStep={step} />
      </div>

      {step === 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          {types?.map((type) => {
            const Icon = TYPE_ICONS[type.code] ?? Users
            return (
              <Card
                key={type.id}
                className={cn(
                  'cursor-pointer transition-all hover:shadow-md',
                  selectedType?.id === type.id && 'ring-2 ring-emerald-600',
                )}
                onClick={() => setSelectedType(type)}
              >
                <CardHeader>
                  <Icon className="h-8 w-8 text-emerald-600" />
                  <CardTitle className="mt-2">{type.name}</CardTitle>
                  <CardDescription>{type.description}</CardDescription>
                </CardHeader>
              </Card>
            )
          })}
          <div className="sm:col-span-3">
            <Button variant="cliente" disabled={!selectedType} onClick={() => setStep(1)}>
              Continuar
            </Button>
          </div>
        </div>
      )}

      {step === 1 && selectedType && (
        <Card>
          <CardHeader>
            <CardTitle>Datos de la cita — {selectedType.name}</CardTitle>
            <CardDescription>Incluye la fecha de reunión; el acceso QR será válido 12 horas desde ese momento.</CardDescription>
          </CardHeader>
          <CardContent>
            <DynamicForm
              schema={selectedType.fieldSchema}
              onSubmit={(data) => {
                setPayload(data)
                setStep(2)
              }}
              submitLabel="Continuar"
            />
            <Button variant="outline" className="mt-4" onClick={() => setStep(0)}>
              Atrás
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 2 && selectedType && (
        <Card>
          <CardHeader>
            <CardTitle>Personas a registrar</CardTitle>
            <CardDescription>
              Solicita nombre, teléfono, CURP, correo y puesto. Cada persona recibirá un enlace temporal por correo
              para subir INE, CURP, acta de nacimiento y fotografía.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <PersonsEditor value={persons} onChange={setPersons} showErrors={personsTouched || !personsValid} />
            {!personsValid && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <p className="font-medium">Completa los campos pendientes para continuar:</p>
                <ul className="mt-2 list-inside list-disc space-y-1">
                  {personIssues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(1)}>Atrás</Button>
              <Button
                variant="cliente"
                disabled={!personsValid}
                onClick={() => {
                  setPersonsTouched(true)
                  if (personsValid) setStep(3)
                }}
              >
                Revisar envío
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && selectedType && !createdRegistrationId && (
        <Card>
          <CardHeader>
            <CardTitle>Confirmar y enviar invitaciones</CardTitle>
            <CardDescription>Se enviará un correo a cada persona con su enlace de registro en línea.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm">
              {persons.map((p, i) => (
                <li key={i} className="rounded-lg border p-3">
                  <strong>{p.nombreCompleto}</strong> — {p.email} · {p.puesto}
                </li>
              ))}
            </ul>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(2)}>Atrás</Button>
              <Button variant="cliente" disabled={createRegistration.isPending} onClick={handleSend}>
                {createRegistration.isPending ? 'Enviando...' : 'Enviar invitaciones'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && createdRegistrationId && (
        <Card>
          <CardHeader>
            <CardTitle>Registro creado</CardTitle>
            <CardDescription>
              Cada persona recibió su enlace temporal. Tras validar documentos, se emitirá el QR de acceso (12 h desde la cita).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {sentInvitations.map((inv) => (
              <div key={inv.personId} className="rounded-lg border bg-slate-50 p-4 text-sm">
                <p className="font-medium">{inv.email}</p>
                <p className="mt-1 text-slate-600">
                  Enlace: <code className="font-mono text-xs">{window.location.origin}{inv.loginUrl}</code>
                </p>
              </div>
            ))}
            <Button variant="cliente" onClick={() => navigate(`/cliente/registros/${createdRegistrationId}`)}>
              Ver registro
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
