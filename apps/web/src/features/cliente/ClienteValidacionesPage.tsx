import { useNavigate } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'
import { usePendingValidations } from '@/lib/api/hooks'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { DataTable } from '@/components/shared/DataTable'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageLoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { formatDate } from '@/lib/utils'
import type { Person } from '@/lib/schemas'

type ValidationRow = Person & {
  registrationType: string
  registrationId: string
  documentCount: number
  pendingDocs: number
}

export function ClienteValidacionesPage() {
  const navigate = useNavigate()
  const { data, isLoading } = usePendingValidations()

  const columns: ColumnDef<ValidationRow>[] = [
    {
      accessorKey: 'personalData.nombreCompleto',
      header: 'Persona',
      cell: ({ row }) => row.original.personalData.nombreCompleto ?? '—',
    },
    { accessorKey: 'registrationType', header: 'Tipo' },
    { accessorKey: 'documentCount', header: 'Docs' },
    { accessorKey: 'incodeStatus', header: 'Incode' },
    { accessorKey: 'createdAt', header: 'Desde', cell: ({ row }) => formatDate(row.original.createdAt) },
    {
      accessorKey: 'overallStatus',
      header: 'Estado',
      cell: ({ row }) => <StatusBadge status={row.original.overallStatus} />,
    },
  ]

  if (isLoading) return <PageLoadingSkeleton />

  return (
    <div>
      <PageHeader title="Bandeja de validaciones" description="Personas pendientes de revisión" />
      {data && data.length > 0 ? (
        <DataTable
          columns={columns}
          data={data}
          onRowClick={(row) => navigate(`/cliente/validaciones/${row.id}`)}
        />
      ) : (
        <EmptyState title="Sin validaciones pendientes" description="No hay personas esperando tu revisión." />
      )}
    </div>
  )
}
