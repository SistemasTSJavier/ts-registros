import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api/client'
import { useAuthStore } from '@/lib/auth/store'
import { usePortalStore } from '@/lib/auth/portal-store'
import type {
  AccessCredential,
  AuditLog,
  CreateRegistrationInput,
  CreateTenantInput,
  Document,
  Invitation,
  Person,
  Registration,
  RegistrationType,
  Tenant,
  User,
  ValidationItem,
} from '@/lib/schemas'

function useToken() {
  return useAuthStore((s) => s.accessToken)
}

function usePortalToken() {
  return usePortalStore((s) => s.token)
}

export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession)
  return useMutation({
    mutationFn: (data: { email: string; password: string; role?: string }) =>
      apiFetch<{ user: User; tenant: Tenant | null; accessToken: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: ({ user, tenant, accessToken }) => setSession(user, tenant, accessToken),
  })
}

export function useAdminStats() {
  const token = useToken()
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => apiFetch<{ totalTenants: number; totalRegistrations: number; pendingValidations: number; accessIssuedToday: number }>('/api/admin/stats', { token }),
    enabled: !!token,
  })
}

export function useTenants() {
  const token = useToken()
  return useQuery({
    queryKey: ['admin', 'tenants'],
    queryFn: () =>
      apiFetch<(Tenant & { registrationCount: number; userCount: number; extraUserCount: number })[]>(
        '/api/admin/tenants',
        { token },
      ),
    enabled: !!token,
  })
}

export function useTenant(id: string) {
  const token = useToken()
  return useQuery({
    queryKey: ['admin', 'tenant', id],
    queryFn: () =>
      apiFetch<{
        tenant: Tenant
        users: User[]
        registrations: Registration[]
        logs: AuditLog[]
        stats: { registrations: number; persons: number; pending: number }
      }>(`/api/admin/tenants/${id}`, { token }),
    enabled: !!token && !!id,
  })
}

export function useAdminDashboard() {
  const token = useToken()
  return useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () =>
      apiFetch<{
        clients: (Tenant & { userCount: number; extraUserCount: number; users: User[] })[]
        extraUsers: (User & { tenantName: string })[]
      }>('/api/admin/dashboard', { token }),
    enabled: !!token,
  })
}

export function useAdminLogs(tenantId: string) {
  const token = useToken()
  return useQuery({
    queryKey: ['admin', 'logs', tenantId],
    queryFn: () =>
      apiFetch<(AuditLog & { tenantName: string })[]>(
        `/api/admin/logs?tenantId=${encodeURIComponent(tenantId)}`,
        { token },
      ),
    enabled: !!token,
  })
}

export function useCreateTenant() {
  const token = useToken()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateTenantInput) =>
      apiFetch<{
        tenant: Tenant
        user: User
        emailSent: {
          to: string
          loginUrl: string
          password: string
          panelExpiresAt: string
          delivered?: boolean
          resendId?: string | null
          error?: string
        }
      }>('/api/admin/tenants', { method: 'POST', body: JSON.stringify(data), token }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin'] }),
  })
}

export function useUpdateTenant(id: string) {
  const token = useToken()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<CreateTenantInput>) =>
      apiFetch(`/api/admin/tenants/${id}`, { method: 'PATCH', body: JSON.stringify(data), token }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin'] })
      qc.invalidateQueries({ queryKey: ['admin', 'tenant', id] })
    },
  })
}

export function useAdminRegistrations() {
  const token = useToken()
  return useQuery({
    queryKey: ['admin', 'registrations'],
    queryFn: () =>
      apiFetch<(Registration & { tenantName: string; personCount: number })[]>('/api/admin/registrations', { token }),
    enabled: !!token,
  })
}

export function useRegistrationTypes() {
  return useQuery({
    queryKey: ['registration-types'],
    queryFn: () => apiFetch<RegistrationType[]>('/api/registration-types'),
  })
}

export function useClienteStats() {
  const token = useToken()
  return useQuery({
    queryKey: ['cliente', 'stats'],
    queryFn: () => apiFetch<{ pendingValidations: number; activeAccess: number }>('/api/cliente/stats', { token }),
    enabled: !!token,
  })
}

export type RegistrationListItem = Registration & {
  personCount: number
  persons: (Person & { documentCount: number; invitationToken: string | null })[]
}

export type EnrichedPersonDetail = Person & {
  documents: Document[]
  validationItems: ValidationItem[]
  credential: AccessCredential | null
  invitation: Invitation | null
}

export function useRegistrations(filters?: { typeCode?: string; status?: string }) {
  const token = useToken()
  const params = new URLSearchParams()
  if (filters?.typeCode) params.set('typeCode', filters.typeCode)
  if (filters?.status) params.set('status', filters.status)
  const query = params.toString()
  return useQuery({
    queryKey: ['cliente', 'registrations', filters?.typeCode ?? 'all', filters?.status ?? 'all'],
    queryFn: () =>
      apiFetch<RegistrationListItem[]>(
        `/api/cliente/registrations${query ? `?${query}` : ''}`,
        { token },
      ),
    enabled: !!token,
  })
}

export function useRegistration(id: string) {
  const token = useToken()
  return useQuery({
    queryKey: ['cliente', 'registration', id],
    queryFn: () =>
      apiFetch<{ registration: Registration; persons: EnrichedPersonDetail[]; logs: AuditLog[] }>(
        `/api/cliente/registrations/${id}`,
        { token },
      ),
    enabled: !!token && !!id,
  })
}

export function useCreateRegistration() {
  const token = useToken()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateRegistrationInput) =>
      apiFetch<{
        registration: Registration
        invitations: Array<{ personId: string; email: string; token: string; loginUrl: string }>
      }>('/api/cliente/registrations', {
        method: 'POST',
        body: JSON.stringify(data),
        token,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cliente'] }),
  })
}

export function usePendingValidations() {
  const token = useToken()
  return useQuery({
    queryKey: ['cliente', 'validations'],
    queryFn: () =>
      apiFetch<
        (Person & {
          registrationType: string
          registrationId: string
          documentCount: number
          pendingDocs: number
        })[]
      >('/api/cliente/validations', { token }),
    enabled: !!token,
  })
}

export function usePersonValidation(id: string) {
  const token = useToken()
  return useQuery({
    queryKey: ['cliente', 'person', id],
    queryFn: () =>
      apiFetch<{
        person: Person
        documents: Document[]
        validationItems: ValidationItem[]
        registration: Registration
      }>(`/api/cliente/persons/${id}`, { token }),
    enabled: !!token && !!id,
  })
}

export function useValidateItem() {
  const token = useToken()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, rejectionReason }: { id: string; status: 'approved' | 'rejected'; rejectionReason?: string }) =>
      apiFetch(`/api/cliente/validation-items/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, rejectionReason }),
        token,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cliente'] })
      qc.invalidateQueries({ queryKey: ['cliente', 'person'] })
    },
  })
}

export function useApprovePerson() {
  const token = useToken()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (personId: string) =>
      apiFetch<{ person: Person; credential?: AccessCredential }>(`/api/cliente/persons/${personId}/approve`, {
        method: 'POST',
        token,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cliente'] }),
  })
}

export function useClienteHistorial() {
  const token = useToken()
  return useQuery({
    queryKey: ['cliente', 'historial'],
    queryFn: () => apiFetch<AuditLog[]>('/api/cliente/historial', { token }),
    enabled: !!token,
  })
}

export function useClientePerfil() {
  const token = useToken()
  return useQuery({
    queryKey: ['cliente', 'perfil'],
    queryFn: () => apiFetch<{ user: User; tenant: Tenant }>('/api/cliente/perfil', { token }),
    enabled: !!token,
  })
}

export function useInvitation(token: string) {
  return useQuery({
    queryKey: ['portal', 'invitation', token],
    queryFn: () =>
      apiFetch<{
        invitation: Invitation
        registration: Registration
        tenant: Tenant
        type: RegistrationType
        person: Person | null
      }>(`/api/portal/invitation/${token}`),
    enabled: !!token,
  })
}

export function useAcceptInvitation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (token: string) =>
      apiFetch(`/api/portal/invitation/${token}/accept`, { method: 'POST' }),
    onSuccess: (_, token) => qc.invalidateQueries({ queryKey: ['portal', 'invitation', token] }),
  })
}

export function usePortalSession() {
  const portalToken = usePortalToken()
  return useQuery({
    queryKey: ['portal', 'session', portalToken],
    queryFn: () =>
      apiFetch<{
        registration: Registration
        tenant: Tenant
        type: RegistrationType
        persons: Person[]
        personId: string | null
      }>('/api/portal/session', { portalToken }),
    enabled: !!portalToken,
  })
}

export function usePortalPerson(id: string) {
  const portalToken = usePortalToken()
  return useQuery({
    queryKey: ['portal', 'person', id],
    queryFn: () =>
      apiFetch<{
        person: Person
        documents: Document[]
        validationItems: ValidationItem[]
        credential: AccessCredential | null
        type: RegistrationType
      }>(`/api/portal/persons/${id}`, { portalToken }),
    enabled: !!portalToken && !!id,
    refetchInterval: (query) => {
      const person = query.state.data?.person
      if (person?.overallStatus === 'pending_validation') return 3000
      return false
    },
  })
}

export function useCreatePerson() {
  const portalToken = usePortalToken()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (personalData: Record<string, string>) =>
      apiFetch<Person>('/api/portal/persons', {
        method: 'POST',
        body: JSON.stringify({ personalData }),
        portalToken,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portal'] }),
  })
}

export function useUploadDocument(personId: string) {
  const portalToken = usePortalToken()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; type: string; fileName: string; contentBase64?: string }) =>
      apiFetch(`/api/portal/persons/${personId}/documents`, {
        method: 'POST',
        body: JSON.stringify(data),
        portalToken,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal', 'person', personId] })
      qc.invalidateQueries({ queryKey: ['portal', 'session'] })
    },
  })
}

export function useStartIncodeMock(personId: string) {
  const portalToken = usePortalToken()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () =>
      apiFetch(`/api/portal/persons/${personId}/incode`, { method: 'POST', portalToken }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portal', 'person', personId] }),
  })
}

export function useAccessCredential(personId: string) {
  const portalToken = usePortalToken()
  return useQuery({
    queryKey: ['portal', 'access', personId],
    queryFn: () => apiFetch<AccessCredential>(`/api/portal/persons/${personId}/access`, { portalToken }),
    enabled: !!portalToken && !!personId,
    retry: false,
  })
}
