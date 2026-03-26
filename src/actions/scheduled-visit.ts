"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/access";
import { getAppBaseUrl } from "@/lib/app-url";
import { formatGoogleApiErrorForUser } from "@/lib/google-user-error";
import { syncGoogleDriveAndSheetsRecord } from "@/lib/google-records";
import { sendMailHtml } from "@/lib/email";
import { buildScheduledVisitPdf } from "@/lib/simple-pdf";
import { createScheduledVisitInSheets } from "@/lib/sheets-visits";

export type ScheduledVisitActionState =
  | { ok: true; id: string; token: string; mailWarning?: string }
  | { ok: false; error: string };

const SIMPLE_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseEmailList(raw: string): { valid: string[]; invalid: string[] } {
  const parts = raw.split(/[\n,;]+/);
  const seen = new Set<string>();
  const valid: string[] = [];
  const invalid: string[] = [];
  for (const p of parts) {
    const e = p.trim().toLowerCase().replace(/[<>]/g, "");
    if (!e) continue;
    if (!SIMPLE_EMAIL_RE.test(e)) {
      invalid.push(e);
      continue;
    }
    if (seen.has(e)) continue;
    seen.add(e);
    valid.push(e);
  }
  return { valid, invalid };
}

export async function createScheduledVisit(
  _prev: ScheduledVisitActionState | undefined,
  formData: FormData,
): Promise<ScheduledVisitActionState> {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return {
        ok: false,
        error: "Inicia sesión con Google para registrar visitas y enviar correos desde tu cuenta.",
      };
    }
    if (!(await isAdminEmail(session.user.email.toLowerCase()))) {
      return {
        ok: false,
        error:
          "Solo una cuenta admin puede registrar visitas programadas. El oficial solo valida y procesa ingresos.",
      };
    }

    const visitorFullName = String(formData.get("visitorFullName") ?? "").trim();
    const visitorCompany = String(formData.get("visitorCompany") ?? "").trim();
    const subject = String(formData.get("subject") ?? "").trim();
    const responsible = String(formData.get("responsible") ?? "").trim();
    const visitDateStr = String(formData.get("visitDate") ?? "").trim();
    const visitStartTime = String(formData.get("visitStartTime") ?? "").trim();
    const visitEndTime = String(formData.get("visitEndTime") ?? "").trim();
    const reason = String(formData.get("reason") ?? "").trim();
    const identification = String(formData.get("identification") ?? "").trim();
    const visitTo = String(formData.get("visitTo") ?? "").trim();
    const companions = String(formData.get("companions") ?? "").trim();
    const idReference = identification || null;
    const parsedEmails = parseEmailList(
      String(formData.get("notifyEmails") ?? ""),
    );
    const notifyEmails = parsedEmails.valid;

    if (!subject || !responsible || !visitorFullName || !visitorCompany || !visitTo) {
      return { ok: false, error: "Completa asunto, responsable, visitante, compañía y a quién visita." };
    }
    if (!visitDateStr || !visitStartTime || !visitEndTime) {
      return { ok: false, error: "Indica fecha y horario de la visita." };
    }
    if (!reason) {
      return { ok: false, error: "Indica el motivo de la visita." };
    }
    if (parsedEmails.invalid.length > 0) {
      const preview = parsedEmails.invalid.slice(0, 3).join(", ");
      return {
        ok: false,
        error:
          `Hay correos inválidos: ${preview}. ` +
          "Sepáralos por coma, punto y coma o salto de línea.",
      };
    }
    if (notifyEmails.length === 0) {
      return {
        ok: false,
        error:
          "Agrega al menos un correo válido para notificar (coma, punto y coma o salto de línea).",
      };
    }
    if (notifyEmails.length > 30) {
      return {
        ok: false,
        error: "Máximo 30 correos por registro para evitar bloqueos de envío.",
      };
    }

    const visit = await createScheduledVisitInSheets({
      visitorFullName,
      visitorCompany,
      reason,
      subject,
      responsible,
      identification,
      companions,
      visitTo,
      visitDate: visitDateStr, // guardamos como YYYY-MM-DD
      visitStartTime,
      visitEndTime,
      idReference,
      notifyEmails,
    });

    // Sync opcional con Drive/Sheets (no bloquea el flujo).
    try {
      await syncGoogleDriveAndSheetsRecord({
        type: "programada",
        tokenOrId: visit.tokenOrId,
        recordId: visit.recordId,
        createdAt: visit.createdAt,
        updatedAt: visit.updatedAt,
        visitorFullName: visit.visitorFullName,
        visitorCompany: visit.visitorCompany,
        reason: visit.reason,
        curpOrId: null,
        ineOcrRaw: null,
        status: visit.status,
        resolvedAt: null,
        emailOrNotify: notifyEmails.join(", "),
      });
    } catch {
      // Ignorar fallos de Google.
    }

    const base = getAppBaseUrl();
    const panelUrl = `${base}/visitas/programadas`;
    const appUrl = base;

    const pdf = buildScheduledVisitPdf({
      title: `Cita programada - ${visitorFullName}`,
      recordId: visit.recordId,
      status: visit.status,
      createdAt: visit.createdAt,
      updatedAt: visit.updatedAt,
      visitorFullName: visit.visitorFullName,
      visitorCompany: visit.visitorCompany,
      reason: visit.reason,
      idReference: visit.idReference,
      visitDate: new Date(`${visit.visitDate}T12:00:00`),
      visitStartTime: visit.visitStartTime,
      visitEndTime: visit.visitEndTime,
      notifyEmailsCsv: notifyEmails.join(", "),
    });

    const html = `
      <p><strong>Cita programada registrada.</strong></p>
      <p>Adjunto va el PDF oficial del registro.</p>
      <p><a href="${panelUrl}">Ver visitas programadas (oficiales)</a></p>
      <p><a href="${appUrl}">Abrir AppWeb</a></p>
    `;

    let mailWarning: string | undefined;
    try {
      await sendMailHtml({
        to: notifyEmails,
        subject: `Cita programada: ${visitorFullName}`,
        html,
        attachments: [
          {
            filename: `cita-programada-${visit.tokenOrId}.pdf`,
            contentType: "application/pdf",
            content: pdf,
          },
        ],
      });
    } catch (mailErr) {
      mailWarning = formatGoogleApiErrorForUser(mailErr);
      const detail = mailErr instanceof Error ? mailErr.message : String(mailErr);
      console.error("[createScheduledVisit][mail]", detail);
    }

    revalidatePath("/visitas/programadas");
    return { ok: true, id: visit.recordId, token: visit.tokenOrId, mailWarning };
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    console.error("[createScheduledVisit]", detail);
    return { ok: false, error: formatGoogleApiErrorForUser(e) };
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
