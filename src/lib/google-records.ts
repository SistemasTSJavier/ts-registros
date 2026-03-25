import { google } from "googleapis";

import {
  envTrim,
  GOOGLE_SERVICE_ACCOUNT_MISSING_USER_MESSAGE,
  prepareGoogleServiceAccountPrivateKey,
} from "@/lib/google-env";
import { resolveGoogleSheetsStorage } from "@/lib/google-setup";

type RecordType = "walk-in" | "programada";

export type GoogleSyncPayload = {
  type: RecordType;
  tokenOrId: string; // walk-in: approvalToken, programada: visit.id
  recordId: string;
  createdAt: Date;
  updatedAt: Date;
  visitorFullName: string;
  visitorCompany: string;
  reason: string;
  status: string;
  resolvedAt: Date | null;
  emailOrNotify: string; // walk-in: approvalEmail, programada: notifyEmails CSV
  curpOrId?: string | null;
  ineOcrRaw?: string | null;
};

const COLUMNS = [
  "type",
  "tokenOrId",
  "recordId",
  "createdAt",
  "updatedAt",
  "visitorFullName",
  "visitorCompany",
  "reason",
  "status",
  "resolvedAt",
  "emailOrNotify",
  "driveFileId",
] as const;

function envOrEmpty(name: string): string {
  return process.env[name] ?? "";
}

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
      "https://www.googleapis.com/auth/drive",
      "https://www.googleapis.com/auth/spreadsheets",
    ],
  });
}

function buildDriveFileName(type: RecordType, tokenOrId: string): string {
  return `registro-${type}-${tokenOrId}.json`;
}

function isoOrEmpty(d: Date | null): string {
  return d ? d.toISOString() : "";
}

function buildPayloadForDrive(payload: GoogleSyncPayload): object {
  return {
    ...payload,
    createdAt: payload.createdAt.toISOString(),
    updatedAt: payload.updatedAt.toISOString(),
    resolvedAt: isoOrEmpty(payload.resolvedAt),
  };
}

function escapeDriveQueryValue(v: string): string {
  // Safe enough for our generated file names (tokenOrId is base64url/id-like).
  return v.replace(/'/g, "\\'");
}

async function upsertDriveJsonFile(opts: {
  type: RecordType;
  tokenOrId: string;
  payload: GoogleSyncPayload;
  driveFolderId: string;
}): Promise<{ driveFileId: string }> {
  const auth = getServiceAccountAuthOrThrow();

  const drive = google.drive({ version: "v3", auth });
  const fileName = buildDriveFileName(opts.type, opts.tokenOrId);
  const query = `name='${escapeDriveQueryValue(fileName)}' and '${escapeDriveQueryValue(
    opts.driveFolderId,
  )}' in parents and trashed=false`;

  const listRes = await drive.files.list({
    q: query,
    fields: "files(id,name)",
    spaces: "drive",
  });

  const body = Buffer.from(
    JSON.stringify(buildPayloadForDrive(opts.payload), null, 2),
    "utf8",
  );

  const existing = listRes.data.files?.[0];
  if (existing?.id) {
    const updated = await drive.files.update({
      fileId: existing.id,
      media: {
        mimeType: "application/json",
        body,
      },
      requestBody: {
        mimeType: "application/json",
        name: fileName,
      },
    });
    return { driveFileId: updated.data.id ?? existing.id };
  }

  const created = await drive.files.create({
    requestBody: {
      name: fileName,
      mimeType: "application/json",
      parents: [opts.driveFolderId],
    },
    media: {
      mimeType: "application/json",
      body,
    },
    fields: "id",
  });

  if (!created.data.id) throw new Error("No se pudo crear archivo en Drive.");
  return { driveFileId: created.data.id };
}

async function ensureSheetHeaderIfMissing(opts: {
  sheets: ReturnType<typeof google.sheets>;
  spreadsheetId: string;
  sheetName: string;
}) {
  const range = `${opts.sheetName}!A1:L1`;
  const res = await opts.sheets.spreadsheets.values.get({
    spreadsheetId: opts.spreadsheetId,
    range,
  });

  const values = res.data.values?.[0] ?? [];
  const hasAny = values.some((c) => String(c ?? "").trim().length > 0);
  if (hasAny) return;

  await opts.sheets.spreadsheets.values.update({
    spreadsheetId: opts.spreadsheetId,
    range,
    valueInputOption: "RAW",
    requestBody: {
      values: [Array.from(COLUMNS)],
    },
  });
}

async function upsertSheetsRowByTokenOrId(opts: {
  payload: GoogleSyncPayload;
  spreadsheetId: string;
  sheetName: string;
}): Promise<void> {
  const auth = getServiceAccountAuthOrThrow();

  const sheets = google.sheets({ version: "v4", auth });
  await ensureSheetHeaderIfMissing({
    sheets,
    spreadsheetId: opts.spreadsheetId,
    sheetName: opts.sheetName,
  });

  const tokenOrId = opts.payload.tokenOrId;

  // Buscamos solo desde la fila 2 para no interferir con encabezados.
  const allDataRange = `${opts.sheetName}!A2:L`;
  const current = await sheets.spreadsheets.values.get({
    spreadsheetId: opts.spreadsheetId,
    range: allDataRange,
    majorDimension: "ROWS",
  });

  const rows = current.data.values ?? [];
  const foundIndex = rows.findIndex((r) => String(r?.[1] ?? "") === tokenOrId);

  const rowValues = [
    opts.payload.type,
    opts.payload.tokenOrId,
    opts.payload.recordId,
    opts.payload.createdAt.toISOString(),
    opts.payload.updatedAt.toISOString(),
    opts.payload.visitorFullName,
    opts.payload.visitorCompany,
    opts.payload.reason,
    opts.payload.status,
    isoOrEmpty(opts.payload.resolvedAt),
    opts.payload.emailOrNotify,
    "", // driveFileId se rellena después cuando esté disponible
  ];

  if (foundIndex === -1) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: opts.spreadsheetId,
      range: `${opts.sheetName}!A:L`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [rowValues],
      },
    });
    return;
  }

  const rowNumber = 2 + foundIndex; // A2 is row 2
  await sheets.spreadsheets.values.update({
    spreadsheetId: opts.spreadsheetId,
    range: `${opts.sheetName}!A${rowNumber}:L${rowNumber}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [rowValues],
    },
  });
}

export async function syncGoogleDriveAndSheetsRecord(
  payload: GoogleSyncPayload,
): Promise<void> {
  // No bloquea el flujo principal: si falta configuración, lanzamos y lo dejamos
  // capturado desde los server actions.
  const { driveFolderId, sheetsSpreadsheetId, sheetsSheetName } =
    await resolveGoogleSheetsStorage();

  const driveFolder = driveFolderId;
  const sheetName = sheetsSheetName;

  const driveRes = await upsertDriveJsonFile({
    type: payload.type,
    tokenOrId: payload.tokenOrId,
    payload,
    driveFolderId: driveFolder,
  });

  // Escribimos/actualizamos fila en sheets.
  // Nota: driveFileId se guarda en Drive; en este primer pase lo dejamos vacío si el update de fila no incluye esa columna.
  // Para mantener consistencia sin complicar el rango, actualizamos driveFileId por separado cuando sea necesario.
  await upsertSheetsRowByTokenOrId({
    payload,
    spreadsheetId: sheetsSpreadsheetId,
    sheetName,
  });

  // Actualiza driveFileId en la celda correspondiente (columna L).
  // Segundo pase para no duplicar lógica de upsert.
  try {
    const auth = getServiceAccountAuthOrThrow();
    const sheets = google.sheets({ version: "v4", auth });
    const allDataRange = `${sheetName}!A2:L`;
    const current = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetsSpreadsheetId,
      range: allDataRange,
      majorDimension: "ROWS",
    });
    const rows = current.data.values ?? [];
    const foundIndex = rows.findIndex(
      (r) => String(r?.[1] ?? "") === payload.tokenOrId,
    );
    if (foundIndex === -1) return;
    const rowNumber = 2 + foundIndex;
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetsSpreadsheetId,
      range: `${sheetName}!L${rowNumber}`,
      valueInputOption: "RAW",
      requestBody: {
        values: [[driveRes.driveFileId]],
      },
    });
  } catch {
    // Ignorar: el flujo ya registró la fila y el drive ya existe.
  }
}

