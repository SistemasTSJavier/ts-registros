import { useRegistrationTypes } from '@/lib/api/hooks'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PageLoadingSkeleton } from '@/components/shared/LoadingSkeleton'

export function AdminConfigPage() {
  const { data, isLoading } = useRegistrationTypes()

  if (isLoading) return <PageLoadingSkeleton />

  return (
    <div>
      <PageHeader title="Configuración" description="Tipos de registro disponibles (solo lectura)" />
      <div className="grid gap-4 sm:grid-cols-2">
        {data?.map((type) => (
          <Card key={type.id}>
            <CardHeader>
              <CardTitle>{type.name}</CardTitle>
              <CardDescription>{type.description}</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">
              <p>Código: <code className="font-mono">{type.code}</code></p>
              <p className="mt-2">Campos: {type.fieldSchema.fields.length}</p>
              <p>Incode: {type.requiresIncode ? 'Sí' : 'No'}</p>
              <p>Acceso QR: {type.requiresAccess ? 'Sí' : 'No'}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
