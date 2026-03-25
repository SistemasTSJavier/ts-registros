import { prisma } from "@/lib/prisma";

const ROW_ID = 1;

export type GoogleIntegrationRow = {
  driveFolderId: string | null;
  sheetsSpreadsheetId: string | null;
  sheetsSheetName: string | null;
};

export async function loadGoogleIntegrationState(): Promise<GoogleIntegrationRow | null> {
  try {
    const row = await prisma.googleIntegrationState.findUnique({
      where: { id: ROW_ID },
    });
    if (!row) return null;
    return {
      driveFolderId: row.driveFolderId,
      sheetsSpreadsheetId: row.sheetsSpreadsheetId,
      sheetsSheetName: row.sheetsSheetName,
    };
  } catch {
    return null;
  }
}

export async function saveGoogleIntegrationState(data: {
  driveFolderId: string;
  sheetsSpreadsheetId: string;
  sheetsSheetName: string;
}): Promise<void> {
  try {
    await prisma.googleIntegrationState.upsert({
      where: { id: ROW_ID },
      create: {
        id: ROW_ID,
        driveFolderId: data.driveFolderId,
        sheetsSpreadsheetId: data.sheetsSpreadsheetId,
        sheetsSheetName: data.sheetsSheetName,
      },
      update: {
        driveFolderId: data.driveFolderId,
        sheetsSpreadsheetId: data.sheetsSpreadsheetId,
        sheetsSheetName: data.sheetsSheetName,
      },
    });
  } catch {
    // Sin DB o tabla ausente: la app sigue usando solo creación/búsqueda por nombre en Drive.
  }
}
