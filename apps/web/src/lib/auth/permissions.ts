import type { User } from '@/lib/schemas'
import type { UserPermissions } from '@/lib/schemas/permissions'

export function getUserPermissions(user: User | null): UserPermissions {
  if (!user) return { view: false, create: false, delete: false }
  if (user.role === 'admin') return { view: true, create: true, delete: true }
  return user.permissions ?? { view: true, create: true, delete: true }
}

export function canView(user: User | null) {
  return getUserPermissions(user).view
}

export function canCreate(user: User | null) {
  return getUserPermissions(user).create
}

export function canDelete(user: User | null) {
  return getUserPermissions(user).delete
}

export function formatPermissions(permissions: UserPermissions) {
  const parts: string[] = []
  if (permissions.view) parts.push('Ver')
  if (permissions.create) parts.push('Registrar')
  if (permissions.delete) parts.push('Eliminar')
  return parts.length > 0 ? parts.join(', ') : 'Sin permisos'
}
