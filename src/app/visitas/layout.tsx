import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { SignOutButton } from "@/components/sign-out-button";
import { getUserEmail, isAdminEmail, isOfficerEmail } from "@/lib/access";
import { resolveGoogleSheetsStorage } from "@/lib/google-setup";
import {
  getResolvedWorkspaceForUserEmail,
  hasLegacyGoogleIntegration,
} from "@/lib/workspace-resolver";

const navLink =
  "rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100";

export default async function VisitasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect(
      "/api/auth/signin?callbackUrl=" + encodeURIComponent("/visitas"),
    );
  }
  const email = getUserEmail(session);
  const wsForRole = email
    ? await getResolvedWorkspaceForUserEmail(email)
    : null;
  const tenantId = wsForRole?.workspaceId ?? null;
  const isOfficer = await isOfficerEmail(email, tenantId);
  const isAdmin = await isAdminEmail(email, tenantId);
  if (!isOfficer && !isAdmin) {
    redirect("/");
  }

  const legacy = await hasLegacyGoogleIntegration();
  if (!legacy) {
    const ws = await getResolvedWorkspaceForUserEmail(email!);
    if (!ws) {
      redirect(
        "/espacio?next=" + encodeURIComponent("/visitas") + "#ids-manuales",
      );
    }
  }

  try {
    await resolveGoogleSheetsStorage();
  } catch {
    // Ignorar para no bloquear el acceso al panel.
  }

  return (
    <div className="min-h-full flex-1 bg-gradient-to-b from-slate-50 via-white to-slate-100/80 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <header className="mb-10 rounded-2xl border border-slate-200/90 bg-white/80 p-5 shadow-sm ring-1 ring-slate-900/5 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/70 dark:ring-white/5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-zinc-500">
                Panel oficial
              </p>
              <p className="mt-1 text-sm font-medium text-slate-900 dark:text-zinc-100">
                {email ?? session.user.email ?? session.user.name}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <SignOutButton />
            </div>
          </div>
          <nav className="mt-5 flex flex-wrap gap-1 border-t border-slate-100 pt-5 dark:border-zinc-800">
            <Link href="/visitas" className={navLink}>
              Resumen
            </Link>
            <Link href="/visitas/programadas" className={navLink}>
              Programadas
            </Link>
            <Link href="/visitas/sin-programacion" className={navLink}>
              Sin cita
            </Link>
            {isOfficer ? (
              <Link href="/visitas/programadas/escaneo" className={navLink}>
                Escaneo
              </Link>
            ) : null}
            <Link href="/espacio?next=/visitas#ids-manuales" className={navLink}>
              Espacio
            </Link>
            <Link href="/" className={navLink}>
              Inicio
            </Link>
            {isAdmin ? (
              <Link href="/admin" className={navLink}>
                Admin
              </Link>
            ) : null}
          </nav>
        </header>
        {children}
      </div>
    </div>
  );
}
