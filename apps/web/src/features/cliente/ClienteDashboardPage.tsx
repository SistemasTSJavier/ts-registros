import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useClienteStats, useRegistrations } from '@/lib/api/hooks'
import type { RegistrationListItem } from '@/lib/api/hooks'
import { useAuthStore } from '@/lib/auth/store'
import { canCreate } from '@/lib/auth/permissions'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatCard } from '@/components/shared/StatCard'
import { DataTable } from '@/components/shared/DataTable'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { PersonDetailCard } from '@/components/shared/PersonDetailCard'
import { PageLoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { buttonVariants } from '@/components/ui/button'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { cn, formatDate } from '@/lib/utils'

const TYPE_OPTIONS = [
  { value: 'all', label: 'Todos los tipos' },
  { value: 'visitante', label: 'Visitantes' },
  { value: 'proveedor', label: 'Proveedores' },
  { value: 'cliente', label: 'Clientes' },
]

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'invited', label: 'Invitado' },
  { value: 'in_progress', label: 'En progreso' },
  { value: 'pending_validation', label: 'Pendiente validación' },
  { value: 'access_issued', label: 'Acceso emitido' },
  { value: 'approved', label: 'Aprobado' },
]

function RegistrationFilters({
  typeCode,
  status,
  onTypeChange,
  onStatusChange,
}: {
  typeCode: string
  status: string
  onTypeChange: (v: string) => void
  onStatusChange: (v: string) => void
}) {
  return (
    <div className="mb-6 flex flex-wrap gap-4">
      <div className="space-y-1">
        <Label className="text-xs text-slate-500">Tipo de registro</Label>
        <select
          value={typeCode}
          onChange={(e) => onTypeChange(e.target.value)}
          className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
        >
          {TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-slate-500">Estado</Label>
        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
          className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
    </div>
  )
}

function RegistrationsTable({ data, onRowNavigate }: { data: RegistrationListItem[]; onRowNavigate: (id: string) => void }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const columns: ColumnDef<RegistrationListItem>[] = [
    {
      id: 'expand',
      header: '',
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={(e) => {
            e.stopPropagation()
            setExpandedId(expandedId === row.original.id ? null : row.original.id)
          }}
        >
          {expandedId === row.original.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
      ),
    },
    { accessorKey: 'typeName', header: 'Tipo' },
    { accessorKey: 'status', header: 'Estado', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    {
      accessorKey: 'payload.fechaCita',
      header: 'Cita',
      cell: ({ row }) => row.original.payload.fechaCita ?? '—',
    },
    { accessorKey: 'personCount', header: 'Personas' },
    { accessorKey: 'createdAt', header: 'Alta', cell: ({ row }) => formatDate(row.original.createdAt) },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Button variant="ghost" size="sm" onClick={() => onRowNavigate(row.original.id)}>
          Ver detalle
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <DataTable columns={columns} data={data} searchKey="typeName" searchPlaceholder="Buscar registro..." />
      {expandedId && (
        <div className="space-y-4 rounded-lg border bg-slate-50 p-4">
          <h3 className="font-medium">Personas del registro</h3>
          {data
            .find((r) => r.id === expandedId)
            ?.persons.map((person) => (
              <PersonDetailCard key={person.id} person={person} />
            ))}
        </div>
      )}
    </div>
  )
}

export function ClienteDashboardPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const tenant = useAuthStore((s) => s.tenant)
  const [typeCode, setTypeCode] = useState('all')
  const [status, setStatus] = useState('all')
  const stats = useClienteStats()
  const registrations = useRegistrations({
    typeCode: typeCode === 'all' ? undefined : typeCode,
    status: status === 'all' ? undefined : status,
  })
  const allowCreate = canCreate(user)

  if (stats.isLoading) return <PageLoadingSkeleton />

  return (
    <div>
      <PageHeader title={`Hola, ${tenant?.name ?? 'Cliente'}`} description="Consulta y filtra tus registros activos" />
      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <StatCard label="Validaciones pendientes" value={stats.data?.pendingValidations ?? 0} accent="cliente" />
        <StatCard label="Accesos activos" value={stats.data?.activeAccess ?? 0} accent="cliente" />
      </div>
      {allowCreate && (
        <Link
          to="/cliente/registros/nuevo"
          className={cn(buttonVariants({ variant: 'cliente', size: 'lg' }), 'mb-8 inline-flex')}
        >
          + Crear nuevo registro
        </Link>
      )}
      <section>
        <h2 className="mb-4 text-lg font-semibold">Registros</h2>
        <RegistrationFilters
          typeCode={typeCode}
          status={status}
          onTypeChange={setTypeCode}
          onStatusChange={setStatus}
        />
        {registrations.data ? (
          <RegistrationsTable data={registrations.data} onRowNavigate={(id) => navigate(`/cliente/registros/${id}`)} />
        ) : (
          <PageLoadingSkeleton />
        )}
      </section>
    </div>
  )
}

export function ClienteRegistrosPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [typeCode, setTypeCode] = useState('all')
  const [status, setStatus] = useState('all')
  const { data, isLoading } = useRegistrations({
    typeCode: typeCode === 'all' ? undefined : typeCode,
    status: status === 'all' ? undefined : status,
  })
  const allowCreate = canCreate(user)

  if (isLoading) return <PageLoadingSkeleton />

  return (
    <div>
      <PageHeader
        title="Registros"
        description="Proveedores, visitantes, clientes y sus personas asociadas"
        action={allowCreate ? { label: '+ Nuevo registro', href: '/cliente/registros/nuevo' } : undefined}
      />
      <RegistrationFilters
        typeCode={typeCode}
        status={status}
        onTypeChange={setTypeCode}
        onStatusChange={setStatus}
      />
      <RegistrationsTable data={data ?? []} onRowNavigate={(id) => navigate(`/cliente/registros/${id}`)} />
    </div>
  )
}
