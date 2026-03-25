import { cookies } from "next/headers";

import { envTrim } from "@/lib/google-env";
import { loadGoogleIntegrationState } from "@/lib/google-integration-db";
import { prisma } from "@/lib/prisma";

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
    const member = await prisma.userWorkspace.findUnique({
      where: {
        userEmail_workspaceId: {
          userEmail: email.toLowerCase(),
          workspaceId: wsId,
        },
      },
    });
    if (!member) return null;

    const ws = await prisma.workspace.findUnique({ where: { id: wsId } });
    if (!ws) return null;

    return {
      workspaceId: ws.id,
      driveFolderId: ws.driveFolderId,
      sheetsSpreadsheetId: ws.sheetsSpreadsheetId,
      sheetsSheetName: ws.sheetsSheetName,
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
      const ws = await prisma.workspace.findUnique({
        where: { id: explicit },
      });
      if (ws) {
        return {
          driveFolderId: ws.driveFolderId,
          sheetsSpreadsheetId: ws.sheetsSpreadsheetId,
          sheetsSheetName: ws.sheetsSheetName,
        };
      }
      throw new Error(
        "PUBLIC_WORKSPACE_ID no coincide con ningún espacio de trabajo.",
      );
    }

    const count = await prisma.workspace.count();
    if (count === 1) {
      const ws = await prisma.workspace.findFirst({
        orderBy: { createdAt: "asc" },
      });
      if (ws) {
        return {
          driveFolderId: ws.driveFolderId,
          sheetsSpreadsheetId: ws.sheetsSpreadsheetId,
          sheetsSheetName: ws.sheetsSheetName,
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
    return await prisma.userWorkspace.count({
      where: { userEmail: email.toLowerCase() },
    });
  } catch {
    return 0;
  }
}
