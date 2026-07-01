import QRCode from 'qrcode'
import { Resend } from 'resend'
import { env } from '../env.js'

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null

export type EmailResult = { sent: true; id: string | null } | { sent: false; reason: string }

export function absoluteUrl(path: string) {
  if (path.startsWith('http')) return path
  return `${env.APP_URL}${path.startsWith('/') ? path : `/${path}`}`
}

export function mapsUrl(address: string, lat?: number, lng?: number) {
  if (lat !== undefined && lng !== undefined) {
    return `https://www.google.com/maps?q=${lat},${lng}`
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}

async function sendEmail(to: string, subject: string, html: string): Promise<EmailResult> {
  if (!resend) {
    return { sent: false, reason: 'RESEND_API_KEY not configured' }
  }
  try {
    const result = await resend.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to,
      subject,
      html,
    })
    if (result.error) {
      return { sent: false, reason: result.error.message }
    }
    return { sent: true, id: result.data?.id ?? null }
  } catch (error) {
    return { sent: false, reason: error instanceof Error ? error.message : 'Error de envío' }
  }
}

export async function sendTenantAccessEmail(input: {
  to: string
  contactName: string
  tenantName: string
  loginUrl: string
  password: string
  panelExpiresAt: string
}) {
  const loginUrl = absoluteUrl(input.loginUrl)
  const html = `
    <h2>Acceso al panel de cliente</h2>
    <p>Hola ${input.contactName},</p>
    <p>Se ha creado el acceso para <strong>${input.tenantName}</strong>.</p>
    <p><a href="${loginUrl}">Iniciar sesión</a></p>
    <p>Contraseña temporal: <strong>${input.password}</strong></p>
    <p>El panel vence el ${input.panelExpiresAt}.</p>
  `
  return sendEmail(input.to, `Acceso — ${input.tenantName}`, html)
}

export async function sendInvitationEmail(input: {
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
}) {
  const registrationUrl = absoluteUrl(input.registrationUrl)
  const html = `
    <h2>Invitación de registro — ${input.typeName}</h2>
    <p>Hola ${input.personName},</p>
    <p>${input.tenantName} te invita a completar tu registro como <strong>${input.puesto}</strong>.</p>
    <p>Cita: ${input.fechaCita}</p>
    <p>Responsable: ${input.responsable}</p>
    <p>Ubicación: ${input.tenantAddress} — <a href="${input.mapsUrl}">Ver en mapa</a></p>
    <p><a href="${registrationUrl}">Completar registro</a></p>
  `
  return sendEmail(input.to, `Invitación — ${input.tenantName}`, html)
}

export async function sendAppointmentAccessEmail(input: {
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
}) {
  const registrationUrl = absoluteUrl(input.registrationUrl)
  let qrDataUrl = ''
  try {
    qrDataUrl = await QRCode.toDataURL(input.qrPayload)
  } catch {
    qrDataUrl = ''
  }
  const html = `
    <h2>Acceso a planta — ${input.tenantName}</h2>
    <p>Hola ${input.personName},</p>
    <p>Tu acceso ha sido aprobado para la cita del ${input.fechaCita}.</p>
    <p>Código manual: <strong>${input.manualCode}</strong></p>
    <p>Válido desde ${input.validFrom} hasta ${input.validUntil}</p>
    ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR de acceso" width="200" height="200" />` : ''}
    <p>Ubicación: ${input.tenantAddress} — <a href="${input.mapsUrl}">Ver en mapa</a></p>
    <p><a href="${registrationUrl}">Ver en portal</a></p>
    <p>Responsable: ${input.responsable}</p>
  `
  return sendEmail(input.to, `Acceso QR — ${input.tenantName}`, html)
}

export function emailStatus() {
  return {
    enabled: !!resend,
    from: env.RESEND_FROM_EMAIL,
  }
}
