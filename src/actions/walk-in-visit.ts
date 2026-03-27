"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/access";
import { getAppBaseUrl } from "@/lib/app-url";
import { formatGoogleApiErrorForUser } from "@/lib/google-user-error";
import { syncGoogleDriveAndSheetsRecord } from "@/lib/google-records";
import { sendMailHtml } from "@/lib/email";
import { buildWalkInVisitPdf } from "@/lib/simple-pdf";
import { createWalkInVisitInSheets, getWalkInByToken, updateWalkInStatusByToken } from "@/lib/sheets-visits";
import { getResolvedWorkspaceForUserEmail } from "@/lib/workspace-resolver";

export type WalkInActionState =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function createWalkInVisit(
  _prev: WalkInActionState | undefined,
  formData: FormData,
): Promise<WalkInActionState> {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return {
        ok: false,
        error: "Inicia sesión con Google para registrar visitas y enviar correos desde tu cuenta.",
      };
    }

    const visitorFullName = String(formData.get("visitorFullName") ?? "").trim();
    const visitorCompany = String(formData.get("visitorCompany") ?? "").trim();
    const reason = String(formData.get("reason") ?? "").trim();
    const curpOrId = String(formData.get("curpOrId") ?? "").trim() || null;
    const ineOcrRaw = String(formData.get("ineOcrRaw") ?? "").trim() || null;
    const approvalEmail = String(formData.get("approvalEmail") ?? "")
      .trim()
      .toLowerCase();

    if (!visitorFullName || !visitorCompany) {
      return { ok: false, error: "Indica nombre y empresa." };
    }
    if (!reason) {
      return { ok: false, error: "Indica el motivo de la visita." };
    }
    if (!approvalEmail || !approvalEmail.includes("@")) {
      return { ok: false, error: "Indica un correo válido para aprobación." };
    }
    const visit = await createWalkInVisitInSheets({
      visitorFullName,
      visitorCompany,
      reason,
      approvalEmail,
      curpOrId,
    });

    // Sync opcional con Drive/Sheets (no bloquea el flujo).
    try {
      await syncGoogleDriveAndSheetsRecord({
        type: "walk-in",
        tokenOrId: visit.tokenOrId,
        recordId: visit.recordId,
        createdAt: visit.createdAt,
        updatedAt: visit.updatedAt,
        visitorFullName,
        visitorCompany,
        reason,
        curpOrId,
        ineOcrRaw,
        status: visit.status,
        resolvedAt: visit.resolvedAt,
        emailOrNotify: approvalEmail,
      });
    } catch {
      // Intencionalmente ignorado: el registro ya quedó en DB y se envió correo.
    }

    const base = getAppBaseUrl();
    const decisionUrl = `${base}/aprobar-entrada/${encodeURIComponent(visit.tokenOrId)}`;
    const appUrl = base;

    const pdf = buildWalkInVisitPdf({
      title: `Entrada sin cita - ${visitorFullName}`,
      token: visit.tokenOrId,
      recordId: visit.recordId,
      status: visit.status,
      resolvedAt: visit.resolvedAt,
      visitorFullName,
      visitorCompany,
      reason,
      curpOrId,
      approvalEmail,
    });

    const html = `
      <p><strong>Entrada sin cita registrada.</strong></p>
      <p>Adjunto va el PDF del registro.</p>
      <p><a href="${decisionUrl}">Abrir página de aprobación o denegación</a></p>
      <p><a href="${appUrl}">Abrir AppWeb</a></p>
    `;

    await sendMailHtml({
      to: approvalEmail,
      subject: `Entrada sin cita: ${visitorFullName}`,
      html,
      attachments: [
        {
          filename: `entrada-sin-cita-${visit.tokenOrId}.pdf`,
          contentType: "application/pdf",
          content: pdf,
        },
      ],
    });

    revalidatePath("/visitas/sin-programacion");
    return { ok: true, id: visit.recordId };
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    console.error("[createWalkInVisit]", detail);
    return { ok: false, error: formatGoogleApiErrorForUser(e) };
  }
}

export type WalkInDecisionState = { ok: true } | { ok: false; error: string };

export async function approveWalkInToken(
  token: string,
): Promise<WalkInDecisionState> {
  const row = await getWalkInByToken(token);
  if (!row) return { ok: false, error: "Enlace no válido o expirado." };
  if (row.status !== "AWAITING_APPROVAL") {
    return { ok: false, error: "Esta solicitud ya fue resuelta." };
  }
  const r = await updateWalkInStatusByToken(token, "APPROVED");
  if (!r.ok) return r;

  try {
    const refreshed = await getWalkInByToken(token);
    if (!refreshed) throw new Error("Registro no encontrado tras actualizar.");
    await syncGoogleDriveAndSheetsRecord({
      type: "walk-in",
      tokenOrId: refreshed.tokenOrId,
      recordId: refreshed.recordId,
      createdAt: refreshed.createdAt,
      updatedAt: refreshed.updatedAt,
      visitorFullName: refreshed.visitorFullName,
      visitorCompany: refreshed.visitorCompany,
      reason: refreshed.reason,
      curpOrId: refreshed.curpOrId,
      status: refreshed.status,
      resolvedAt: refreshed.resolvedAt,
      emailOrNotify: refreshed.approvalEmail,
    });
  } catch {
    // Ignorar fallos de Google para no romper la experiencia.
  }
  revalidatePath(`/aprobar-entrada/${encodeURIComponent(token)}`);
  revalidatePath("/visitas/sin-programacion");
  return { ok: true };
}

export async function denyWalkInToken(token: string): Promise<WalkInDecisionState> {
  const row = await getWalkInByToken(token);
  if (!row) return { ok: false, error: "Enlace no válido o expirado." };
  if (row.status !== "AWAITING_APPROVAL") {
    return { ok: false, error: "Esta solicitud ya fue resuelta." };
  }
  const r = await updateWalkInStatusByToken(token, "DENIED");
  if (!r.ok) return r;

  try {
    const refreshed = await getWalkInByToken(token);
    if (!refreshed) throw new Error("Registro no encontrado tras actualizar.");
    await syncGoogleDriveAndSheetsRecord({
      type: "walk-in",
      tokenOrId: refreshed.tokenOrId,
      recordId: refreshed.recordId,
      createdAt: refreshed.createdAt,
      updatedAt: refreshed.updatedAt,
      visitorFullName: refreshed.visitorFullName,
      visitorCompany: refreshed.visitorCompany,
      reason: refreshed.reason,
      curpOrId: refreshed.curpOrId,
      status: refreshed.status,
      resolvedAt: refreshed.resolvedAt,
      emailOrNotify: refreshed.approvalEmail,
    });
  } catch {
    // Ignorar fallos de Google para no romper la experiencia.
  }
  revalidatePath(`/aprobar-entrada/${encodeURIComponent(token)}`);
  revalidatePath("/visitas/sin-programacion");
  return { ok: true };
}

export async function approveWalkInFromPanelAction(
  formData: FormData,
): Promise<void> {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase() ?? null;
  const ws = email ? await getResolvedWorkspaceForUserEmail(email) : null;
  if (!(await isAdminEmail(email, ws?.workspaceId))) {
    throw new Error("Solo una cuenta admin puede aprobar entradas desde el panel.");
  }

  const token = String(formData.get("token") ?? "").trim();
  if (!token) throw new Error("Falta token de entrada.");

  const r = await approveWalkInToken(token);
  if (!r.ok) throw new Error(r.error);
}

export async function denyWalkInFromPanelAction(
  formData: FormData,
): Promise<void> {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase() ?? null;
  const ws = email ? await getResolvedWorkspaceForUserEmail(email) : null;
  if (!(await isAdminEmail(email, ws?.workspaceId))) {
    throw new Error("Solo una cuenta admin puede denegar entradas desde el panel.");
  }

  const token = String(formData.get("token") ?? "").trim();
  if (!token) throw new Error("Falta token de entrada.");

  const r = await denyWalkInToken(token);
  if (!r.ok) throw new Error(r.error);
}

