import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { toast } from 'sonner'
import { Copy, Mail } from 'lucide-react'
import { useCreateTenant } from '@/lib/api/hooks'
import { PageHeader } from '@/components/shared/PageHeader'
import { AddressWithLocation } from '@/components/shared/AddressWithLocation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const schema = z.object({
  name: z.string().min(1, 'Requerido'),
  phone: z.string().min(1, 'Requerido'),
  primaryContactName: z.string().min(1, 'Requerido'),
  primaryContactEmail: z.string().email('Correo inválido'),
  address: z.string().min(1, 'Requerido'),
  addressLat: z.number().optional(),
  addressLng: z.number().optional(),
  panelExpiresAt: z.string().min(1, 'Requerido'),
  status: z.enum(['active', 'inactive']),
})

type FormData = z.infer<typeof schema>

type EmailSent = {
  to: string
  loginUrl: string
  password: string
  panelExpiresAt: string
  delivered?: boolean
  resendId?: string | null
  error?: string
}

export function AdminClienteNuevoPage() {
  const navigate = useNavigate()
  const createTenant = useCreateTenant()
  const [emailSent, setEmailSent] = useState<EmailSent | null>(null)
  const [createdTenantId, setCreatedTenantId] = useState<string | null>(null)

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'active' },
  })

  const addressLat = watch('addressLat')
  const addressLng = watch('addressLng')

  const onSubmit = async (data: FormData) => {
    try {
      const result = await createTenant.mutateAsync(data)
      setEmailSent(result.emailSent)
      setCreatedTenantId(result.tenant.id)
      toast.success(
        result.emailSent.delivered
          ? 'Cliente creado y correo enviado con Resend'
          : 'Cliente creado (correo no enviado — revisa VITE_EMAIL_ENABLED y la API)',
      )
    } catch {
      toast.error('Error al crear cliente')
    }
  }

  const fullLoginUrl = emailSent ? `${window.location.origin}${emailSent.loginUrl}` : ''

  const copyCredentials = async () => {
    if (!emailSent) return
    await navigator.clipboard.writeText(
      `Acceso al CRM Registros\n\nURL: ${fullLoginUrl}\nUsuario: ${emailSent.to}\nContraseña: ${emailSent.password}\nVigencia del panel: ${emailSent.panelExpiresAt}`,
    )
    toast.success('Credenciales copiadas')
  }

  if (emailSent) {
    return (
      <div>
        <PageHeader
          title="Acceso enviado"
          breadcrumbs={[{ label: 'Clientes', href: '/admin/clientes' }, { label: 'Nuevo' }]}
        />
        <Card className="max-w-xl border-emerald-200">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Mail className="h-8 w-8 text-emerald-600" />
              <div>
                <CardTitle>{emailSent.delivered ? 'Correo enviado con Resend' : 'Acceso generado'}</CardTitle>
                <CardDescription>
                  {emailSent.delivered
                    ? `Mensaje entregado a ${emailSent.to}${emailSent.resendId ? ` (ID: ${emailSent.resendId})` : ''}`
                    : emailSent.error
                      ? `No se pudo enviar el correo: ${emailSent.error}`
                      : 'Activa VITE_EMAIL_ENABLED y la API de correo para envío automático'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="rounded-lg bg-slate-50 p-4 space-y-2">
              <p><span className="text-slate-500">Para:</span> {emailSent.to}</p>
              <p>
                <span className="text-slate-500">Liga del CRM:</span>{' '}
                <a href={fullLoginUrl} className="font-medium text-blue-600 hover:underline">
                  {fullLoginUrl}
                </a>
              </p>
              <p>
                <span className="text-slate-500">Contraseña temporal:</span>{' '}
                <code className="rounded bg-white px-2 py-0.5 font-mono text-base">{emailSent.password}</code>
              </p>
              <p><span className="text-slate-500">Vigencia del panel:</span> {emailSent.panelExpiresAt}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={copyCredentials}>
                <Copy className="h-4 w-4" />
                Copiar credenciales
              </Button>
              <Button size="sm" onClick={() => createdTenantId && navigate(`/admin/clientes/${createdTenantId}`)}>
                Ver cliente
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/admin/clientes')}>
                Volver al listado
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Nuevo cliente"
        description="Alta de empresa con acceso al panel cliente"
        breadcrumbs={[{ label: 'Clientes', href: '/admin/clientes' }, { label: 'Nuevo' }]}
      />
      <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Datos del cliente</CardTitle>
            <CardDescription>
              Al guardar se enviará un correo con la liga del CRM y contraseña de acceso.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre de la empresa" error={errors.name?.message} className="sm:col-span-2">
              <Input {...register('name')} placeholder="Ej. Manufactura del Norte" />
            </Field>
            <Field label="Teléfono" error={errors.phone?.message}>
              <Input {...register('phone')} placeholder="+52 ..." />
            </Field>
            <Field label="Fecha de vencimiento del panel" error={errors.panelExpiresAt?.message}>
              <Input type="date" {...register('panelExpiresAt')} />
            </Field>
            <Field label="Nombre de la persona encargada" error={errors.primaryContactName?.message} className="sm:col-span-2">
              <Input {...register('primaryContactName')} placeholder="Nombre completo" />
            </Field>
            <Field label="Correo electrónico" error={errors.primaryContactEmail?.message} className="sm:col-span-2">
              <Input type="email" {...register('primaryContactEmail')} placeholder="correo@empresa.com" />
            </Field>
            <Field label="Ubicación" error={errors.address?.message} className="sm:col-span-2">
              <Controller
                name="address"
                control={control}
                render={({ field }) => (
                  <AddressWithLocation
                    value={field.value ?? ''}
                    lat={addressLat}
                    lng={addressLng}
                    onChange={({ address, lat, lng }) => {
                      field.onChange(address)
                      if (lat != null) setValue('addressLat', lat)
                      if (lng != null) setValue('addressLng', lng)
                    }}
                  />
                )}
              />
            </Field>
          </CardContent>
        </Card>
        <div className="mt-6 flex gap-3">
          <Button type="button" variant="outline" onClick={() => navigate('/admin/clientes')}>
            Cancelar
          </Button>
          <Button type="submit" disabled={createTenant.isPending}>
            {createTenant.isPending ? 'Creando y enviando...' : 'Crear y enviar acceso'}
          </Button>
        </div>
      </form>
    </div>
  )
}

function Field({
  label,
  error,
  children,
  className,
}: {
  label: string
  error?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`space-y-2 ${className ?? ''}`}>
      <Label>{label}</Label>
      {children}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
