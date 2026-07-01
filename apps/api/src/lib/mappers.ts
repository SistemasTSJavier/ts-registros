import type { InferSelectModel } from 'drizzle-orm'
import type {
  accessCredentials,
  auditLogs,
  documents,
  invitations,
  persons,
  registrations,
  registrationTypes,
  tenants,
  users,
  validationItems,
} from '../db/schema.js'

type DbTenant = InferSelectModel<typeof tenants>
type DbUser = InferSelectModel<typeof users>
type DbRegistrationType = InferSelectModel<typeof registrationTypes>
type DbRegistration = InferSelectModel<typeof registrations>
type DbPerson = InferSelectModel<typeof persons>
type DbInvitation = InferSelectModel<typeof invitations>
type DbDocument = InferSelectModel<typeof documents>
type DbValidationItem = InferSelectModel<typeof validationItems>
type DbAccessCredential = InferSelectModel<typeof accessCredentials>
type DbAuditLog = InferSelectModel<typeof auditLogs>

export function mapTenant(row: DbTenant) {
  return {
    id: row.id,
    name: row.name,
    legalName: row.legalName,
    rfc: row.rfc ?? undefined,
    address: row.address,
    addressLat: row.addressLat ?? undefined,
    addressLng: row.addressLng ?? undefined,
    phone: row.phone,
    status: row.status as 'active' | 'inactive',
    createdAt: row.createdAt,
    primaryContactName: row.primaryContactName,
    primaryContactEmail: row.primaryContactEmail,
    primaryContactPhone: row.primaryContactPhone,
    panelExpiresAt: row.panelExpiresAt,
  }
}

export function mapUser(row: DbUser) {
  return {
    id: row.id,
    tenantId: row.tenantId,
    email: row.email,
    name: row.name,
    role: row.role as 'admin' | 'cliente' | 'portal',
    phone: row.phone ?? undefined,
    permissions: row.permissions as { view: boolean; create: boolean; delete: boolean } | undefined,
    isPrimary: row.isPrimary ?? undefined,
  }
}

export function mapRegistrationType(row: DbRegistrationType) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    requiresIncode: row.requiresIncode,
    requiresAccess: row.requiresAccess,
    fieldSchema: row.fieldSchema as { fields: unknown[] },
  }
}

export function mapRegistration(row: DbRegistration) {
  return {
    id: row.id,
    tenantId: row.tenantId,
    typeId: row.typeId,
    typeCode: row.typeCode,
    typeName: row.typeName,
    status: row.status,
    payload: row.payload as Record<string, string>,
    inviteEmail: row.inviteEmail,
    inviteContactName: row.inviteContactName,
    inviteMessage: row.inviteMessage ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export function mapPerson(row: DbPerson) {
  return {
    id: row.id,
    registrationId: row.registrationId,
    tenantId: row.tenantId,
    personalData: row.personalData as Record<string, string>,
    incodeStatus: row.incodeStatus,
    overallStatus: row.overallStatus,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export function mapInvitation(row: DbInvitation) {
  return {
    id: row.id,
    registrationId: row.registrationId,
    tenantId: row.tenantId,
    personId: row.personId,
    email: row.email,
    token: row.token,
    expiresAt: row.expiresAt,
    acceptedAt: row.acceptedAt,
  }
}

export function mapDocument(row: DbDocument) {
  return {
    id: row.id,
    personId: row.personId,
    name: row.name,
    type: row.type,
    fileName: row.fileName,
    validationStatus: row.validationStatus,
    rejectionReason: row.rejectionReason ?? undefined,
  }
}

export function mapValidationItem(row: DbValidationItem) {
  return {
    id: row.id,
    personId: row.personId,
    category: row.category as 'field' | 'document' | 'incode',
    label: row.label,
    status: row.status as 'pending' | 'approved' | 'rejected',
    rejectionReason: row.rejectionReason ?? undefined,
  }
}

export function mapAccessCredential(row: DbAccessCredential) {
  return {
    id: row.id,
    personId: row.personId,
    qrPayload: row.qrPayload,
    manualCode: row.manualCode,
    validFrom: row.validFrom,
    validUntil: row.validUntil,
  }
}

export function mapAuditLog(row: DbAuditLog) {
  return {
    id: row.id,
    tenantId: row.tenantId,
    actorId: row.actorId,
    actorName: row.actorName,
    action: row.action,
    entity: row.entity,
    entityId: row.entityId,
    detail: row.detail,
    createdAt: row.createdAt,
  }
}

export type ApiUser = ReturnType<typeof mapUser>
