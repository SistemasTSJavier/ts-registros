import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'
import { useAdminLogs, useTenants } from '@/lib/api/hooks'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { PageLoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { ErrorState } from '@/components/shared/ErrorState'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { formatDate } from '@/lib/utils'
import type { AuditLog } from '@/lib/schemas'

type LogRow = AuditLog & { tenantName: string }

const actionLabels: Record<string, string> = {
  crear: 'Crear',
  editar: 'Editar',
  eliminar: 'Eliminar',
  validar: 'Validar',
  emitir_acceso: 'Emitir acceso',
  invitar: 'Invitar',
  enviar_acceso: 'Enviar acceso',
}

export function AdminLogsPage() {
  const [searchParams] = useSearchParams()
  const [tenantFilter, setTenantFilter] = useState(searchParams.get('tenant') ?? 'all')

  useEffect(() => {
    const tenant = searchParams.get('tenant')
    if (tenant) setTenantFilter(tenant)
  }, [searchParams])
  const tenants = useTenants()
  const { data, isLoading, isError, refetch } = useAdminLogs(tenantFilter)

  const columns: ColumnDef<LogRow>[] = [
    { accessorKey: 'createdAt', header: 'Fecha', cell: ({ row }) => formatDate(row.original.createdAt) },
    { accessorKey: 'tenantName', header: 'Cliente' },
    { accessorKey: 'actorName', header: 'Actor' },
    {
      accessorKey: 'action',
      header: 'Acción',
      cell: ({ row }) => actionLabels[row.original.action] ?? row.original.action,
    },
    { accessorKey: 'entity', header: 'Entidad' },
    { accessorKey: 'detail', header: 'Detalle' },
  ]

  if (tenants.isLoading) return <PageLoadingSkeleton />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  return (
    <div>
      <PageHeader title="Audit logs" description="Registro de actividad del sistema" />

      <div className="mb-6 max-w-xs">
        <Label htmlFor="tenant-filter">Filtrar por cliente</Label>
        <Select
          id="tenant-filter"
          className="mt-2"
          value={tenantFilter}
          onChange={(e) => setTenantFilter(e.target.value)}
        >
          <option value="all">Todos los clientes</option>
          {tenants.data?.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
      </div>

      {isLoading ? (
        <PageLoadingSkeleton />
      ) : (
        <DataTable columns={columns} data={data ?? []} searchKey="detail" searchPlaceholder="Buscar en detalle..." />
      )}
    </div>
  )
}
