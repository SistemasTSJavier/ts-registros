"use server";

import { revalidatePath } from "next/cache";

import { getAppBaseUrl } from "@/lib/app-url";
import { formatGoogleApiErrorForUser } from "@/lib/google-user-error";
import { syncGoogleDriveAndSheetsRecord } from "@/lib/google-records";
import { sendMailHtml } from "@/lib/email";
import { createScheduledVisitInSheets } from "@/lib/sheets-visits";

export type ScheduledVisitActionState =
  | { ok: true; id: string; token: string }
  | { ok: false; error: string };

function parseEmailList(raw: string): string[] {
  const parts = raw.split(/[\s,;]+/);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const e = p.trim().toLowerCase();
    if (!e || !e.includes("@")) continue;
    if (seen.has(e)) continue;
    seen.add(e);
    out.push(e);
  }
  return out;
}

export async function createScheduledVisit(
  _prev: ScheduledVisitActionState | undefined,
  formData: FormData,
): Promise<ScheduledVisitActionState> {
  try {
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
    const notifyEmails = parseEmailList(
      String(formData.get("notifyEmails") ?? ""),
    );

    if (!subject || !responsible || !visitorFullName || !visitorCompany || !visitTo) {
      return { ok: false, error: "Completa asunto, responsable, visitante, compañía y a quién visita." };
    }
    if (!visitDateStr || !visitStartTime || !visitEndTime) {
      return { ok: false, error: "Indica fecha y horario de la visita." };
    }
    if (!reason) {
      return { ok: false, error: "Indica el motivo de la visita." };
    }
    if (notifyEmails.length === 0) {
      return {
        ok: false,
        error: "Agrega al menos un correo para notificar (separados por coma).",
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

    const refBlock = idReference
      ? `<p><strong>Identificación a verificar:</strong> ${escapeHtml(idReference)}</p>`
      : "";

    const html = `
      <p>Se registró una <strong>visita programada</strong>.</p>
      <ul>
        <li><strong>Persona:</strong> ${escapeHtml(visitorFullName)}</li>
        <li><strong>Empresa:</strong> ${escapeHtml(visitorCompany)}</li>
        <li><strong>Fecha:</strong> ${escapeHtml(visitDateStr)}</li>
        <li><strong>Horario:</strong> ${escapeHtml(visitStartTime)} – ${escapeHtml(visitEndTime)}</li>
        <li><strong>Motivo:</strong> ${escapeHtml(reason)}</li>
      </ul>
      ${refBlock}
      <p>En recepción, la persona debe mostrar su identificación y el oficial debe comprobar que coincide con lo registrado antes de permitir el ingreso.</p>
      <p><a href="${panelUrl}">Ver visitas programadas (oficiales)</a></p>
    `;

    await sendMailHtml({
      to: notifyEmails,
      subject: `Visita programada: ${visitorFullName}`,
      html,
    });

    revalidatePath("/visitas/programadas");
    return { ok: true, id: visit.recordId, token: visit.tokenOrId };
  } catch (e) {
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
