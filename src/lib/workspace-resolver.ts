import { cookies } from "next/headers";

import { loadGoogleIntegrationState } from "@/lib/google-integration-db";
import { dbQuery } from "@/lib/db";

export const WORKSPACE_COOKIE = "registros_workspace_id";

type WorkspaceRow = {
  workspace_id: string;
  drive_folder_id: string;
  sheets_spreadsheet_id: string;
  sheets_sheet_name: string;
};

function mapWorkspaceRow(ws: WorkspaceRow) {
  return {
    workspaceId: ws.workspace_id,
    driveFolderId: ws.drive_folder_id,
    sheetsSpreadsheetId: ws.sheets_spreadsheet_id,
    sheetsSheetName: ws.sheets_sheet_name,
  };
}

/** Solo si la cookie apunta a un espacio donde el usuario es miembro (p. ej. UI /espacio). */
export async function getResolvedWorkspaceFromCookieOnly(
  email: string,
): Promise<{
  workspaceId: string;
  driveFolderId: string;
  sheetsSpreadsheetId: string;
  sheetsSheetName: string;
} | null> {
  const emailLower = email.toLowerCase();
  const cookieStore = await cookies();
  const wsId = cookieStore.get(WORKSPACE_COOKIE)?.value;
  if (!wsId) return null;

  try {
    const row = await dbQuery<WorkspaceRow>(
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
      [emailLower, wsId],
    );
    if (row.length === 0) return null;
    return mapWorkspaceRow(row[0]);
  } catch {
    return null;
  }
}

/**
 * Resuelve el espacio de trabajo del usuario:
 * 1) cookie válida + membresía
 * 2) si no hay cookie (o es inválida) pero solo pertenece a un espacio, usa ese
 * 3) varios espacios sin cookie → null (hay que elegir en /espacio)
 */
export async function getResolvedWorkspaceForUserEmail(
  email: string,
): Promise<{
  workspaceId: string;
  driveFolderId: string;
  sheetsSpreadsheetId: string;
  sheetsSheetName: string;
} | null> {
  const emailLower = email.toLowerCase();
  const cookieStore = await cookies();
  const wsId = cookieStore.get(WORKSPACE_COOKIE)?.value;

  try {
    if (wsId) {
      const row = await dbQuery<WorkspaceRow>(
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
        [emailLower, wsId],
      );
      if (row.length > 0) return mapWorkspaceRow(row[0]);
    }

    const candidates = await dbQuery<WorkspaceRow>(
      `
        select
          w.id as workspace_id,
          w.drive_folder_id,
          w.sheets_spreadsheet_id,
          w.sheets_sheet_name
        from public.user_workspace uw
        join public.workspace w on w.id = uw.workspace_id
        where uw.user_email = $1
        order by uw.created_at asc
        limit 2
      `,
      [emailLower],
    );

    if (candidates.length === 1) {
      return mapWorkspaceRow(candidates[0]);
    }
  } catch {
    return null;
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
