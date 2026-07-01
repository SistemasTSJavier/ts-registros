import { Link } from 'react-router-dom'
import { Shield, Building2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">Registros CRM</h1>
        <p className="mt-2 text-lg text-slate-600">Gestión de visitas, proveedores y accesos a planta</p>
      </div>
      <div className="grid w-full max-w-2xl gap-6 sm:grid-cols-2">
        <Card className="transition-shadow hover:shadow-md">
          <CardHeader>
            <Shield className="h-10 w-10 text-blue-600" />
            <CardTitle className="mt-4">Administrador</CardTitle>
            <CardDescription>Gestión global de clientes, registros y auditoría</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/login" className={cn(buttonVariants({ variant: 'default' }), 'w-full')}>
              Acceso Admin
            </Link>
          </CardContent>
        </Card>
        <Card className="transition-shadow hover:shadow-md">
          <CardHeader>
            <Building2 className="h-10 w-10 text-emerald-600" />
            <CardTitle className="mt-4">Cliente</CardTitle>
            <CardDescription>Crear registros, invitar visitantes y validar documentos</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/login" className={cn(buttonVariants({ variant: 'cliente' }), 'w-full')}>
              Acceso Cliente
            </Link>
          </CardContent>
        </Card>
      </div>
      <p className="mt-8 max-w-md text-center text-sm text-slate-500">
        El portal de visitas y proveedores es accesible únicamente mediante invitación por correo electrónico.
      </p>
    </div>
  )
}
