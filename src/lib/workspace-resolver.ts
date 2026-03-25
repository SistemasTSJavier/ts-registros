import { cookies } from "next/headers";

import { envTrim } from "@/lib/google-env";
import { loadGoogleIntegrationState } from "@/lib/google-integration-db";
import { dbQuery } from "@/lib/db";

export const WORKSPACE_COOKIE = "registros_workspace_id";

export async function getResolvedWorkspaceForUserEmail(
  email: string,
): Promise<{
  workspaceId: string;
  driveFolderId: string;
  sheetsSpreadsheetId: string;
  sheetsSheetName: string;
} | null> {
  const cookieStore = await cookies();
  const wsId = cookieStore.get(WORKSPACE_COOKIE)?.value;
  if (!wsId) return null;

  try {
    const row = await dbQuery<{
      workspace_id: string;
      drive_folder_id: string;
      sheets_spreadsheet_id: string;
      sheets_sheet_name: string;
    }>(
      `
        select
          w.id as workspace_id,
          w.drive_folder_id,
          w.sheets_spreadsheet_id,
          w.sheets_sheet_name
        from public.user_workspace uw
        join public.workspace w on w.id = uw.workspace_id
        where uw.user_email = $1 and uw.workspace_id = $2
        limit 1
      `,
      [email.toLowerCase(), wsId],
    );

    if (row.length === 0) return null;
    const ws = row[0];
    return {
      workspaceId: ws.workspace_id,
      driveFolderId: ws.drive_folder_id,
      sheetsSpreadsheetId: ws.sheets_spreadsheet_id,
      sheetsSheetName: ws.sheets_sheet_name,
    };
  } catch {
    return null;
  }
}

/** Registro público: un solo Workspace, o PUBLIC_WORKSPACE_ID si hay varios, o legado GoogleIntegrationState. */
export async function getDefaultWorkspaceForPublicApi(): Promise<{
  driveFolderId: string;
  sheetsSpreadsheetId: string;
  sheetsSheetName: string;
} | null> {
  try {
    const explicit = envTrim("PUBLIC_WORKSPACE_ID");
    if (explicit) {
      const ws = await dbQuery<{
        drive_folder_id: string;
        sheets_spreadsheet_id: string;
        sheets_sheet_name: string;
      }>(
        `
          select drive_folder_id, sheets_spreadsheet_id, sheets_sheet_name
          from public.workspace
          where id = $1
          limit 1
        `,
        [explicit],
      );
      if (ws[0]) {
        return {
          driveFolderId: ws[0].drive_folder_id,
          sheetsSpreadsheetId: ws[0].sheets_spreadsheet_id,
          sheetsSheetName: ws[0].sheets_sheet_name,
        };
      }
      throw new Error(
        "PUBLIC_WORKSPACE_ID no coincide con ningún espacio de trabajo.",
      );
    }

    const countRow = await dbQuery<{ count: number }>(
      `select count(*)::int as count from public.workspace`,
    );
    const count = countRow[0]?.count ?? 0;
    if (count === 1) {
      const ws = await dbQuery<{
        drive_folder_id: string;
        sheets_spreadsheet_id: string;
        sheets_sheet_name: string;
      }>(
        `
          select drive_folder_id, sheets_spreadsheet_id, sheets_sheet_name
          from public.workspace
          order by created_at asc
          limit 1
        `,
      );
      if (ws[0]) {
        return {
          driveFolderId: ws[0].drive_folder_id,
          sheetsSpreadsheetId: ws[0].sheets_spreadsheet_id,
          sheetsSheetName: ws[0].sheets_sheet_name,
        };
      }
    }

    if (count > 1) {
      throw new Error(
        "Hay varios espacios de trabajo. Define PUBLIC_WORKSPACE_ID en el servidor con el id del espacio para formularios públicos.",
      );
    }
  } catch (e) {
    if (
      e instanceof Error &&
      (e.message.includes("PUBLIC_WORKSPACE") ||
        e.message.includes("espacios de trabajo"))
    ) {
      throw e;
    }
  }

  const row = await loadGoogleIntegrationState();
  if (
    row?.driveFolderId &&
    row?.sheetsSpreadsheetId &&
    row?.sheetsSheetName
  ) {
    return {
      driveFolderId: row.driveFolderId,
      sheetsSpreadsheetId: row.sheetsSpreadsheetId,
      sheetsSheetName: row.sheetsSheetName,
    };
  }

  return null;
}

export async function hasLegacyGoogleIntegration(): Promise<boolean> {
  const row = await loadGoogleIntegrationState();
  return Boolean(
    row?.driveFolderId &&
      row?.sheetsSpreadsheetId &&
      row?.sheetsSheetName,
  );
}

export async function userWorkspaceCount(email: string): Promise<number> {
  try {
    const r = await dbQuery<{ count: number }>(
      `
        select count(*)::int as count
        from public.user_workspace
        where user_email = $1
      `,
      [email.toLowerCase()],
    );
    return r[0]?.count ?? 0;
  } catch {
    return 0;
  }
}
