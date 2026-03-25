import { dbQuery, dbQuerySingle } from "@/lib/db";

const ROW_ID = 1;

export type GoogleIntegrationRow = {
  driveFolderId: string | null;
  sheetsSpreadsheetId: string | null;
  sheetsSheetName: string | null;
};

export async function loadGoogleIntegrationState(): Promise<GoogleIntegrationRow | null> {
  try {
    const row = await dbQuerySingle<{
      drive_folder_id: string | null;
      sheets_spreadsheet_id: string | null;
      sheets_sheet_name: string | null;
    }>(
      `
        select drive_folder_id, sheets_spreadsheet_id, sheets_sheet_name
        from public.google_integration_state
        where id = $1
        limit 1
      `,
      [ROW_ID],
    );
    if (!row) return null;
    return {
      driveFolderId: row.drive_folder_id,
      sheetsSpreadsheetId: row.sheets_spreadsheet_id,
      sheetsSheetName: row.sheets_sheet_name,
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
    await dbQuery(
      `
        insert into public.google_integration_state
          (id, drive_folder_id, sheets_spreadsheet_id, sheets_sheet_name, updated_at)
        values ($1, $2, $3, $4, now())
        on conflict (id)
        do update set
          drive_folder_id = excluded.drive_folder_id,
          sheets_spreadsheet_id = excluded.sheets_spreadsheet_id,
          sheets_sheet_name = excluded.sheets_sheet_name,
          updated_at = now()
      `,
      [ROW_ID, data.driveFolderId, data.sheetsSpreadsheetId, data.sheetsSheetName],
    );
  } catch {
    // Sin DB o tabla ausente: la app sigue usando solo creación/búsqueda por nombre en Drive.
  }
}
