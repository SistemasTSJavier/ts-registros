import type {
  AccessCredential,
  AuditLog,
  Document,
  Invitation,
  Person,
  Registration,
  RegistrationType,
  Tenant,
  User,
  ValidationItem,
} from '@/lib/schemas'

export const registrationTypes: RegistrationType[] = [
  {
    id: 'type-visitante',
    code: 'visitante',
    name: 'Visitante',
    description: 'Personas con visita a planta, verificación de identidad y acceso QR.',
    requiresIncode: true,
    requiresAccess: true,
    fieldSchema: {
      fields: [
        { name: 'fechaCita', label: 'Fecha y hora de la cita', type: 'date', required: true },
        { name: 'area', label: 'Área / planta', type: 'text', required: true },
        { name: 'responsable', label: 'Persona de contacto', type: 'text', required: true },
        { name: 'notas', label: 'Notas adicionales', type: 'textarea' },
      ],
    },
  },
  {
    id: 'type-proveedor',
    code: 'proveedor',
    name: 'Proveedor',
    description: 'Proveedores con acceso temporal y validación documental.',
    requiresIncode: true,
    requiresAccess: true,
    fieldSchema: {
      fields: [
        { name: 'fechaCita', label: 'Fecha y hora de la cita', type: 'date', required: true },
        { name: 'razonSocial', label: 'Razón social', type: 'text', required: true },
        { name: 'giro', label: 'Giro', type: 'text', required: true },
        { name: 'servicios', label: 'Servicios', type: 'textarea', required: true },
      ],
    },
  },
  {
    id: 'type-cliente',
    code: 'cliente',
    name: 'Cliente',
    description: 'Clientes externos con cita programada y acceso QR.',
    requiresIncode: true,
    requiresAccess: true,
    fieldSchema: {
      fields: [
        { name: 'fechaCita', label: 'Fecha y hora de la cita', type: 'date', required: true },
        { name: 'motivo', label: 'Motivo de la visita', type: 'text', required: true },
        { name: 'responsable', label: 'Persona de contacto', type: 'text', required: true },
        { name: 'notas', label: 'Notas', type: 'textarea' },
      ],
    },
  },
]

export const tenants: Tenant[] = []
export const users: User[] = []
export const registrations: Registration[] = []
export const invitations: Invitation[] = []
export const persons: Person[] = []
export const documents: Document[] = []
export const validationItems: ValidationItem[] = []
export const accessCredentials: AccessCredential[] = []
export const auditLogs: AuditLog[] = []
