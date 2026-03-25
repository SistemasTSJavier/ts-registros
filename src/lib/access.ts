import type { Session } from "next-auth";

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

export function isOfficerEmail(email: string | null): boolean {
  if (!email) return false;
  const list = parseEmails(process.env.OFFICER_EMAILS);
  if (list.size === 0) return true; // si no configuras lista, permite cualquiera logueado
  return list.has(email);
}

export function isAdminEmail(email: string | null): boolean {
  if (!email) return false;
  const list = parseEmails(process.env.ADMIN_EMAILS);
  if (list.size === 0) return false;
  return list.has(email);
}

