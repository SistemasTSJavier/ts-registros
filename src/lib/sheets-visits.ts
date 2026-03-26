import { google } from "googleapis";
import { randomBytes } from "crypto";

import {
  envTrim,
  GOOGLE_SERVICE_ACCOUNT_MISSING_USER_MESSAGE,
  prepareGoogleServiceAccountPrivateKey,
} from "@/lib/google-env";
import {
  ensureSpreadsheetByEnvId,
  resolveGoogleSheetsStorage,
} from "@/lib/google-setup";
import { getSheetTokenLookup, saveSheetTokenLookup } from "@/lib/sheet-token-lookup";

export type WalkInStatus = "AWAITING_APPROVAL" | "APPROVED" | "DENIED";
export type ScheduledStatus = "SCHEDULED" | "CHECKED_IN" | "CHECKED_OUT" | "DENIED";
export type VisitType = "walk-in" | "programada";

export type WalkInVisitRow = {
  type: "walk-in";
  tokenOrId: string; // approvalToken
  recordId: string;
  createdAt: Date;
  updatedAt: Date;
  visitorFullName: string;
  visitorCompany: string;
  reason: string;
  status: WalkInStatus;
  resolvedAt: Date | null;
  approvalEmail: string;
  curpOrId: string | null;
  driveFileId: string | null;
};

export type ScheduledVisitRow = {
  type: "programada";
  tokenOrId: string; // visitId
  recordId: string;
  createdAt: Date;
  updatedAt: Date;
  visitorFullName: string;
  visitorCompany: string;
  reason: string;
  status: ScheduledStatus;
  resolvedAt: Date | null;
  visitDate: string; // YYYY-MM-DD
  visitStartTime: string;
  visitEndTime: string;
  idReference: string | null;
  notifyEmails: string[];
  driveFileId: string | null;
  checkedInByEmail: string | null;
  checkInAt: Date | null;
  checkOutAt: Date | null;
  subject: string;
  responsible: string;
  companions: string;
  visitTo: string;
  identification: string;
};

type AnyVisit = WalkInVisitRow | ScheduledVisitRow;

function getServiceAccountAuthOrThrow() {
  const clientEmail = envTrim("GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL");
  const privateKeyRaw = envTrim("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY");
  if (!clientEmail || !privateKeyRaw) {
    throw new Error(GOOGLE_SERVICE_ACCOUNT_MISSING_USER_MESSAGE);
  }
  const privateKey = prepareGoogleServiceAccountPrivateKey(privateKeyRaw);
  return new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: [
      "https://www.googleapis.com/auth/drive.file",
      "https://www.googleapis.com/auth/drive",
      "https://www.googleapis.com/auth/spreadsheets",
    ],
  });
}

function toIsoOrEmpty(d: Date | null): string {
  return d ? d.toISOString() : "";
}

function parseIsoDate(s: string): Date {
  // ISO string esperado
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) throw new Error("Fecha inválida en Sheets.");
  return d;
}

function newId(): string {
  return randomBytes(12).toString("base64url");
}

function normalizeEmails(raw: string): string[] {
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

const SHEET_PROGRAMADAS = "Programadas";
const SHEET_SIN_CITA = "Sin cita";
const SPANISH_COLUMNS = [
  "tipo",
  "tokenOId",
  "idRegistro",
  "creadoEn",
  "actualizadoEn",
  "nombreVisitante",
  "empresaVisitante",
  "motivo",
  "estado",
  "resueltoEn",
  "correoNotificacion",
  "idArchivoDrive",
  "fechaVisita",
  "horaInicio",
  "horaFin",
  "referenciaIdentificacion",
  "correosNotificar",
  "correoAprobacion",
  "curpOId",
  "asunto",
  "responsable",
  "acompanantes",
  "aQuienVisita",
  "identificacion",
  "horaCheckIn",
  "horaCheckOut",
  "correoOficial",
] as const;

async function ensureVisitSheet(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  title: string,
): Promise<void> {
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties.title",
  });
  const titles =
    meta.data.sheets?.map((s) => s.properties?.title).filter(Boolean) ?? [];

  if (!titles.includes(title)) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title } } }],
      },
    });
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${title}!A1:AA1`,
    valueInputOption: "RAW",
    requestBody: { values: [Array.from(SPANISH_COLUMNS)] },
  });
}

async function ensureVisitsSheets(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
): Promise<void> {
  await ensureVisitSheet(sheets, spreadsheetId, SHEET_PROGRAMADAS);
  await ensureVisitSheet(sheets, spreadsheetId, SHEET_SIN_CITA);
}

async function getSheetsClient() {
  const auth = getServiceAccountAuthOrThrow();
  const sheets = google.sheets({ version: "v4", auth });
  const setup = await resolveGoogleSheetsStorage();
  await ensureVisitsSheets(sheets, setup.sheetsSpreadsheetId);
  return { sheets, ...setup };
}

async function getSheetsClientForToken(tokenOrId: string) {
  const auth = getServiceAccountAuthOrThrow();
  const sheets = google.sheets({ version: "v4", auth });
  const mapped = await getSheetTokenLookup(tokenOrId);
  if (mapped) {
    await ensureVisitsSheets(sheets, mapped.sheets_spreadsheet_id);
    const { sheetName } = await ensureSpreadsheetByEnvId(
      auth,
      mapped.sheets_spreadsheet_id,
      mapped.sheets_sheet_name,
    );
    return {
      sheets,
      sheetsSpreadsheetId: mapped.sheets_spreadsheet_id,
      sheetsSheetName: sheetName,
    };
  }
  const setup = await resolveGoogleSheetsStorage();
  await ensureVisitsSheets(sheets, setup.sheetsSpreadsheetId);
  return { sheets, ...setup };
}

async function readAllRows(sheetName: string, spreadsheetId: string) {
  const { sheets } = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A2:AA`,
    majorDimension: "ROWS",
  });
  return res.data.values ?? [];
}

function rowToVisit(values: unknown[]): AnyVisit | null {
  const type = String(values[0] ?? "") as VisitType;
  if (type !== "walk-in" && type !== "programada") return null;

  const tokenOrId = String(values[1] ?? "");
  const recordId = String(values[2] ?? "");
  const createdAt = parseIsoDate(String(values[3] ?? ""));
  const updatedAt = parseIsoDate(String(values[4] ?? ""));
  const visitorFullName = String(values[5] ?? "");
  const visitorCompany = String(values[6] ?? "");
  const reason = String(values[7] ?? "");
  const status = String(values[8] ?? "");
  const resolvedAtRaw = String(values[9] ?? "");
  const emailOrNotify = String(values[10] ?? "");
  const driveFileId = String(values[11] ?? "") || null;
  const visitDate = String(values[12] ?? "");
  const visitStartTime = String(values[13] ?? "");
  const visitEndTime = String(values[14] ?? "");
  const idReference = String(values[15] ?? "") || null;
  const notifyEmailsRaw = String(values[16] ?? "");
  const approvalEmail = String(values[17] ?? "");
  const curpOrId = String(values[18] ?? "") || null;
  const subject = String(values[19] ?? "");
  const responsible = String(values[20] ?? "");
  const companions = String(values[21] ?? "");
  const visitTo = String(values[22] ?? "");
  const identification = String(values[23] ?? "");
  const checkInAtRaw = String(values[24] ?? "");
  const checkOutAtRaw = String(values[25] ?? "");
  const checkedInByEmail = String(values[26] ?? "") || null;
  const checkInAt = checkInAtRaw ? parseIsoDate(checkInAtRaw) : null;
  const checkOutAt = checkOutAtRaw ? parseIsoDate(checkOutAtRaw) : null;
  const resolvedAt = resolvedAtRaw ? parseIsoDate(resolvedAtRaw) : null;

  if (type === "walk-in") {
    return {
      type,
      tokenOrId,
      recordId,
      createdAt,
      updatedAt,
      visitorFullName,
      visitorCompany,
      reason,
      status: status as WalkInStatus,
      resolvedAt,
      approvalEmail: approvalEmail || emailOrNotify,
      curpOrId,
      driveFileId,
    };
  }

  return {
    type,
    tokenOrId,
    recordId,
    createdAt,
    updatedAt,
    visitorFullName,
    visitorCompany,
    reason,
    status: status as ScheduledStatus,
    resolvedAt,
    visitDate,
    visitStartTime,
    visitEndTime,
    idReference,
    notifyEmails: normalizeEmails(notifyEmailsRaw || emailOrNotify),
    driveFileId,
    checkedInByEmail,
    checkInAt,
    checkOutAt,
    subject,
    responsible,
    companions,
    visitTo,
    identification,
  };
}

async function findRowIndexByTokenOrIdInSheet(
  tokenOrId: string,
  targetSheetName: string,
) {
  const { sheets, sheetsSpreadsheetId } = await getSheetsClientForToken(tokenOrId);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetsSpreadsheetId,
    range: `${targetSheetName}!B2:B`,
    majorDimension: "COLUMNS",
  });
  const col = res.data.values?.[0] ?? [];
  const idx = col.findIndex((v: unknown) => String(v ?? "") === tokenOrId);
  return { sheets, sheetsSpreadsheetId, sheetsSheetName: targetSheetName, idx };
}

function buildRowValues(v: AnyVisit): string[] {
  if (v.type === "walk-in") {
    return [
      v.type,
      v.tokenOrId,
      v.recordId,
      v.createdAt.toISOString(),
      v.updatedAt.toISOString(),
      v.visitorFullName,
      v.visitorCompany,
      v.reason,
      v.status,
      toIsoOrEmpty(v.resolvedAt),
      v.approvalEmail,
      v.driveFileId ?? "",
      "", // visitDate
      "", // visitStartTime
      "", // visitEndTime
      "", // idReference
      "", // notifyEmails
      v.approvalEmail,
      v.curpOrId ?? "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
    ];
  }

  return [
    v.type,
    v.tokenOrId,
    v.recordId,
    v.createdAt.toISOString(),
    v.updatedAt.toISOString(),
    v.visitorFullName,
    v.visitorCompany,
    v.reason,
    v.status,
    toIsoOrEmpty(v.resolvedAt),
    v.notifyEmails.join(", "),
    v.driveFileId ?? "",
    v.visitDate,
    v.visitStartTime,
    v.visitEndTime,
    v.idReference ?? "",
    v.notifyEmails.join(", "),
    "", // approvalEmail
    "", // curpOrId
    v.subject,
    v.responsible,
    v.companions,
    v.visitTo,
    v.identification,
    toIsoOrEmpty(v.checkInAt),
    toIsoOrEmpty(v.checkOutAt),
    v.checkedInByEmail ?? "",
  ];
}

export async function createWalkInVisitInSheets(input: {
  visitorFullName: string;
  visitorCompany: string;
  reason: string;
  approvalEmail: string;
  curpOrId: string | null;
}): Promise<WalkInVisitRow> {
  const { sheets, sheetsSpreadsheetId } = await getSheetsClient();
  const now = new Date();
  const token = randomBytes(32).toString("base64url");
  const row: WalkInVisitRow = {
    type: "walk-in",
    tokenOrId: token,
    recordId: newId(),
    createdAt: now,
    updatedAt: now,
    visitorFullName: input.visitorFullName,
    visitorCompany: input.visitorCompany,
    reason: input.reason,
    status: "AWAITING_APPROVAL",
    resolvedAt: null,
    approvalEmail: input.approvalEmail,
    curpOrId: input.curpOrId,
    driveFileId: null,
  };

  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetsSpreadsheetId,
    range: `${SHEET_SIN_CITA}!A:AA`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [buildRowValues(row)] },
  });

  await saveSheetTokenLookup(row.tokenOrId, sheetsSpreadsheetId, SHEET_SIN_CITA);

  return row;
}

export async function createScheduledVisitInSheets(input: {
  subject: string;
  responsible: string;
  visitorFullName: string;
  visitorCompany: string;
  reason: string;
  identification: string;
  companions: string;
  visitTo: string;
  visitDate: string; // YYYY-MM-DD
  visitStartTime: string;
  visitEndTime: string;
  idReference: string | null;
  notifyEmails: string[];
}): Promise<ScheduledVisitRow> {
  const { sheets, sheetsSpreadsheetId } = await getSheetsClient();
  const now = new Date();
  const id = newId();
  const row: ScheduledVisitRow = {
    type: "programada",
    tokenOrId: id,
    recordId: id,
    createdAt: now,
    updatedAt: now,
    visitorFullName: input.visitorFullName,
    visitorCompany: input.visitorCompany,
    reason: input.reason,
    status: "SCHEDULED",
    resolvedAt: null,
    visitDate: input.visitDate,
    visitStartTime: input.visitStartTime,
    visitEndTime: input.visitEndTime,
    idReference: input.idReference,
    notifyEmails: input.notifyEmails,
    driveFileId: null,
    checkedInByEmail: null,
    checkInAt: null,
    checkOutAt: null,
    subject: input.subject,
    responsible: input.responsible,
    companions: input.companions,
    visitTo: input.visitTo,
    identification: input.identification,
  };

  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetsSpreadsheetId,
    range: `${SHEET_PROGRAMADAS}!A:AA`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [buildRowValues(row)] },
  });

  await saveSheetTokenLookup(row.tokenOrId, sheetsSpreadsheetId, SHEET_PROGRAMADAS);

  return row;
}

export async function updateWalkInStatusByToken(token: string, status: WalkInStatus) {
  const { sheets, sheetsSpreadsheetId, sheetsSheetName, idx } =
    await findRowIndexByTokenOrIdInSheet(token, SHEET_SIN_CITA);
  if (idx === -1) return { ok: false as const, error: "Enlace no válido o expirado." };

  const rowNumber = 2 + idx;
  const resolvedAt = new Date();

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: sheetsSpreadsheetId,
    requestBody: {
      valueInputOption: "RAW",
      data: [
        { range: `${sheetsSheetName}!E${rowNumber}`, values: [[resolvedAt.toISOString()]] },
        { range: `${sheetsSheetName}!I${rowNumber}`, values: [[status]] },
        { range: `${sheetsSheetName}!J${rowNumber}`, values: [[resolvedAt.toISOString()]] },
      ],
    },
  });

  return { ok: true as const };
}

export async function updateScheduledStatusById(
  visitId: string,
  status: ScheduledStatus,
  officerEmail: string,
) {
  const { sheets, sheetsSpreadsheetId, sheetsSheetName, idx } =
    await findRowIndexByTokenOrIdInSheet(visitId, SHEET_PROGRAMADAS);
  if (idx === -1) return { ok: false as const, error: "Visita no encontrada." };

  const rowNumber = 2 + idx;
  const resolvedAt = new Date();

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: sheetsSpreadsheetId,
    requestBody: {
      valueInputOption: "RAW",
      data: [
        { range: `${sheetsSheetName}!E${rowNumber}`, values: [[resolvedAt.toISOString()]] },
        { range: `${sheetsSheetName}!I${rowNumber}`, values: [[status]] },
        { range: `${sheetsSheetName}!J${rowNumber}`, values: [[resolvedAt.toISOString()]] },
        { range: `${sheetsSheetName}!K${rowNumber}`, values: [[officerEmail]] },
      ],
    },
  });

  return { ok: true as const };
}

export async function scanScheduledAccessToken(
  token: string,
  officerEmail: string,
): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  const { sheets, sheetsSpreadsheetId, sheetsSheetName, idx } =
    await findRowIndexByTokenOrIdInSheet(token, SHEET_PROGRAMADAS);
  if (idx === -1) return { ok: false, error: "Token no encontrado." };

  const rowNumber = 2 + idx;
  const rowRes = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetsSpreadsheetId,
    range: `${sheetsSheetName}!A${rowNumber}:AA${rowNumber}`,
  });
  const rowValues = rowRes.data.values?.[0] ?? [];
  const visit = rowToVisit(rowValues);
  if (!visit || visit.type !== "programada") {
    return { ok: false, error: "Token no corresponde a visita programada." };
  }

  const now = new Date();
  if (visit.status === "SCHEDULED") {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: sheetsSpreadsheetId,
      requestBody: {
        valueInputOption: "RAW",
        data: [
          { range: `${sheetsSheetName}!E${rowNumber}`, values: [[now.toISOString()]] },
          { range: `${sheetsSheetName}!I${rowNumber}`, values: [["CHECKED_IN"]] },
          { range: `${sheetsSheetName}!K${rowNumber}`, values: [[officerEmail]] },
          { range: `${sheetsSheetName}!Y${rowNumber}`, values: [[now.toISOString()]] },
          { range: `${sheetsSheetName}!AA${rowNumber}`, values: [[officerEmail]] },
        ],
      },
    });
    return { ok: true, message: "Entrada registrada correctamente." };
  }

  if (visit.status === "CHECKED_IN") {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: sheetsSpreadsheetId,
      requestBody: {
        valueInputOption: "RAW",
        data: [
          { range: `${sheetsSheetName}!E${rowNumber}`, values: [[now.toISOString()]] },
          { range: `${sheetsSheetName}!I${rowNumber}`, values: [["CHECKED_OUT"]] },
          { range: `${sheetsSheetName}!J${rowNumber}`, values: [[now.toISOString()]] },
          { range: `${sheetsSheetName}!Z${rowNumber}`, values: [[now.toISOString()]] },
        ],
      },
    });
    return { ok: true, message: "Salida registrada. Token consumido." };
  }

  return { ok: false, error: "Token ya consumido o visita denegada." };
}

export async function getWalkInByToken(token: string): Promise<WalkInVisitRow | null> {
  const { sheets, sheetsSpreadsheetId, sheetsSheetName, idx } =
    await findRowIndexByTokenOrIdInSheet(token, SHEET_SIN_CITA);
  if (idx === -1) return null;
  const rowNumber = 2 + idx;
  const rowRes = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetsSpreadsheetId,
    range: `${sheetsSheetName}!A${rowNumber}:AA${rowNumber}`,
  });
  const rowValues = rowRes.data.values?.[0] ?? [];
  const v = rowToVisit(rowValues);
  if (v?.type === "walk-in" && v.tokenOrId === token) return v;
  return null;
}

export async function listRecentWalkIn(limit = 50): Promise<WalkInVisitRow[]> {
  const { sheetsSpreadsheetId } = await getSheetsClient();
  const rows = await readAllRows(SHEET_SIN_CITA, sheetsSpreadsheetId);
  const out: WalkInVisitRow[] = [];
  for (const r of rows) {
    const v = rowToVisit(r);
    if (v?.type === "walk-in") out.push(v);
  }
  out.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return out.slice(0, limit);
}

export async function listScheduledInWindow(start: Date, end: Date): Promise<ScheduledVisitRow[]> {
  const { sheetsSpreadsheetId } = await getSheetsClient();
  const rows = await readAllRows(SHEET_PROGRAMADAS, sheetsSpreadsheetId);
  const out: ScheduledVisitRow[] = [];
  for (const r of rows) {
    const v = rowToVisit(r);
    if (v?.type !== "programada") continue;
    // visitDate string => Date (local)
    const d = new Date(`${v.visitDate}T12:00:00`);
    if (d >= start && d <= end) out.push(v);
  }
  out.sort((a, b) => (a.visitDate + a.visitStartTime).localeCompare(b.visitDate + b.visitStartTime));
  return out;
}

