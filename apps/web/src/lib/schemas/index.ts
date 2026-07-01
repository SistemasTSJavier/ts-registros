import { z } from 'zod'
import { userPermissionsSchema } from './permissions'

export type { UserPermissions, TenantUserInput } from './permissions'
export { userPermissionsSchema, tenantUserInputSchema, PERMISSION_LABELS, PERMISSION_PRESETS } from './permissions'

export const statusSchema = z.enum([
  'draft',
  'invited',
  'in_progress',
  'pending_validation',
  'approved',
  'rejected',
  'access_issued',
  'expired',
  'revoked',
])

export type Status = z.infer<typeof statusSchema>

export const roleSchema = z.enum(['admin', 'cliente', 'portal'])
export type Role = z.infer<typeof roleSchema>

export const incodeStatusSchema = z.enum(['idle', 'processing', 'verified', 'failed', 'pending'])
export type IncodeStatus = z.infer<typeof incodeStatusSchema>

export const validationItemStatusSchema = z.enum(['pending', 'approved', 'rejected'])
export type ValidationItemStatus = z.infer<typeof validationItemStatusSchema>

export const fieldTypeSchema = z.enum([
  'text',
  'email',
  'tel',
  'date',
  'select',
  'textarea',
  'file',
])

export const fieldDefinitionSchema = z.object({
  name: z.string(),
  label: z.string(),
  type: fieldTypeSchema,
  required: z.boolean().optional(),
  options: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
  validation: z
    .object({
      minLength: z.number().optional(),
      pattern: z.string().optional(),
    })
    .optional(),
})

export const fieldSchemaSchema = z.object({
  fields: z.array(fieldDefinitionSchema),
})

export type FieldSchema = z.infer<typeof fieldSchemaSchema>
export type FieldDefinition = z.infer<typeof fieldDefinitionSchema>

export const tenantSchema = z.object({
  id: z.string(),
  name: z.string(),
  legalName: z.string(),
  rfc: z.string().optional(),
  address: z.string(),
  addressLat: z.number().optional(),
  addressLng: z.number().optional(),
  phone: z.string(),
  status: z.enum(['active', 'inactive']),
  createdAt: z.string(),
  primaryContactName: z.string(),
  primaryContactEmail: z.string(),
  primaryContactPhone: z.string(),
  panelExpiresAt: z.string(),
})

export type Tenant = z.infer<typeof tenantSchema>

export const userSchema = z.object({
  id: z.string(),
  tenantId: z.string().nullable(),
  email: z.string(),
  name: z.string(),
  role: roleSchema,
  phone: z.string().optional(),
  permissions: userPermissionsSchema.optional(),
  isPrimary: z.boolean().optional(),
})

export type User = z.infer<typeof userSchema>

export const registrationTypeSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  description: z.string(),
  fieldSchema: fieldSchemaSchema,
  requiresIncode: z.boolean(),
  requiresAccess: z.boolean(),
})

export type RegistrationType = z.infer<typeof registrationTypeSchema>

export const registrationSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  typeId: z.string(),
  typeCode: z.string(),
  typeName: z.string(),
  status: statusSchema,
  payload: z.record(z.string(), z.string()),
  inviteEmail: z.string(),
  inviteContactName: z.string(),
  inviteMessage: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type Registration = z.infer<typeof registrationSchema>

export const invitationSchema = z.object({
  id: z.string(),
  registrationId: z.string(),
  tenantId: z.string(),
  personId: z.string().nullable().optional(),
  email: z.string(),
  token: z.string(),
  expiresAt: z.string(),
  acceptedAt: z.string().nullable(),
})

export type Invitation = z.infer<typeof invitationSchema>

export const documentSchema = z.object({
  id: z.string(),
  personId: z.string(),
  name: z.string(),
  type: z.string(),
  fileName: z.string(),
  validationStatus: validationItemStatusSchema,
  rejectionReason: z.string().optional(),
})

export type Document = z.infer<typeof documentSchema>

export const validationItemSchema = z.object({
  id: z.string(),
  personId: z.string(),
  category: z.enum(['field', 'document', 'incode']),
  label: z.string(),
  status: validationItemStatusSchema,
  rejectionReason: z.string().optional(),
})

export type ValidationItem = z.infer<typeof validationItemSchema>

export const personSchema = z.object({
  id: z.string(),
  registrationId: z.string(),
  tenantId: z.string(),
  personalData: z.record(z.string(), z.string()),
  incodeStatus: incodeStatusSchema,
  overallStatus: statusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type Person = z.infer<typeof personSchema>

export const accessCredentialSchema = z.object({
  id: z.string(),
  personId: z.string(),
  qrPayload: z.string(),
  manualCode: z.string(),
  validFrom: z.string(),
  validUntil: z.string(),
})

export type AccessCredential = z.infer<typeof accessCredentialSchema>

export const auditLogSchema = z.object({
  id: z.string(),
  tenantId: z.string().nullable(),
  actorId: z.string(),
  actorName: z.string(),
  action: z.string(),
  entity: z.string(),
  entityId: z.string(),
  detail: z.string(),
  createdAt: z.string(),
})

export type AuditLog = z.infer<typeof auditLogSchema>

export const createTenantInputSchema = z.object({
  name: z.string().min(1, 'Nombre de empresa requerido'),
  phone: z.string().min(1, 'Teléfono requerido'),
  primaryContactName: z.string().min(1, 'Nombre del encargado requerido'),
  primaryContactEmail: z.string().email('Correo inválido'),
  address: z.string().min(1, 'Ubicación requerida'),
  addressLat: z.number().optional(),
  addressLng: z.number().optional(),
  panelExpiresAt: z.string().min(1, 'Fecha de vencimiento requerida'),
  status: z.enum(['active', 'inactive']).default('active'),
})
export type CreateTenantInput = z.infer<typeof createTenantInputSchema>

export const createRegistrationInputSchema = z.object({
  typeId: z.string(),
  payload: z.record(z.string(), z.string()),
  persons: z
    .array(
      z.object({
        nombreCompleto: z.string().min(1, 'Nombre requerido'),
        telefono: z.string().min(1, 'Teléfono requerido'),
        curp: z.string().min(18, 'CURP inválida').max(18, 'CURP inválida'),
        email: z.string().email('Correo inválido'),
        puesto: z.string().min(1, 'Puesto requerido'),
      }),
    )
    .min(1, 'Agrega al menos una persona'),
})

export type RegistrationPersonInput = z.infer<typeof createRegistrationInputSchema>['persons'][number]

export type CreateRegistrationInput = z.infer<typeof createRegistrationInputSchema>

export const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  role: roleSchema.optional(),
})

export type LoginInput = z.infer<typeof loginInputSchema>
