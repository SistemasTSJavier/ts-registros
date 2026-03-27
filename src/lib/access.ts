import type { Session } from "next-auth";
import { dbQuery } from "@/lib/db";

function parseEmails(raw: string | undefined): Set<string> {
  const out = new Set<string>();
  if (!raw) return out;
  for (const part of raw.split(/[\s,;]+/)) {
    const e = part.trim().toLowerCase();
    if (!e) continue;
    out.add(e);
  }
  return out;
}

export function getUserEmail(session: Session | null): string | null {
  return (session?.user?.email ?? session?.user?.name ?? null)?.toLowerCase() ?? null;
}

async function hasGlobalRoleInDb(
  email: string,
  role: "officer" | "admin",
): Promise<boolean> {
  try {
    const rows = await dbQuery<{ ok: number }>(
      `
        select 1 as ok
        from public.user_role
        where user_email = $1
          and role = $2
          and is_active = true
        limit 1
      `,
      [email, role],
    );
    return rows.length > 0;
  } catch {
    return false;
  }
}

async function hasTenantRoleInDb(
  email: string,
  role: "officer" | "admin",
  tenantId?: string | null,
): Promise<boolean> {
  if (!tenantId) return false;
  try {
    const rows = await dbQuery<{ ok: number }>(
      `
        select 1 as ok
        from public.user_workspace_role r
        where lower(r.user_email) = lower($1)
          and r.workspace_id = $2
          and r.role = $3
          and r.is_active = true
        limit 1
      `,
      [email, tenantId, role],
    );
    return rows.length > 0;
  } catch {
    return false;
  }
}

export async function isOfficerEmail(
  email: string | null,
  tenantId?: string | null,
): Promise<boolean> {
  if (!email) return false;
  const emailLower = email.toLowerCase();

  // Prioridad: roles por tenant.
  if (await hasTenantRoleInDb(emailLower, "officer", tenantId)) return true;
  if (await hasTenantRoleInDb(emailLower, "admin", tenantId)) return true; // admin también opera panel oficial

  // Compatibilidad: roles globales (tabla existente).
  if (await hasGlobalRoleInDb(emailLower, "officer")) return true;
  if (await hasGlobalRoleInDb(emailLower, "admin")) return true;

  // Fallback legacy por variables de entorno.
  const list = parseEmails(process.env.OFFICER_EMAILS);
  if (list.size === 0) return true; // compatibilidad: abierto si no hay lista
  return list.has(emailLower);
}

export async function isAdminEmail(
  email: string | null,
  tenantId?: string | null,
): Promise<boolean> {
  if (!email) return false;
  const emailLower = email.toLowerCase();

  if (await hasTenantRoleInDb(emailLower, "admin", tenantId)) return true;
  if (await hasGlobalRoleInDb(emailLower, "admin")) return true;

  // Fallback legacy por variables de entorno.
  const list = parseEmails(process.env.ADMIN_EMAILS);
  if (list.size === 0) return false;
  return list.has(emailLower);
}

