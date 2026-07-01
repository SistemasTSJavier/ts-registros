import {
  boolean,
  jsonb,
  pgTable,
  text,
  timestamp,
  doublePrecision,
} from 'drizzle-orm/pg-core'

export const tenants = pgTable('tenants', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  legalName: text('legal_name').notNull(),
  rfc: text('rfc'),
  address: text('address').notNull(),
  addressLat: doublePrecision('address_lat'),
  addressLng: doublePrecision('address_lng'),
  phone: text('phone').notNull(),
  status: text('status').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull(),
  primaryContactName: text('primary_contact_name').notNull(),
  primaryContactEmail: text('primary_contact_email').notNull(),
  primaryContactPhone: text('primary_contact_phone').notNull(),
  panelExpiresAt: text('panel_expires_at').notNull(),
})

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').references(() => tenants.id),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  role: text('role').notNull(),
  phone: text('phone'),
  permissions: jsonb('permissions'),
  isPrimary: boolean('is_primary').default(false),
  passwordHash: text('password_hash').notNull(),
})

export const registrationTypes = pgTable('registration_types', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  requiresIncode: boolean('requires_incode').notNull(),
  requiresAccess: boolean('requires_access').notNull(),
  fieldSchema: jsonb('field_schema').notNull(),
})

export const registrations = pgTable('registrations', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id')
    .notNull()
    .references(() => tenants.id),
  typeId: text('type_id')
    .notNull()
    .references(() => registrationTypes.id),
  typeCode: text('type_code').notNull(),
  typeName: text('type_name').notNull(),
  status: text('status').notNull(),
  payload: jsonb('payload').notNull(),
  inviteEmail: text('invite_email').notNull(),
  inviteContactName: text('invite_contact_name').notNull(),
  inviteMessage: text('invite_message'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull(),
})

export const persons = pgTable('persons', {
  id: text('id').primaryKey(),
  registrationId: text('registration_id')
    .notNull()
    .references(() => registrations.id),
  tenantId: text('tenant_id')
    .notNull()
    .references(() => tenants.id),
  personalData: jsonb('personal_data').notNull(),
  incodeStatus: text('incode_status').notNull(),
  overallStatus: text('overall_status').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull(),
})

export const invitations = pgTable('invitations', {
  id: text('id').primaryKey(),
  registrationId: text('registration_id')
    .notNull()
    .references(() => registrations.id),
  tenantId: text('tenant_id')
    .notNull()
    .references(() => tenants.id),
  personId: text('person_id').references(() => persons.id),
  email: text('email').notNull(),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'string' }).notNull(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true, mode: 'string' }),
})

export const documents = pgTable('documents', {
  id: text('id').primaryKey(),
  personId: text('person_id')
    .notNull()
    .references(() => persons.id),
  name: text('name').notNull(),
  type: text('type').notNull(),
  fileName: text('file_name').notNull(),
  storagePath: text('storage_path'),
  validationStatus: text('validation_status').notNull(),
  rejectionReason: text('rejection_reason'),
})

export const validationItems = pgTable('validation_items', {
  id: text('id').primaryKey(),
  personId: text('person_id')
    .notNull()
    .references(() => persons.id),
  category: text('category').notNull(),
  label: text('label').notNull(),
  status: text('status').notNull(),
  rejectionReason: text('rejection_reason'),
})

export const accessCredentials = pgTable('access_credentials', {
  id: text('id').primaryKey(),
  personId: text('person_id')
    .notNull()
    .references(() => persons.id),
  qrPayload: text('qr_payload').notNull(),
  manualCode: text('manual_code').notNull(),
  validFrom: timestamp('valid_from', { withTimezone: true, mode: 'string' }).notNull(),
  validUntil: timestamp('valid_until', { withTimezone: true, mode: 'string' }).notNull(),
})

export const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').references(() => tenants.id),
  actorId: text('actor_id').notNull(),
  actorName: text('actor_name').notNull(),
  action: text('action').notNull(),
  entity: text('entity').notNull(),
  entityId: text('entity_id').notNull(),
  detail: text('detail').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull(),
})
