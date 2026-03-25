import { randomBytes } from "crypto";
import { google } from "googleapis";
import type { JWT } from "google-auth-library";

import {
  envTrim,
  GOOGLE_SERVICE_ACCOUNT_MISSING_USER_MESSAGE,
  prepareGoogleServiceAccountPrivateKey,
} from "@/lib/google-env";
import { extractGoogleDriveFileId } from "@/lib/google-drive-parse";
import { auth } from "@/auth";
import {
  loadGoogleIntegrationState,
  saveGoogleIntegrationState,
} from "@/lib/google-integration-db";
import {
  getResolvedWorkspaceForUserEmail,
  hasLegacyGoogleIntegration,
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
            code?: number | string;
            status?: string;
            domain?: string;
            errors?: Array<{ message?: string; reason?: string; domain?: string }>;
          };
        };
      };
      message?: string;
    };
    const d = r.response?.data?.error;
    const first = d?.errors?.[0]?.message;
    const reason = d?.errors?.[0]?.reason;
    const domain = d?.errors?.[0]?.domain ?? d?.domain;

    const base = first ?? d?.message ?? r.message;
    if (!base) return "Error de Google API";

    const bits: string[] = [base];
    if (reason) bits.push(`reason: ${reason}`);
    if (domain) bits.push(`domain: ${domain}`);
    if (d?.code) bits.push(`code: ${String(d.code)}`);
    if (d?.status) bits.push(`status: ${d.status}`);

    return bits.join(" | ");
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
      "https://www.googleapis.com/auth/drive.file",
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

async function ensureDriveFolder(
  auth: JWT,
  folderName?: string,
  parentFolderId?: string | null,
): Promise<string> {
  const drive = google.drive({ version: "v3", auth });

  const name = folderName ?? defaultDriveFolderName();

  // Carpeta padre = carpeta compartida / Shared Drive: crear con `parents: [padre]`
  // a veces devuelve 403 aunque la SA tenga acceso. Estrategia estable:
  // 1) crear la carpeta en el Drive de la SA (`root`)
  // 2) moverla a `parentFolderId` con `files.update`
  if (parentFolderId) {
    const created = await drive.files.create({
      requestBody: {
        name,
        mimeType: "application/vnd.google-apps.folder",
        parents: ["root"],
      },
      fields: "id",
      supportsAllDrives: true,
    });
    const newId = created.data.id;
    if (!newId) throw new Error("No se pudo crear carpeta en Drive (paso 1: root).");
    try {
      await moveDriveFileIntoFolder(auth, newId, parentFolderId);
    } catch (e) {
      throw new Error(
        `No se pudo mover la carpeta nueva a GOOGLE_DRIVE_FOLDER_ID (paso 2). ` +
          `La cuenta de servicio necesita poder añadir archivos en esa carpeta (Editor) o ser miembro del Shared Drive. ` +
          formatGoogleApiError(e),
      );
    }
    return newId;
  }

  const q = `mimeType='application/vnd.google-apps.folder' and name='${name.replace(
    /'/g,
    "\\'",
  )}' and trashed=false`;

  const listRes = await drive.files.list({
    q,
    fields: "files(id,name)",
    spaces: "drive",
    // Soportar escenarios con unidades compartidas / items compartidos.
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  const existing = listRes.data.files?.[0];
  if (existing?.id) return existing.id;

  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      // Para replicar tu flujo: crear explícitamente en "root".
      parents: ["root"],
    },
    fields: "id",
    supportsAllDrives: true,
  });

  if (!created.data.id) throw new Error("No se pudo crear carpeta en Drive.");
  return created.data.id;
}

async function assertDriveFolderAccessible(
  auth: JWT,
  driveFolderId: string,
): Promise<void> {
  const serviceEmail = envTrim("GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL");
  const drive = google.drive({ version: "v3", auth });
  try {
    const meta = await drive.files.get({
      fileId: driveFolderId,
      fields: "id,mimeType",
      supportsAllDrives: true,
    });
    const mimeType = meta.data.mimeType;
    if (mimeType !== "application/vnd.google-apps.folder") {
      throw new Error(
        `GOOGLE_DRIVE_FOLDER_ID no apunta a una carpeta. mimeType recibido: ${String(
          mimeType,
        )}.`,
      );
    }
  } catch (e) {
    const formatted = formatGoogleApiError(e);
    throw new Error(
      `GOOGLE_DRIVE_FOLDER_ID no es accesible desde la cuenta de servicio. ` +
        `Servicio: ${serviceEmail || "(sin email)"} | carpeta: ${driveFolderId}. ` +
        `Detalle: ${formatted}. ` +
        `En Drive: comparte esa carpeta con la cuenta de servicio como Editor. ` +
        `Si es un Shared Drive, agrega la cuenta al Shared Drive (membership) además de permisos.`,
    );
  }
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
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
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
      try {
        await moveDriveFileIntoFolder(auth, spreadsheetId, driveFolderId);
      } catch (e) {
        throw new Error(
          `No se pudo mover la hoja de cálculo a la carpeta del espacio. ${formatGoogleApiError(e)}`,
        );
      }
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
  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: headerRange,
      valueInputOption: "RAW",
      requestBody: { values: [Array.from(COLUMNS)] },
    });
  } catch (e) {
    throw new Error(
      `No se pudo escribir encabezados en la hoja (Sheets). ${formatGoogleApiError(e)}`,
    );
  }

  return { spreadsheetId, sheetName: chosen };
}

function isLikelyGooglePermissionError(err: unknown): boolean {
  const s = formatGoogleApiError(err).toLowerCase();
  return (
    s.includes("permission") ||
    s.includes("403") ||
    s.includes("the caller does not have permission") ||
    s.includes("forbidden")
  );
}

/** Usa un spreadsheet ya creado (ID en env). Evita buscar por título y escribe encabezados. */
export async function ensureSpreadsheetByEnvId(
  auth: JWT,
  spreadsheetId: string,
  preferredSheetName: string,
): Promise<{ sheetName: string }> {
  const sheets = google.sheets({ version: "v4", auth });
  const sa = envTrim("GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL");

  let meta;
  try {
    meta = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: "sheets.properties.title",
    });
  } catch (e) {
    if (isLikelyGooglePermissionError(e)) {
      throw new Error(
        `No se puede leer la hoja de cálculo (ID ${spreadsheetId}). ` +
          `Comparte ese archivo de Google Sheets con la cuenta de servicio` +
          (sa ? ` (${sa})` : "") +
          ` como Editor. Si está en un Drive compartido, añade también esa cuenta como miembro del Drive. ` +
          `Origen: ${formatGoogleApiError(e)}`,
      );
    }
    throw new Error(`No se pudo abrir la hoja de cálculo: ${formatGoogleApiError(e)}`);
  }

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
  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: headerRange,
      valueInputOption: "RAW",
      requestBody: { values: [Array.from(COLUMNS)] },
    });
  } catch (e) {
    if (isLikelyGooglePermissionError(e)) {
      throw new Error(
        `No se puede escribir encabezados en la hoja (ID ${spreadsheetId}, pestaña «${chosen}»). ` +
          `Comparte el archivo con la cuenta de servicio` +
          (sa ? ` (${sa})` : "") +
          ` como Editor (o como Editor de contenido en Drive compartido). ` +
          `Origen: ${formatGoogleApiError(e)}`,
      );
    }
    throw new Error(
      `No se pudo escribir encabezados en la hoja (Sheets). ${formatGoogleApiError(e)}`,
    );
  }

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

/**
 * Valida con la cuenta de servicio una hoja existente o una carpeta (crea hoja nueva dentro).
 * La carpeta o la hoja deben estar compartidas con la cuenta de servicio como Editor.
 */
export async function resolveWorkspaceStorageFromGoogleRef(
  rawInput: string,
): Promise<GoogleSheetsStorage> {
  const id = extractGoogleDriveFileId(rawInput);
  if (!id) {
    throw new Error(
      "Pega un enlace de Google Drive (hoja o carpeta) o el ID del archivo.",
    );
  }

  const serviceAuth = getServiceAccountAuth();
  if (!serviceAuth) {
    throw new Error(GOOGLE_SERVICE_ACCOUNT_MISSING_USER_MESSAGE);
  }

  await serviceAuth.authorize();
  const drive = google.drive({ version: "v3", auth: serviceAuth });

  let meta;
  try {
    meta = await drive.files.get({
      fileId: id,
      fields: "id,mimeType,parents",
      supportsAllDrives: true,
    });
  } catch (e) {
    throw new Error(
      `No se pudo leer el recurso en Drive (${id}). ${formatGoogleApiError(e)}`,
    );
  }

  const mime = meta.data.mimeType;
  const parents = meta.data.parents ?? [];
  const fallbackParent = envTrim("GOOGLE_DRIVE_FOLDER_ID") || "";

  if (mime === "application/vnd.google-apps.spreadsheet") {
    const parentFolder = parents[0] ?? fallbackParent;
    if (!parentFolder) {
      throw new Error(
        "No se pudo determinar la carpeta contenedora de la hoja. Comparte la hoja con la cuenta de servicio o usa una carpeta dentro de tu Drive.",
      );
    }
    const preferred = defaultSheetName();
    const { sheetName } = await ensureSpreadsheetByEnvId(
      serviceAuth,
      id,
      preferred,
    );
    return {
      driveFolderId: parentFolder,
      sheetsSpreadsheetId: id,
      sheetsSheetName: sheetName,
    };
  }

  if (mime === "application/vnd.google-apps.folder") {
    const suffix = randomBytes(4).toString("hex");
    const sheets = await ensureSpreadsheet(
      serviceAuth,
      id,
      `Registros-${suffix}`,
    );
    return {
      driveFolderId: id,
      sheetsSpreadsheetId: sheets.spreadsheetId,
      sheetsSheetName: sheets.sheetName,
    };
  }

  throw new Error(
    "El enlace debe ser una hoja de cálculo de Google o una carpeta de Drive.",
  );
}

/** Crea carpeta + hoja nuevas en el Drive de la cuenta de servicio (nombre único por sufijo). */
export async function createFreshWorkspaceResources(
  uniqueSuffix: string,
): Promise<GoogleSheetsStorage> {
  const serviceAuth = getServiceAccountAuth();
  if (!serviceAuth) {
    throw new Error(GOOGLE_SERVICE_ACCOUNT_MISSING_USER_MESSAGE);
  }
  const parentFolderId = envTrim("GOOGLE_DRIVE_FOLDER_ID") || null;
  if (!parentFolderId) {
    const sa = envTrim("GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL");
    throw new Error(
      "Define GOOGLE_DRIVE_FOLDER_ID: una carpeta exclusiva para este servicio, compartida con la cuenta de servicio" +
        (sa ? ` (${sa})` : "") +
        " como Editor.",
    );
  }

  // Valida que la carpeta padre exista y sea visible para la cuenta de servicio.
  await assertDriveFolderAccessible(serviceAuth, parentFolderId);

  const folderName = `Registros-${uniqueSuffix}`;
  try {
    await serviceAuth.authorize();
  } catch (e) {
    throw new Error(
      `No se pudo autorizar la cuenta de servicio (clave PEM, reloj del servidor o APIs deshabilitadas): ${formatGoogleApiError(e)}`,
    );
  }
  try {
    const driveFolderId = await ensureDriveFolder(
      serviceAuth,
      folderName,
      parentFolderId,
    );
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
    const formatted = formatGoogleApiError(e);
    const hint =
      !parentFolderId && formatted.toLowerCase().includes("permission")
        ? " Pista: define `GOOGLE_DRIVE_FOLDER_ID` en tu .env/Vercel apuntando a una carpeta que compartas con la cuenta de servicio (como Editor)."
        : "";
    throw new Error(
      `Google Drive/Sheets: ${formatted}.${hint} Comprueba en Google Cloud que estén habilitadas la API de Drive y la de Sheets en el mismo proyecto que la cuenta de servicio.`,
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

  if (!envFolderId) {
    throw new Error(
      "GOOGLE_DRIVE_FOLDER_ID está vacío. Para evitar crear en Drive 'root' (403), crea una carpeta EXCLUSIVA para este servicio y pon su ID en GOOGLE_DRIVE_FOLDER_ID.",
    );
  }

  const driveFolderId = await ensureDriveFolder(
    serviceAuth,
    undefined,
    envFolderId,
  );
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
 * Resuelve carpeta+hoja: espacio activo (cookie + membresía) o integración legada (misma instalación).
 * Requiere sesión y un espacio seleccionado, salvo legado sin workspaces.
 */
export async function resolveGoogleSheetsStorage(): Promise<GoogleSheetsStorage> {
  const serviceAuth = getServiceAccountAuth();
  if (!serviceAuth) {
    throw new Error(GOOGLE_SERVICE_ACCOUNT_MISSING_USER_MESSAGE);
  }

  const session = await auth();
  const email = session?.user?.email?.toLowerCase() ?? null;
  if (!email) {
    throw new Error(
      "Inicia sesión con Google para usar los registros. Cada usuario trabaja sobre su espacio de trabajo configurado.",
    );
  }

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

  if (await hasLegacyGoogleIntegration()) {
    return ensureGoogleDriveAndSheetsSetupLegacy();
  }

  throw new Error(
    "Configura tu espacio en /espacio: crea una hoja nueva, enlaza una hoja o carpeta de Drive, o únete con un código.",
  );
}

export async function ensureGoogleDriveAndSheetsSetup(): Promise<GoogleSheetsStorage> {
  return resolveGoogleSheetsStorage();
}

