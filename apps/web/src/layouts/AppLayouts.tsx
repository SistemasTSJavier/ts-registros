import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import { LayoutDashboard, Building2, ScrollText, LogOut, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { useAuthStore } from '@/lib/auth/store'
import { usePortalStore } from '@/lib/auth/portal-store'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/clientes', label: 'Clientes', icon: Building2 },
  { to: '/admin/logs', label: 'Audit logs', icon: ScrollText },
]

export function AdminLayout() {
  const logout = useAuthStore((s) => s.logout)
  const user = useAuthStore((s) => s.user)
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 border-r bg-slate-900 text-white transition-transform lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center border-b border-slate-700 px-6">
          <span className="text-lg font-bold">Registros CRM</span>
          <span className="ml-2 rounded bg-blue-600 px-1.5 py-0.5 text-xs">Admin</span>
        </div>
        <nav className="space-y-1 p-4">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                (end ? location.pathname === to : location.pathname.startsWith(to))
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white',
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="absolute bottom-0 w-full border-t border-slate-700 p-4">
          <p className="truncate text-xs text-slate-400">{user?.email}</p>
          <Button variant="ghost" size="sm" className="mt-2 w-full justify-start text-slate-300 hover:text-white" onClick={logout}>
            <LogOut className="mr-2 h-4 w-4" />
            Cerrar sesión
          </Button>
        </div>
      </aside>
      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center border-b bg-white px-4 lg:hidden">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} aria-label="Abrir menú">
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </header>
        <main className="flex-1 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export function ClienteLayout() {
  const logout = useAuthStore((s) => s.logout)
  const user = useAuthStore((s) => s.user)
  const tenant = useAuthStore((s) => s.tenant)
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const navItems = [
    { to: '/cliente', label: 'Inicio', end: true },
    { to: '/cliente/registros', label: 'Registros' },
    { to: '/cliente/validaciones', label: 'Validaciones' },
    { to: '/cliente/historial', label: 'Historial' },
    { to: '/cliente/perfil', label: 'Perfil' },
  ]

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 border-r bg-white transition-transform lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="border-b border-l-4 border-l-emerald-600 p-6">
          <span className="text-lg font-bold text-slate-900">Registros CRM</span>
          <p className="mt-1 truncate text-sm text-slate-500">{tenant?.name}</p>
        </div>
        <nav className="space-y-1 p-4">
          {navItems.map(({ to, label, end }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                'block rounded-md px-3 py-2 text-sm font-medium transition-colors',
                (end ? location.pathname === to : location.pathname.startsWith(to))
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-slate-600 hover:bg-slate-100',
              )}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="absolute bottom-0 w-full border-t p-4">
          <p className="truncate text-xs text-slate-500">{user?.name}</p>
          <Button variant="ghost" size="sm" className="mt-2 w-full justify-start" onClick={logout}>
            <LogOut className="mr-2 h-4 w-4" />
            Cerrar sesión
          </Button>
        </div>
      </aside>
      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center border-b bg-white px-4 lg:hidden">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} aria-label="Abrir menú">
            <Menu className="h-5 w-5" />
          </Button>
        </header>
        <main className="flex-1 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export function PortalLayout() {
  const { registrationId, clearPortalSession } = usePortalStore()
  const portalToken = usePortalStore((s) => s.token)

  if (!portalToken) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      <header className="border-b border-indigo-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <div>
            <span className="text-lg font-bold text-indigo-700">Portal de Registro</span>
            {registrationId && <p className="text-xs text-slate-500">ID: {registrationId.slice(0, 8)}...</p>}
          </div>
          <Button variant="ghost" size="sm" onClick={clearPortalSession}>
            Salir
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}

export function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md">
        <Outlet />
      </div>
    </div>
  )
}
