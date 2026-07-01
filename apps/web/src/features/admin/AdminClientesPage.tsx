import { Link, useNavigate } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'
import { useTenants } from '@/lib/api/hooks'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { PageLoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { ErrorState } from '@/components/shared/ErrorState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import type { Tenant } from '@/lib/schemas'

type TenantRow = Tenant & { registrationCount: number; userCount: number; extraUserCount: number }

export function AdminClientesPage() {
  const { data, isLoading, isError, refetch } = useTenants()
  const navigate = useNavigate()

  const columns: ColumnDef<TenantRow>[] = [
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
    { accessorKey: 'panelExpiresAt', header: 'Vencimiento' },
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
    { accessorKey: 'createdAt', header: 'Alta', cell: ({ row }) => formatDate(row.original.createdAt) },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/clientes/${row.original.id}`)}>
          Ver
        </Button>
      ),
    },
  ]

  if (isLoading) return <PageLoadingSkeleton />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  return (
    <div>
      <PageHeader
        title="Clientes"
        description="Empresas con acceso al panel cliente"
        action={{ label: '+ Nuevo cliente', href: '/admin/clientes/nuevo' }}
      />
      <DataTable columns={columns} data={data ?? []} searchKey="name" searchPlaceholder="Buscar empresa..." />
    </div>
  )
}
