import { dbQuery } from "@/lib/db";

export type SheetTokenRow = {
  sheets_spreadsheet_id: string;
  sheets_sheet_name: string;
};

/** Permite resolver la hoja de un registro sin sesión (enlaces de aprobación, PDF). */
export async function getSheetTokenLookup(
  tokenOrId: string,
): Promise<SheetTokenRow | null> {
  try {
    const rows = await dbQuery<SheetTokenRow>(
      `
        select sheets_spreadsheet_id, sheets_sheet_name
        from public.sheet_token_lookup
        where token_or_id = $1
        limit 1
      `,
      [tokenOrId],
    );
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export async function saveSheetTokenLookup(
  tokenOrId: string,
  sheetsSpreadsheetId: string,
  sheetsSheetName: string,
): Promise<void> {
  try {
    await dbQuery(
      `
        insert into public.sheet_token_lookup (token_or_id, sheets_spreadsheet_id, sheets_sheet_name)
        values ($1, $2, $3)
        on conflict (token_or_id) do update set
          sheets_spreadsheet_id = excluded.sheets_spreadsheet_id,
          sheets_sheet_name = excluded.sheets_sheet_name
      `,
      [tokenOrId, sheetsSpreadsheetId, sheetsSheetName],
    );
  } catch {
    // Tabla ausente o error de BD: el flujo principal ya guardó la fila en Sheets.
  }
}
