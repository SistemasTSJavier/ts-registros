import { useState } from 'react'
import type { AccessCredential, Person, Registration, Tenant } from '@/lib/schemas'
import { getMeetingDate } from '@/lib/registration/constants'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface AppointmentEmailPreviewProps {
  tenant: Tenant
  registration: Registration
  person: Person
  credential?: AccessCredential | null
  registrationUrl?: string
}

function formatAppointmentDate(registration: Registration, locale: string) {
  const raw = getMeetingDate(registration.payload)
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return raw
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function mapsLink(tenant: Tenant) {
  if (tenant.addressLat && tenant.addressLng) {
    return `https://www.google.com/maps?q=${tenant.addressLat},${tenant.addressLng}`
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(tenant.address)}`
}

function EmailBody({
  locale,
  tenant,
  registration,
  person,
  credential,
  registrationUrl,
}: AppointmentEmailPreviewProps & { locale: 'es' | 'en' }) {
  const isEs = locale === 'es'
  const visitName = person.personalData.nombreCompleto
  const responsible = registration.payload.responsable ?? tenant.primaryContactName
  const appointmentDate = formatAppointmentDate(registration, isEs ? 'es-MX' : 'en-US')
  const checkInUrl = registrationUrl ?? `${window.location.origin}/portal/invitacion/`
  const maps = mapsLink(tenant)

  return (
    <div className="mx-auto max-w-lg space-y-6 rounded-lg border bg-white p-6 text-sm text-slate-800 shadow-sm">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
          TS
        </div>
        <h2 className="text-lg font-bold">Tactical Support</h2>
        <p className="text-slate-500">
          {isEs ? 'Visita' : 'Visit'} — {appointmentDate}
        </p>
      </div>

      <section>
        <p className="font-medium">{isEs ? `Estimado/a ${visitName},` : `Dear ${visitName},`}</p>
        <p className="mt-2 text-slate-600">
          {isEs ? 'Esperamos su visita.' : 'We look forward to your visit.'}
        </p>
      </section>

      <section className="rounded-lg bg-slate-50 p-4">
        <p className="font-medium">{isEs ? 'Su cita:' : 'Your appointment:'}</p>
        <p className="mt-1">{appointmentDate}</p>
        <p className="mt-3 font-medium">Tactical Support</p>
        <p className="text-slate-600">{tenant.address}</p>
        <a href={maps} className="mt-2 inline-block text-blue-600 hover:underline" target="_blank" rel="noreferrer">
          Google Maps
        </a>
      </section>

      <section>
        <p className="font-medium">{isEs ? 'Su persona de contacto:' : 'Your contact person:'}</p>
        <p className="text-slate-600">{responsible}</p>
      </section>

      <section>
        <p className="text-slate-600">
          {isEs
            ? 'Por favor regístrese en línea con anticipación para agilizar su registro presencial.'
            : 'Please register online in advance to expedite your in-person registration.'}
        </p>
        <p className="mt-2">
          {isEs ? 'Su enlace de registro en línea:' : 'Your link for online registration:'}{' '}
          <a href={checkInUrl} className="font-medium text-blue-600 hover:underline">
            {isEs ? 'Check-in en línea' : 'Check-in Online'}
          </a>
        </p>
      </section>

      {credential && (
        <>
          <section className="rounded-lg border border-dashed p-4 text-center">
            <p className="font-medium">{isEs ? 'PIN de autorización en sitio' : 'On-site Authorization PIN'}</p>
            <p className="mt-2 text-3xl font-bold tracking-widest">{credential.manualCode}</p>
          </section>
          <section className="rounded-lg border border-dashed p-4 text-center">
            <p className="font-medium">
              {isEs ? 'Código QR de autorización en sitio' : 'On-site Authorization QR Code'}
            </p>
            <p className="mt-2 font-mono text-xs text-slate-500">{credential.qrPayload}</p>
            <p className="mt-1 text-xs text-slate-400">
              {isEs ? 'Válido 12 horas desde la fecha de la cita' : 'Valid 12 hours from appointment date'}
            </p>
          </section>
        </>
      )}
    </div>
  )
}

export function AppointmentEmailPreview(props: AppointmentEmailPreviewProps) {
  const [locale, setLocale] = useState<'es' | 'en'>('es')

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Vista previa del correo de cita</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs>
          <TabsList>
            <TabsTrigger active={locale === 'es'} onClick={() => setLocale('es')}>
              Español
            </TabsTrigger>
            <TabsTrigger active={locale === 'en'} onClick={() => setLocale('en')}>
              English
            </TabsTrigger>
          </TabsList>
          <TabsContent>
            <EmailBody {...props} locale={locale} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
