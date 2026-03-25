"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import {
  createFreshWorkspaceResources,
  resolveWorkspaceStorageFromGoogleRef,
} from "@/lib/google-setup";
import { dbQuery, dbTx } from "@/lib/db";
import { WORKSPACE_COOKIE } from "@/lib/workspace-resolver";

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 400,
  };
}

function generateJoinCode(): string {
  return `REG-${randomBytes(4).toString("hex").toUpperCase()}`;
}

function normalizeJoinCode(raw: string): string {
  const t = raw.trim().toUpperCase().replace(/\s+/g, "");
  if (t.startsWith("REG-")) return t;
  return `REG-${t.replace(/^REG-?/, "")}`;
}

function safeNext(raw: string): string {
  const n = raw.trim();
  return n.startsWith("/") && !n.startsWith("//") ? n : "/";
}

function isJoinCodeUniqueViolation(e: unknown): boolean {
  // Postgres duplicate key
  const code = (e as { code?: string } | null)?.code;
  if (code !== "23505") return false;
  const msg = (e as { message?: string } | null)?.message ?? "";
  return msg.includes("join_code") || msg.includes("joinCode");
}

export async function createWorkspaceAction(formData: FormData): Promise<void> {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email) {
    throw new Error("Inicia sesión primero.");
  }

  const suffix = randomBytes(4).toString("hex");
  const next = safeNext(String(formData.get("next") ?? "/"));
  let storage;
  try {
    storage = await createFreshWorkspaceResources(suffix);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "No se pudo crear la carpeta en Google.";
    redirect(`/espacio?createError=${encodeURIComponent(msg)}&next=${encodeURIComponent(next)}`);
  }

  for (let attempt = 0; attempt < 8; attempt++) {
    const joinCode = generateJoinCode();
    try {
      const ws = await dbTx(async (client) => {
        const createdWsRes = await client.query<
          { id: string; join_code: string }
        >(
          `
            insert into public.workspace
              (join_code, drive_folder_id, sheets_spreadsheet_id, sheets_sheet_name, created_by_email)
            values ($1, $2, $3, $4, $5)
            returning id, join_code
          `,
          [
            joinCode,
            storage.driveFolderId,
            storage.sheetsSpreadsheetId,
            storage.sheetsSheetName,
            email,
          ],
        );
        const createdWs = createdWsRes.rows[0];

        await client.query(
          `
            insert into public.user_workspace (user_email, workspace_id, role)
            values ($1, $2, 'owner')
          `,
          [email, createdWs.id],
        );

        return createdWs;
      });

      const cookieStore = await cookies();
      cookieStore.set(WORKSPACE_COOKIE, ws.id, cookieOptions());
      revalidatePath("/");
      redirect("/espacio/exito?c=" + encodeURIComponent(ws.join_code));
    } catch (e) {
      if (isRedirectError(e)) throw e;
      if (isJoinCodeUniqueViolation(e)) continue;
      const msg = e instanceof Error ? e.message : "No se pudo guardar el espacio.";
      redirect(`/espacio?createError=${encodeURIComponent(msg)}&next=${encodeURIComponent(next)}`);
    }
  }

  throw new Error(
    "No se pudo asignar un código único al espacio. Reintenta en unos segundos.",
  );
}

export async function createWorkspaceFromGoogleRefAction(
  formData: FormData,
): Promise<void> {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email) {
    throw new Error("Inicia sesión primero.");
  }

  const next = safeNext(String(formData.get("next") ?? "/"));
  const raw = String(formData.get("googleRef") ?? "").trim();

  let storage;
  try {
    storage = await resolveWorkspaceStorageFromGoogleRef(raw);
  } catch (e) {
    const msg =
      e instanceof Error
        ? e.message
        : "No se pudo validar el recurso en Google.";
    redirect(
      `/espacio?createError=${encodeURIComponent(msg)}&next=${encodeURIComponent(next)}`,
    );
  }

  for (let attempt = 0; attempt < 8; attempt++) {
    const joinCode = generateJoinCode();
    try {
      const ws = await dbTx(async (client) => {
        const createdWsRes = await client.query<
          { id: string; join_code: string }
        >(
          `
            insert into public.workspace
              (join_code, drive_folder_id, sheets_spreadsheet_id, sheets_sheet_name, created_by_email)
            values ($1, $2, $3, $4, $5)
            returning id, join_code
          `,
          [
            joinCode,
            storage.driveFolderId,
            storage.sheetsSpreadsheetId,
            storage.sheetsSheetName,
            email,
          ],
        );
        const createdWs = createdWsRes.rows[0];

        await client.query(
          `
            insert into public.user_workspace (user_email, workspace_id, role)
            values ($1, $2, 'owner')
          `,
          [email, createdWs.id],
        );

        return createdWs;
      });

      const cookieStore = await cookies();
      cookieStore.set(WORKSPACE_COOKIE, ws.id, cookieOptions());
      revalidatePath("/");
      redirect("/espacio/exito?c=" + encodeURIComponent(ws.join_code));
    } catch (e) {
      if (isRedirectError(e)) throw e;
      if (isJoinCodeUniqueViolation(e)) continue;
      const msg = e instanceof Error ? e.message : "No se pudo guardar el espacio.";
      redirect(
        `/espacio?createError=${encodeURIComponent(msg)}&next=${encodeURIComponent(next)}`,
      );
    }
  }

  throw new Error(
    "No se pudo asignar un código único al espacio. Reintenta en unos segundos.",
  );
}

export async function joinWorkspaceAction(formData: FormData): Promise<void> {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email) {
    throw new Error("Inicia sesión primero.");
  }

  const next = safeNext(String(formData.get("next") ?? "/"));

  const raw = String(formData.get("code") ?? "");
  const code = normalizeJoinCode(raw);
  if (code.length < 12) {
    throw new Error("Pega el código completo (p. ej. REG-AB12CD34).");
  }

  const ws = await dbQuery<{ id: string }>(
    `select id from public.workspace where join_code = $1 limit 1`,
    [code],
  );
  if (ws.length === 0) {
    throw new Error("Código no válido o ya no existe.");
  }
  const workspaceId = ws[0].id;

  await dbQuery(
    `
      insert into public.user_workspace (user_email, workspace_id, role)
      values ($1, $2, 'member')
      on conflict (user_email, workspace_id)
      do update set role = excluded.role
    `,
    [email, workspaceId],
  );

  const cookieStore = await cookies();
  cookieStore.set(WORKSPACE_COOKIE, workspaceId, cookieOptions());
  revalidatePath("/");
  redirect(next);
}

export async function selectWorkspaceAction(formData: FormData): Promise<void> {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email) {
    throw new Error("Inicia sesión primero.");
  }

  const next = safeNext(String(formData.get("next") ?? "/"));

  const workspaceId = String(formData.get("workspaceId") ?? "").trim();
  if (!workspaceId) {
    throw new Error("Elige un espacio.");
  }

  const member = await dbQuery<{ id: string }>(
    `
      select id
      from public.user_workspace
      where user_email = $1 and workspace_id = $2
      limit 1
    `,
    [email, workspaceId],
  );
  if (member.length === 0) {
    throw new Error("No perteneces a ese espacio.");
  }

  const cookieStore = await cookies();
  cookieStore.set(WORKSPACE_COOKIE, workspaceId, cookieOptions());
  revalidatePath("/");
  redirect(next);
}
