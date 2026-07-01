import { useClienteHistorial, useClientePerfil } from '@/lib/api/hooks'
import { PageHeader } from '@/components/shared/PageHeader'
import { AuditTimeline } from '@/components/shared/AuditTimeline'
import { PageLoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function ClienteHistorialPage() {
  const { data, isLoading } = useClienteHistorial()

  if (isLoading) return <PageLoadingSkeleton />

  return (
    <div>
      <PageHeader title="Historial" description="Registro de actividad de tu empresa" />
      <AuditTimeline logs={data ?? []} />
    </div>
  )
}

export function ClientePerfilPage() {
  const { data, isLoading } = useClientePerfil()

  if (isLoading || !data) return <PageLoadingSkeleton />

  return (
    <div>
      <PageHeader title="Perfil" description="Datos de empresa y usuario" />
      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Empresa</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="text-slate-500">Nombre:</span> {data.tenant.name}</p>
            <p><span className="text-slate-500">Razón social:</span> {data.tenant.legalName}</p>
            <p><span className="text-slate-500">RFC:</span> {data.tenant.rfc ?? '—'}</p>
            <p><span className="text-slate-500">Dirección:</span> {data.tenant.address}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Usuario</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="text-slate-500">Nombre:</span> {data.user.name}</p>
            <p><span className="text-slate-500">Email:</span> {data.user.email}</p>
            <p><span className="text-slate-500">Teléfono:</span> {data.user.phone ?? '—'}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
