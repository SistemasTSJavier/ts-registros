/** Catálogo fijo de tipos de registro (no son datos de negocio). */
export const CATALOG_REGISTRATION_TYPES = [
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
] as const
