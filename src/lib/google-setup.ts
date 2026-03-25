import { google } from "googleapis";
import type { JWT } from "google-auth-library";

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

function getServiceAccountAuth() {
  const clientEmail = envOrEmpty("GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL");
  const privateKeyRaw = envOrEmpty(
    "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY",
  );

  if (!clientEmail || !privateKeyRaw) return null;

  const privateKey = privateKeyRaw.replace(/\\n/g, "\n");
  const jwt = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: [
      "https://www.googleapis.com/auth/drive.file",
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

async function ensureDriveFolder(auth: JWT): Promise<string> {
  const drive = google.drive({ version: "v3", auth });

  // Si ya existe un folder con el nombre esperado (en root), lo reusamos.
  // Nota: si tienes varios entornos, usa GOOGLE_DRIVE_FOLDER_ID para evitar colisiones.
  const q = `mimeType='application/vnd.google-apps.folder' and name='${defaultDriveFolderName().replace(
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
      name: defaultDriveFolderName(),
      mimeType: "application/vnd.google-apps.folder",
    },
    fields: "id",
  });

  if (!created.data.id) throw new Error("No se pudo crear carpeta en Drive.");
  return created.data.id;
}

async function ensureSpreadsheet(auth: JWT, driveFolderId?: string | null): Promise<{
  spreadsheetId: string;
  sheetName: string;
}> {
  const sheets = google.sheets({ version: "v4", auth });
  const title = defaultSpreadsheetTitle();

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
      // Asegura que esté dentro de la carpeta.
      const drive = google.drive({ version: "v3", auth });
      await drive.files.update({
        fileId: spreadsheetId,
        addParents: driveFolderId,
        fields: "id,parents",
      });
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

export async function ensureGoogleDriveAndSheetsSetup(): Promise<{
  driveFolderId: string;
  sheetsSpreadsheetId: string;
  sheetsSheetName: string;
}> {
  const serviceAuth = getServiceAccountAuth();
  if (!serviceAuth) {
    throw new Error(
      "Google no configurado: define GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL y GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.",
    );
  }

  const envFolderId = envOrEmpty("GOOGLE_DRIVE_FOLDER_ID") || null;
  const envSpreadsheetId = envOrEmpty("GOOGLE_SHEETS_SPREADSHEET_ID") || null;
  const envSheetName = envOrEmpty("GOOGLE_SHEETS_SHEET_NAME") || defaultSheetName();

  if (envFolderId && envSpreadsheetId) {
    // Asegura encabezados y que la spreadsheet exista/sea accesible.
    await ensureSpreadsheet(serviceAuth, envFolderId);
    return {
      driveFolderId: envFolderId,
      sheetsSpreadsheetId: envSpreadsheetId,
      sheetsSheetName: envSheetName,
    };
  }

  // Crea/asegura recursos.
  const driveFolderId = await ensureDriveFolder(serviceAuth);
  const sheets = await ensureSpreadsheet(serviceAuth, driveFolderId);

  return {
    driveFolderId,
    sheetsSpreadsheetId: sheets.spreadsheetId,
    sheetsSheetName: sheets.sheetName,
  };
}

