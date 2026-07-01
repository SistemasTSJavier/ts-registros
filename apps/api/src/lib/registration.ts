export const ACCESS_VALIDITY_HOURS = 12

export const PERSON_FIELD_LABELS: Record<string, string> = {
  nombreCompleto: 'Nombre completo',
  telefono: 'Teléfono',
  curp: 'CURP',
  email: 'Correo electrónico',
  puesto: 'Puesto',
}

export const REQUIRED_PORTAL_DOCUMENTS = [
  { key: 'ine', label: 'INE (identificación oficial)', type: 'ine' },
  { key: 'curp_doc', label: 'CURP (documento)', type: 'curp_doc' },
  { key: 'acta_nacimiento', label: 'Acta de nacimiento', type: 'acta_nacimiento' },
  { key: 'foto', label: 'Fotografía', type: 'foto' },
] as const

export function getMeetingDate(payload: Record<string, string>): string {
  return payload.fechaCita ?? payload.fechaEstimada ?? new Date().toISOString()
}

export function getAccessWindow(meetingDateRaw: string) {
  let validFrom = new Date(meetingDateRaw)
  if (Number.isNaN(validFrom.getTime())) {
    validFrom = new Date()
  } else if (!meetingDateRaw.includes('T')) {
    validFrom.setHours(8, 0, 0, 0)
  }
  const validUntil = new Date(validFrom.getTime() + ACCESS_VALIDITY_HOURS * 60 * 60 * 1000)
  return { validFrom: validFrom.toISOString(), validUntil: validUntil.toISOString() }
}

export function createPersonValidationItems(
  personId: string,
  personalData: Record<string, string>,
  idGen: () => string,
) {
  const fieldItems = Object.keys(personalData).map((key) => ({
    id: idGen(),
    personId,
    category: 'field' as const,
    label: PERSON_FIELD_LABELS[key] ?? key,
    status: 'pending' as const,
  }))
  const docItems = REQUIRED_PORTAL_DOCUMENTS.map((doc) => ({
    id: idGen(),
    personId,
    category: 'document' as const,
    label: doc.label,
    status: 'pending' as const,
  }))
  const incodeItem = {
    id: idGen(),
    personId,
    category: 'incode' as const,
    label: 'Verificación INE',
    status: 'pending' as const,
  }
  return [...fieldItems, ...docItems, incodeItem]
}
