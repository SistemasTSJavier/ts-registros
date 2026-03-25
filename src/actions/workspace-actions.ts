"use server";

import { randomBytes } from "crypto";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { createFreshWorkspaceResources } from "@/lib/google-setup";
import { prisma } from "@/lib/prisma";
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

function isJoinCodeCollision(e: unknown): boolean {
  if (!(e instanceof Prisma.PrismaClientKnownRequestError) || e.code !== "P2002") {
    return false;
  }
  const t = e.meta?.target;
  if (t === "joinCode") return true;
  return Array.isArray(t) && t.includes("joinCode");
}

export async function createWorkspaceAction(formData: FormData): Promise<void> {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email) {
    throw new Error("Inicia sesión primero.");
  }

  const suffix = randomBytes(4).toString("hex");
  let storage;
  try {
    storage = await createFreshWorkspaceResources(suffix);
  } catch (e) {
    throw new Error(
      e instanceof Error ? e.message : "No se pudo crear la carpeta en Google.",
    );
  }

  for (let attempt = 0; attempt < 8; attempt++) {
    const joinCode = generateJoinCode();
    try {
      const ws = await prisma.workspace.create({
        data: {
          joinCode,
          driveFolderId: storage.driveFolderId,
          sheetsSpreadsheetId: storage.sheetsSpreadsheetId,
          sheetsSheetName: storage.sheetsSheetName,
          createdByEmail: email,
          members: {
            create: { userEmail: email, role: "owner" },
          },
        },
      });

      const cookieStore = await cookies();
      cookieStore.set(WORKSPACE_COOKIE, ws.id, cookieOptions());
      revalidatePath("/");
      redirect("/espacio/exito?c=" + encodeURIComponent(ws.joinCode));
    } catch (e) {
      if (isRedirectError(e)) throw e;
      if (isJoinCodeCollision(e)) continue;
      throw e instanceof Error
        ? e
        : new Error("No se pudo guardar el espacio en la base de datos.");
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

  const ws = await prisma.workspace.findUnique({ where: { joinCode: code } });
  if (!ws) {
    throw new Error("Código no válido o ya no existe.");
  }

  await prisma.userWorkspace.upsert({
    where: {
      userEmail_workspaceId: { userEmail: email, workspaceId: ws.id },
    },
    create: { userEmail: email, workspaceId: ws.id, role: "member" },
    update: {},
  });

  const cookieStore = await cookies();
  cookieStore.set(WORKSPACE_COOKIE, ws.id, cookieOptions());
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

  const member = await prisma.userWorkspace.findUnique({
    where: {
      userEmail_workspaceId: {
        userEmail: email,
        workspaceId,
      },
    },
  });
  if (!member) {
    throw new Error("No perteneces a ese espacio.");
  }

  const cookieStore = await cookies();
  cookieStore.set(WORKSPACE_COOKIE, workspaceId, cookieOptions());
  revalidatePath("/");
  redirect(next);
}
