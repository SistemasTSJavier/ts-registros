import { Link } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'
import { useAdminDashboard } from '@/lib/api/hooks'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { PageLoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { ErrorState } from '@/components/shared/ErrorState'
import { Badge } from '@/components/ui/badge'
import { formatPermissions } from '@/lib/auth/permissions'
import type { Tenant, User } from '@/lib/schemas'

type ClientRow = Tenant & { userCount: number; extraUserCount: number }
type ExtraUserRow = User & { tenantName: string }

function isPanelExpired(date: string) {
  return new Date(date) < new Date()
}

export function AdminDashboardPage() {
  const { data, isLoading, isError, refetch } = useAdminDashboard()

  if (isLoading) return <PageLoadingSkeleton />
  if (isError || !data) return <ErrorState onRetry={() => refetch()} />

  const clientColumns: ColumnDef<ClientRow>[] = [
    {
      accessorKey: 'name',
      header: 'Empresa',
      cell: ({ row }) => (
        <Link to={`/admin/clientes/${row.original.id}`} className="font-medium text-blue-600 hover:underline">
          {row.original.name}
        </Link>
      ),
    },
    { accessorKey: 'primaryContactName', header: 'Encargado' },
    { accessorKey: 'primaryContactEmail', header: 'Correo' },
    { accessorKey: 'phone', header: 'Teléfono' },
    {
      accessorKey: 'panelExpiresAt',
      header: 'Vencimiento',
      cell: ({ row }) => (
        <span className={isPanelExpired(row.original.panelExpiresAt) ? 'text-red-600' : 'text-slate-700'}>
          {row.original.panelExpiresAt}
        </span>
      ),
    },
    { accessorKey: 'userCount', header: 'Usuarios' },
    { accessorKey: 'extraUserCount', header: 'Extras' },
    {
      accessorKey: 'status',
      header: 'Estado',
      cell: ({ row }) => (
        <Badge variant={row.original.status === 'active' ? 'approved' : 'expired'}>
          {row.original.status === 'active' ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
  ]

  const extraUserColumns: ColumnDef<ExtraUserRow>[] = [
    { accessorKey: 'tenantName', header: 'Cliente' },
    { accessorKey: 'name', header: 'Usuario' },
    { accessorKey: 'email', header: 'Correo' },
    {
      id: 'permissions',
      header: 'Permisos',
      cell: ({ row }) => (
        <span className="text-sm text-slate-600">
          {row.original.permissions ? formatPermissions(row.original.permissions) : '—'}
        </span>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Alta',
      cell: () => '—',
    },
  ]

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Clientes del panel y usuarios adicionales"
        action={{ label: '+ Nuevo cliente', href: '/admin/clientes/nuevo' }}
      />

      <section className="mb-10">
        <h2 className="mb-4 text-lg font-semibold">Clientes registrados</h2>
        <DataTable columns={clientColumns} data={data.clients} searchKey="name" searchPlaceholder="Buscar empresa..." />
      </section>

      <section>
        <h2 className="mb-1 text-lg font-semibold">Usuarios extras por cliente</h2>
        <p className="mb-4 text-sm text-slate-500">
          Usuarios adicionales que cada cliente ha ido agregando en su panel.
        </p>
        {data.extraUsers.length > 0 ? (
          <DataTable columns={extraUserColumns} data={data.extraUsers} />
        ) : (
          <p className="rounded-lg border border-dashed bg-slate-50 py-8 text-center text-sm text-slate-500">
            Aún no hay usuarios extras. Aparecerán cuando los clientes los agreguen desde su panel.
          </p>
        )}
      </section>
    </div>
  )
}
