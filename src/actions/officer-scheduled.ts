"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { syncGoogleDriveAndSheetsRecord } from "@/lib/google-records";
import { listScheduledInWindow, scanScheduledAccessToken, updateScheduledStatusById } from "@/lib/sheets-visits";
import { scheduledVisitListWindow } from "@/lib/visit-window";

export type OfficerActionState = { ok: true } | { ok: false; error: string };
export type ScheduledScanState = { ok: true; message: string } | { ok: false; error: string };

async function requireOfficerEmail(): Promise<string | null> {
  const session = await auth();
  return session?.user?.email ?? session?.user?.name ?? null;
}

export async function scanScheduledTokenAction(token: string): Promise<ScheduledScanState> {
  const officer = await requireOfficerEmail();
  if (!officer) return { ok: false, error: "Debes iniciar sesión como oficial." };
  const t = token.trim();
  if (!t) return { ok: false, error: "Escanea o captura un token." };
  const r = await scanScheduledAccessToken(t, officer);
  revalidatePath("/visitas/programadas");
  revalidatePath("/visitas/programadas/escaneo");
  return r;
}

export async function checkInScheduledVisitAction(
  visitId: string,
): Promise<OfficerActionState> {
  const officer = await requireOfficerEmail();
  if (!officer) return { ok: false, error: "Debes iniciar sesión como oficial." };

  const r = await updateScheduledStatusById(visitId, "CHECKED_IN", officer);
  if (!r.ok) return r;

  try {
    const { start, end } = scheduledVisitListWindow();
    const rows = await listScheduledInWindow(start, end);
    const row = rows.find((x) => x.tokenOrId === visitId) ?? null;
    if (!row) throw new Error("Visita no encontrada tras actualizar.");
    await syncGoogleDriveAndSheetsRecord({
      type: "programada",
      tokenOrId: row.tokenOrId,
      recordId: row.recordId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      visitorFullName: row.visitorFullName,
      visitorCompany: row.visitorCompany,
      reason: row.reason,
      curpOrId: null,
      ineOcrRaw: null,
      status: row.status,
      resolvedAt: row.resolvedAt,
      emailOrNotify: officer,
    });
  } catch {
    // Ignorar fallos de Google.
  }

  revalidatePath("/visitas/programadas");
  return { ok: true };
}

export async function denyScheduledVisitAction(
  visitId: string,
): Promise<OfficerActionState> {
  const officer = await requireOfficerEmail();
  if (!officer) return { ok: false, error: "Debes iniciar sesión como oficial." };

  const r = await updateScheduledStatusById(visitId, "DENIED", officer);
  if (!r.ok) return r;

  try {
    const { start, end } = scheduledVisitListWindow();
    const rows = await listScheduledInWindow(start, end);
    const row = rows.find((x) => x.tokenOrId === visitId) ?? null;
    if (!row) throw new Error("Visita no encontrada tras actualizar.");
    await syncGoogleDriveAndSheetsRecord({
      type: "programada",
      tokenOrId: row.tokenOrId,
      recordId: row.recordId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      visitorFullName: row.visitorFullName,
      visitorCompany: row.visitorCompany,
      reason: row.reason,
      curpOrId: null,
      ineOcrRaw: null,
      status: row.status,
      resolvedAt: row.resolvedAt,
      emailOrNotify: officer,
    });
  } catch {
    // Ignorar fallos de Google.
  }

  revalidatePath("/visitas/programadas");
  return { ok: true };
}
