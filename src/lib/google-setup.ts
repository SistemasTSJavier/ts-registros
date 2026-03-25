import { google } from "googleapis";
import type { JWT } from "google-auth-library";

import {
  envTrim,
  GOOGLE_SERVICE_ACCOUNT_MISSING_USER_MESSAGE,
  prepareGoogleServiceAccountPrivateKey,
} from "@/lib/google-env";
import { auth } from "@/auth";
import {
  loadGoogleIntegrationState,
  saveGoogleIntegrationState,
} from "@/lib/google-integration-db";
import {
  getDefaultWorkspaceForPublicApi,
  getResolvedWorkspaceForUserEmail,
} from "@/lib/workspace-resolver";

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
  "visitDate",
  "visitStartTime",
  "visitEndTime",
  "idReference",
  "notifyEmails",
  "approvalEmail",
  "curpOrId",
  "subject",
  "responsible",
  "companions",
  "visitTo",
  "identification",
  "checkInAt",
  "checkOutAt",
  "checkedInByEmail",
] as const;

function envOrEmpty(name: string): string {
  return process.env[name] ?? "";
}

/** Mensaje legible desde respuestas de googleapis (403, invalid_grant, etc.). */
function formatGoogleApiError(err: unknown): string {
  if (err && typeof err === "object" && "response" in err) {
    const r = err as {
      response?: {
        data?: {
          error?: {
            message?: string;
            errors?: Array<{ message?: string }>;
          };
        };
      };
      message?: string;
    };
    const d = r.response?.data?.error;
    const first = d?.errors?.[0]?.message;
    if (first) return first;
    if (d?.message) return d.message;
  }
  if (err instanceof Error) return err.message;
  return String(err);
}

function getServiceAccountAuth() {
  const clientEmail = envTrim("GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL");
  const privateKeyRaw = envTrim("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY");

  if (!clientEmail || !privateKeyRaw) return null;

  const privateKey = prepareGoogleServiceAccountPrivateKey(privateKeyRaw);
  const jwt = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    // drive.file suele fallar con "permission denied" en carpetas/hojas compartidas con la cuenta de servicio.
    scopes: [
      "https://www.googleapis.com/auth/drive",
      "https://www.googleapis.com/auth/spreadsheets",
    ],
  });

  return jwt;
}

function defaultDriveFolderName(): string {
  return envOrEmpty("GOOGLE_DRIVE_FOLDER_NAME") || "Registros";
}

function defaultSpreadsheetTitle(): string {
  return envOrEmpty("GOOGLE_SHEETS_SPREADSHEET_TITLE") || "Registros";
}

function defaultSheetName(): string {
  return envOrEmpty("GOOGLE_SHEETS_SHEET_NAME") || "Hoja 1";
}

async function ensureDriveFolder(auth: JWT, folderName?: string): Promise<string> {
  const drive = google.drive({ version: "v3", auth });

  const name = folderName ?? defaultDriveFolderName();
  const q = `mimeType='application/vnd.google-apps.folder' and name='${name.replace(
    /'/g,
    "\\'",
  )}' and trashed=false`;

  const listRes = await drive.files.list({
    q,
    fields: "files(id,name)",
    spaces: "drive",
  });

  const existing = listRes.data.files?.[0];
  if (existing?.id) return existing.id;

  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
    },
    fields: "id",
  });

  if (!created.data.id) throw new Error("No se pudo crear carpeta en Drive.");
  return created.data.id;
}

/** Mueve un archivo de Drive a una carpeta (quita padres anteriores; evita duplicar padres). */
async function moveDriveFileIntoFolder(
  auth: JWT,
  fileId: string,
  driveFolderId: string,
): Promise<void> {
  const drive = google.drive({ version: "v3", auth });
  const meta = await drive.files.get({
    fileId,
    fields: "parents",
    supportsAllDrives: true,
  });
  const parents = meta.data.parents ?? [];
  if (parents.includes(driveFolderId)) return;
  // Hojas nuevas suelen estar bajo "root"; si parents viene vacío, hay que quitar root explícitamente.
  const removeParents =
    parents.length > 0 ? parents.join(",") : "root";
  await drive.files.update({
    fileId,
    addParents: driveFolderId,
    removeParents,
    fields: "id,parents",
    supportsAllDrives: true,
  });
}

async function ensureSpreadsheet(
  auth: JWT,
  driveFolderId?: string | null,
  titleOverride?: string,
): Promise<{
  spreadsheetId: string;
  sheetName: string;
}> {
  const sheets = google.sheets({ version: "v4", auth });
  const title = titleOverride ?? defaultSpreadsheetTitle();

  // Reusa una spreadsheet existente por título (opcional).
  // Si quieres un control estricto, usa GOOGLE_SHEETS_SPREADSHEET_ID en env.
  // Buscamos también por title en Drive.
  const drive = google.drive({ version: "v3", auth });
  const q = `mimeType='application/vnd.google-apps.spreadsheet' and name='${title.replace(
    /'/g,
    "\\'",
  )}' and trashed=false`;
  const listRes = await drive.files.list({
    q,
    fields: "files(id,name)",
    spaces: "drive",
  });
  const existing = listRes.data.files?.[0];
  let spreadsheetId = existing?.id;

  if (!spreadsheetId) {
    const created = await sheets.spreadsheets.create({
      requestBody: {
        properties: { title },
      },
    });
    if (!created.data.spreadsheetId) {
      throw new Error("No se pudo crear spreadsheet en Sheets.");
    }
    spreadsheetId = created.data.spreadsheetId;

    if (driveFolderId) {
      await moveDriveFileIntoFolder(auth, spreadsheetId, driveFolderId);
    }
  }

  // Determinamos qué sheetName usar.
  const sheetNameWanted = defaultSheetName();
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties.title",
  });

  const titles = meta.data.sheets?.map((s) => s.properties?.title).filter(Boolean);
  const chosen = titles?.includes(sheetNameWanted)
    ? sheetNameWanted
    : (titles?.[0] as string);

  if (!chosen) throw new Error("No se pudo determinar sheet existente.");

  // Asegura encabezados en la fila 1.
  const headerRange = `${chosen}!A1:AA1`;
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: headerRange,
    valueInputOption: "RAW",
    requestBody: { values: [Array.from(COLUMNS)] },
  });

  return { spreadsheetId, sheetName: chosen };
}

/** Usa un spreadsheet ya creado (ID en env). Evita buscar por título y escribe encabezados. */
export async function ensureSpreadsheetByEnvId(
  auth: JWT,
  spreadsheetId: string,
  preferredSheetName: string,
): Promise<{ sheetName: string }> {
  const sheets = google.sheets({ version: "v4", auth });
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties.title",
  });
  const titles = meta.data.sheets
    ?.map((s) => s.properties?.title)
    .filter(Boolean) as string[];
  const chosen = titles?.includes(preferredSheetName)
    ? preferredSheetName
    : (titles?.[0] as string);
  if (!chosen) {
    throw new Error(
      "No se pudo leer la hoja de cálculo (¿GOOGLE_SHEETS_SPREADSHEET_ID correcto y compartida con la cuenta de servicio?).",
    );
  }

  const headerRange = `${chosen}!A1:AA1`;
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: headerRange,
    valueInputOption: "RAW",
    requestBody: { values: [Array.from(COLUMNS)] },
  });

  return { sheetName: chosen };
}

/**
 * Reutiliza IDs guardados en Postgres (un solo Drive + una sola hoja para toda la organización).
 * Los oficiales no tienen carpeta propia: comparten datos; quién entra al panel lo define OFFICER_EMAILS.
 */
async function tryLoadIntegrationFromDatabase(jwt: JWT): Promise<{
  driveFolderId: string;
  sheetsSpreadsheetId: string;
  sheetsSheetName: string;
} | null> {
  const row = await loadGoogleIntegrationState();
  if (
    !row?.driveFolderId ||
    !row.sheetsSpreadsheetId ||
    !row.sheetsSheetName
  ) {
    return null;
  }
  try {
    const { sheetName } = await ensureSpreadsheetByEnvId(
      jwt,
      row.sheetsSpreadsheetId,
      row.sheetsSheetName,
    );
    return {
      driveFolderId: row.driveFolderId,
      sheetsSpreadsheetId: row.sheetsSpreadsheetId,
      sheetsSheetName: sheetName,
    };
  } catch {
    return null;
  }
}

export type GoogleSheetsStorage = {
  driveFolderId: string;
  sheetsSpreadsheetId: string;
  sheetsSheetName: string;
};

/** Crea carpeta + hoja nuevas en el Drive de la cuenta de servicio (nombre único por sufijo). */
export async function createFreshWorkspaceResources(
  uniqueSuffix: string,
): Promise<GoogleSheetsStorage> {
  const serviceAuth = getServiceAccountAuth();
  if (!serviceAuth) {
    throw new Error(GOOGLE_SERVICE_ACCOUNT_MISSING_USER_MESSAGE);
  }
  const folderName = `Registros-${uniqueSuffix}`;
  try {
    await serviceAuth.authorize();
  } catch (e) {
    throw new Error(
      `No se pudo autorizar la cuenta de servicio (clave PEM, reloj del servidor o APIs deshabilitadas): ${formatGoogleApiError(e)}`,
    );
  }
  try {
    const driveFolderId = await ensureDriveFolder(serviceAuth, folderName);
    const sheets = await ensureSpreadsheet(
      serviceAuth,
      driveFolderId,
      `Registros-${uniqueSuffix}`,
    );
    return {
      driveFolderId,
      sheetsSpreadsheetId: sheets.spreadsheetId,
      sheetsSheetName: sheets.sheetName,
    };
  } catch (e) {
    throw new Error(
      `Google Drive/Sheets: ${formatGoogleApiError(e)}. Comprueba en Google Cloud que estén habilitadas la API de Drive y la de Sheets en el mismo proyecto que la cuenta de servicio.`,
    );
  }
}

async function ensureGoogleDriveAndSheetsSetupLegacy(): Promise<GoogleSheetsStorage> {
  const serviceAuth = getServiceAccountAuth();
  if (!serviceAuth) {
    throw new Error(GOOGLE_SERVICE_ACCOUNT_MISSING_USER_MESSAGE);
  }

  const envFolderId = envTrim("GOOGLE_DRIVE_FOLDER_ID") || null;
  const envSpreadsheetId = envTrim("GOOGLE_SHEETS_SPREADSHEET_ID") || null;
  const envSheetName = envOrEmpty("GOOGLE_SHEETS_SHEET_NAME") || defaultSheetName();

  if (envFolderId && envSpreadsheetId) {
    const { sheetName } = await ensureSpreadsheetByEnvId(
      serviceAuth,
      envSpreadsheetId,
      envSheetName,
    );
    return {
      driveFolderId: envFolderId,
      sheetsSpreadsheetId: envSpreadsheetId,
      sheetsSheetName: sheetName,
    };
  }

  const fromDb = await tryLoadIntegrationFromDatabase(serviceAuth);
  if (fromDb) return fromDb;

  const driveFolderId = await ensureDriveFolder(serviceAuth);
  const sheets = await ensureSpreadsheet(serviceAuth, driveFolderId);

  await saveGoogleIntegrationState({
    driveFolderId,
    sheetsSpreadsheetId: sheets.spreadsheetId,
    sheetsSheetName: sheets.sheetName,
  });

  return {
    driveFolderId,
    sheetsSpreadsheetId: sheets.spreadsheetId,
    sheetsSheetName: sheets.sheetName,
  };
}

/**
 * Resuelve carpeta+hoja: espacio activo (cookie) → registro público (un solo Workspace o PUBLIC_WORKSPACE_ID) → legado env/BD.
 */
export async function resolveGoogleSheetsStorage(): Promise<GoogleSheetsStorage> {
  const serviceAuth = getServiceAccountAuth();
  if (!serviceAuth) {
    throw new Error(GOOGLE_SERVICE_ACCOUNT_MISSING_USER_MESSAGE);
  }

  const session = await auth();
  const email = session?.user?.email?.toLowerCase() ?? null;

  if (email) {
    const ws = await getResolvedWorkspaceForUserEmail(email);
    if (ws) {
      const { sheetName } = await ensureSpreadsheetByEnvId(
        serviceAuth,
        ws.sheetsSpreadsheetId,
        ws.sheetsSheetName,
      );
      return {
        driveFolderId: ws.driveFolderId,
        sheetsSpreadsheetId: ws.sheetsSpreadsheetId,
        sheetsSheetName: sheetName,
      };
    }
  }

  const pub = await getDefaultWorkspaceForPublicApi();
  if (pub) {
    const { sheetName } = await ensureSpreadsheetByEnvId(
      serviceAuth,
      pub.sheetsSpreadsheetId,
      pub.sheetsSheetName,
    );
    return {
      driveFolderId: pub.driveFolderId,
      sheetsSpreadsheetId: pub.sheetsSpreadsheetId,
      sheetsSheetName: sheetName,
    };
  }

  return ensureGoogleDriveAndSheetsSetupLegacy();
}

export async function ensureGoogleDriveAndSheetsSetup(): Promise<GoogleSheetsStorage> {
  return resolveGoogleSheetsStorage();
}

