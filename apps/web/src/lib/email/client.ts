const EMAIL_ENABLED = import.meta.env.VITE_EMAIL_ENABLED === 'true'
const APP_URL = import.meta.env.VITE_APP_URL ?? (typeof window !== 'undefined' ? window.location.origin : '')
const EMAIL_SECRET = import.meta.env.VITE_EMAIL_API_SECRET ?? ''

export type EmailResult = { sent: true; id: string | null } | { sent: false; reason: string }

export function absoluteUrl(path: string) {
  if (path.startsWith('http')) return path
  return `${APP_URL}${path.startsWith('/') ? path : `/${path}`}`
}

export function mapsUrl(address: string, lat?: number, lng?: number) {
  if (lat !== undefined && lng !== undefined) {
    return `https://www.google.com/maps?q=${lat},${lng}`
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}

async function postEmail(path: string, body: unknown): Promise<EmailResult> {
  if (!EMAIL_ENABLED) {
    return { sent: false, reason: 'VITE_EMAIL_ENABLED is not true' }
  }

  try {
    const response = await fetch(`/api/email/${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(EMAIL_SECRET ? { 'X-Email-Secret': EMAIL_SECRET } : {}),
      },
      body: JSON.stringify(body),
    })
    const data = (await response.json()) as { id?: string; reason?: string; message?: string }
    if (!response.ok) {
      return { sent: false, reason: data.reason ?? data.message ?? `HTTP ${response.status}` }
    }
    return { sent: true, id: data.id ?? null }
  } catch (error) {
    return { sent: false, reason: error instanceof Error ? error.message : 'Error de red' }
  }
}

export function sendTenantAccessEmail(input: {
  to: string
  contactName: string
  tenantName: string
  loginUrl: string
  password: string
  panelExpiresAt: string
  locale?: 'es' | 'en'
}) {
  return postEmail('tenant-access', {
    ...input,
    loginUrl: absoluteUrl(input.loginUrl),
  })
}

export function sendInvitationEmail(input: {
  to: string
  personName: string
  puesto: string
  tenantName: string
  tenantAddress: string
  mapsUrl: string
  registrationUrl: string
  fechaCita: string
  typeName: string
  responsable: string
  locale?: 'es' | 'en'
}) {
  return postEmail('invitation', {
    ...input,
    registrationUrl: absoluteUrl(input.registrationUrl),
  })
}

export function sendAppointmentAccessEmail(input: {
  to: string
  personName: string
  tenantName: string
  tenantAddress: string
  mapsUrl: string
  registrationUrl: string
  fechaCita: string
  responsable: string
  manualCode: string
  qrPayload: string
  validFrom: string
  validUntil: string
  locale?: 'es' | 'en'
}) {
  return postEmail('appointment-access', {
    ...input,
    registrationUrl: absoluteUrl(input.registrationUrl),
  })
}

export async function checkEmailService() {
  if (!EMAIL_ENABLED) return { enabled: false }
  try {
    const response = await fetch('/api/email/status')
    if (!response.ok) return { enabled: false }
    return (await response.json()) as { enabled: boolean; from?: string }
  } catch {
    return { enabled: false }
  }
}
