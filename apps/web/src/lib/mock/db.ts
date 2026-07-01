import { generateId } from '@/lib/utils'
import {
  accessCredentials,
  auditLogs,
  documents,
  invitations,
  persons,
  registrationTypes,
  registrations,
  tenants,
  users,
  validationItems,
} from './fixtures'

function clone<T>(data: T): T {
  return structuredClone(data)
}

export function generatePassword(length = 10) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export const db = {
  tenants: clone(tenants),
  users: clone(users),
  registrationTypes: clone(registrationTypes),
  registrations: clone(registrations),
  invitations: clone(invitations),
  persons: clone(persons),
  documents: clone(documents),
  validationItems: clone(validationItems),
  accessCredentials: clone(accessCredentials),
  auditLogs: clone(auditLogs),
  userPasswords: {} as Record<string, string>,
}

export function addAuditLog(
  entry: Omit<(typeof auditLogs)[0], 'id' | 'createdAt'> & { createdAt?: string },
) {
  db.auditLogs.unshift({
    id: generateId(),
    createdAt: entry.createdAt ?? new Date().toISOString(),
    ...entry,
  })
}

export function generateManualCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}
