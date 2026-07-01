import { z } from 'zod'

export const userPermissionsSchema = z.object({
  view: z.boolean(),
  create: z.boolean(),
  delete: z.boolean(),
})

export type UserPermissions = z.infer<typeof userPermissionsSchema>

export const PERMISSION_LABELS: Record<keyof UserPermissions, string> = {
  view: 'Ver',
  create: 'Registrar',
  delete: 'Eliminar',
}

export const PERMISSION_PRESETS: Record<string, { label: string; permissions: UserPermissions }> = {
  readonly: { label: 'Solo lectura', permissions: { view: true, create: false, delete: false } },
  operator: { label: 'Operador', permissions: { view: true, create: true, delete: false } },
  admin: { label: 'Administrador', permissions: { view: true, create: true, delete: true } },
}

export const tenantUserInputSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional(),
  permissions: userPermissionsSchema,
  isPrimary: z.boolean().optional(),
})

export type TenantUserInput = z.infer<typeof tenantUserInputSchema>
