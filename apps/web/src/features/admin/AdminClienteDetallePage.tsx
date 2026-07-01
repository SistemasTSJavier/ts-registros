import { Link, useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import type { ColumnDef } from '@tanstack/react-table'
import { toast } from 'sonner'
import { useTenant, useUpdateTenant } from '@/lib/api/hooks'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatCard } from '@/components/shared/StatCard'
import { DataTable } from '@/components/shared/DataTable'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { PageLoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { ErrorState } from '@/components/shared/ErrorState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useState } from 'react'
import { formatDate } from '@/lib/utils'
import type { Registration, User } from '@/lib/schemas'
import { formatPermissions } from '@/lib/auth/permissions'
import { Badge } from '@/components/ui/badge'
import { LocationPreview } from '@/components/shared/LocationPreview'

export function AdminClienteDetallePage() {
  const { id = '' } = useParams()
  const { data, isLoading, isError, refetch } = useTenant(id)
  const [tab, setTab] = useState('resumen')

  if (isLoading) return <PageLoadingSkeleton />
  if (isError || !data) return <ErrorState onRetry={() => refetch()} />

  const { tenant, users, registrations, stats } = data

  const regColumns: ColumnDef<Registration>[] = [
    { accessorKey: 'typeName', header: 'Tipo' },
    { accessorKey: 'status', header: 'Estado', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    { accessorKey: 'inviteEmail', header: 'Invitado' },
    { accessorKey: 'createdAt', header: 'Fecha', cell: ({ row }) => formatDate(row.original.createdAt) },
  ]

  const userColumns: ColumnDef<User>[] = [
    { accessorKey: 'name', header: 'Nombre' },
    { accessorKey: 'email', header: 'Email' },
    {
      accessorKey: 'isPrimary',
      header: 'Tipo',
      cell: ({ row }) =>
        row.original.isPrimary ? (
          <Badge variant="invited">Principal</Badge>
        ) : (
          <Badge variant="secondary">Extra</Badge>
        ),
    },
    {
      id: 'permissions',
      header: 'Permisos',
      cell: ({ row }) => (
        <span className="text-sm text-slate-600">
          {row.original.permissions ? formatPermissions(row.original.permissions) : '—'}
        </span>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title={tenant.name}
        breadcrumbs={[{ label: 'Clientes', href: '/admin/clientes' }, { label: tenant.name }]}
        action={{ label: 'Editar', href: `/admin/clientes/${id}/editar` }}
      />
      <Tabs>
        <TabsList className="mb-4">
          {['resumen', 'usuarios', 'registros'].map((t) => (
            <TabsTrigger key={t} active={tab === t} onClick={() => setTab(t)} className="capitalize">
              {t}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent>
          {tab === 'resumen' && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <StatCard label="Usuarios" value={users.length} accent="admin" />
                <StatCard label="Registros" value={stats.registrations} accent="admin" />
                <StatCard label="Pendientes" value={stats.pending} accent="admin" />
              </div>
              <Card>
                <CardHeader><CardTitle>Datos del cliente</CardTitle></CardHeader>
                <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
                  <p><span className="text-slate-500">Empresa:</span> {tenant.name}</p>
                  <p><span className="text-slate-500">Teléfono:</span> {tenant.phone}</p>
                  <p><span className="text-slate-500">Encargado:</span> {tenant.primaryContactName}</p>
                  <p><span className="text-slate-500">Correo:</span> {tenant.primaryContactEmail}</p>
                  <p><span className="text-slate-500">Vencimiento panel:</span> {tenant.panelExpiresAt}</p>
                  <p><span className="text-slate-500">Estado:</span> {tenant.status === 'active' ? 'Activo' : 'Inactivo'}</p>
                  <p className="sm:col-span-2"><span className="text-slate-500">Ubicación:</span> {tenant.address}</p>
                  {tenant.addressLat != null && tenant.addressLng != null && (
                    <div className="sm:col-span-2">
                      <LocationPreview lat={tenant.addressLat} lng={tenant.addressLng} address={tenant.address} />
                    </div>
                  )}
                </CardContent>
              </Card>
              <Link to={`/admin/logs?tenant=${id}`} className="text-sm font-medium text-blue-600 hover:underline">
                Ver audit logs de este cliente →
              </Link>
            </div>
          )}
          {tab === 'usuarios' && <DataTable columns={userColumns} data={users} />}
          {tab === 'registros' && <DataTable columns={regColumns} data={registrations} />}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export function AdminClienteEditarPage() {
  const { id = '' } = useParams()
  const { data, isLoading } = useTenant(id)
  const updateTenant = useUpdateTenant(id)
  const navigate = useNavigate()
  const { register, handleSubmit } = useForm({
    values: data?.tenant,
  })

  if (isLoading || !data) return <PageLoadingSkeleton />

  return (
    <div>
      <PageHeader
        title={`Editar: ${data.tenant.name}`}
        breadcrumbs={[
          { label: 'Clientes', href: '/admin/clientes' },
          { label: data.tenant.name, href: `/admin/clientes/${id}` },
          { label: 'Editar' },
        ]}
      />
      <form
        onSubmit={handleSubmit(async (formData) => {
          await updateTenant.mutateAsync(formData)
          toast.success('Cliente actualizado')
          navigate(`/admin/clientes/${id}`)
        })}
        className="max-w-xl space-y-4"
      >
        <div className="space-y-2"><Label>Empresa</Label><Input {...register('name')} /></div>
        <div className="space-y-2"><Label>Teléfono</Label><Input {...register('phone')} /></div>
        <div className="space-y-2"><Label>Encargado</Label><Input {...register('primaryContactName')} /></div>
        <div className="space-y-2"><Label>Correo</Label><Input type="email" {...register('primaryContactEmail')} /></div>
        <div className="space-y-2"><Label>Ubicación</Label><Input {...register('address')} /></div>
        <div className="space-y-2"><Label>Vencimiento panel</Label><Input type="date" {...register('panelExpiresAt')} /></div>
        <Button type="submit" disabled={updateTenant.isPending}>Guardar cambios</Button>
      </form>
    </div>
  )
}
