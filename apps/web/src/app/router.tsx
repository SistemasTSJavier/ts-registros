import { createBrowserRouter, Navigate } from 'react-router-dom'
import { ProtectedRoute, PortalProtectedRoute } from '@/app/guards'
import { AdminLayout, ClienteLayout, PortalLayout, AuthLayout } from '@/layouts/AppLayouts'
import { LandingPage } from '@/features/auth/LandingPage'
import { LoginPage, RecoverPasswordPage } from '@/features/auth/LoginPage'
import { AdminDashboardPage } from '@/features/admin/AdminDashboardPage'
import { AdminClientesPage } from '@/features/admin/AdminClientesPage'
import { AdminClienteNuevoPage } from '@/features/admin/AdminClienteNuevoPage'
import { AdminClienteDetallePage, AdminClienteEditarPage } from '@/features/admin/AdminClienteDetallePage'
import { AdminLogsPage } from '@/features/admin/AdminLogsPage'
import { ClienteDashboardPage, ClienteRegistrosPage } from '@/features/cliente/ClienteDashboardPage'
import { ClienteNuevoRegistroPage } from '@/features/cliente/ClienteNuevoRegistroPage'
import { ClienteRegistroDetallePage } from '@/features/cliente/ClienteRegistroDetallePage'
import { ClienteValidacionesPage } from '@/features/cliente/ClienteValidacionesPage'
import { ClienteValidacionDetallePage } from '@/features/cliente/ClienteValidacionDetallePage'
import { ClienteHistorialPage, ClientePerfilPage } from '@/features/cliente/ClienteHistorialPage'
import { PortalInvitacionPage } from '@/features/portal/PortalInvitacionPage'
import { PortalHomePage } from '@/features/portal/PortalHomePage'
import { PortalNuevaPersonaPage } from '@/features/portal/PortalNuevaPersonaPage'
import {
  PortalPersonaDetallePage,
  PortalDocumentosPage,
  PortalVerificacionPage,
  PortalAccesoPage,
} from '@/features/portal/PortalPersonaPages'

export const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/login/recuperar', element: <RecoverPasswordPage /> },
    ],
  },
  { path: '/portal/invitacion/:token', element: <PortalInvitacionPage /> },
  {
    path: '/admin',
    element: (
      <ProtectedRoute role="admin">
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <AdminDashboardPage /> },
      { path: 'clientes', element: <AdminClientesPage /> },
      { path: 'clientes/nuevo', element: <AdminClienteNuevoPage /> },
      { path: 'clientes/:id', element: <AdminClienteDetallePage /> },
      { path: 'clientes/:id/editar', element: <AdminClienteEditarPage /> },
      { path: 'logs', element: <AdminLogsPage /> },
    ],
  },
  {
    path: '/cliente',
    element: (
      <ProtectedRoute role="cliente">
        <ClienteLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <ClienteDashboardPage /> },
      { path: 'registros', element: <ClienteRegistrosPage /> },
      { path: 'registros/nuevo', element: <ClienteNuevoRegistroPage /> },
      { path: 'registros/:id', element: <ClienteRegistroDetallePage /> },
      { path: 'validaciones', element: <ClienteValidacionesPage /> },
      { path: 'validaciones/:personId', element: <ClienteValidacionDetallePage /> },
      { path: 'historial', element: <ClienteHistorialPage /> },
      { path: 'perfil', element: <ClientePerfilPage /> },
    ],
  },
  {
    path: '/portal',
    element: (
      <PortalProtectedRoute>
        <PortalLayout />
      </PortalProtectedRoute>
    ),
    children: [
      { index: true, element: <PortalHomePage /> },
      { path: 'personas/nueva', element: <PortalNuevaPersonaPage /> },
      { path: 'personas/:id', element: <PortalPersonaDetallePage /> },
      { path: 'personas/:id/documentos', element: <PortalDocumentosPage /> },
      { path: 'personas/:id/verificacion', element: <PortalVerificacionPage /> },
      { path: 'personas/:id/acceso', element: <PortalAccesoPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
