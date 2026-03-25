import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { getUserEmail } from "@/lib/access";
import {
  getResolvedWorkspaceForUserEmail,
  hasLegacyGoogleIntegration,
} from "@/lib/workspace-resolver";

export default async function RegistroLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect(
      "/api/auth/signin?callbackUrl=" + encodeURIComponent("/registro"),
    );
  }

  const email = getUserEmail(session);
  if (!email) {
    redirect(
      "/api/auth/signin?callbackUrl=" + encodeURIComponent("/registro"),
    );
  }

  const ws = await getResolvedWorkspaceForUserEmail(email);
  const legacy = await hasLegacyGoogleIntegration();
  if (!ws && !legacy) {
    redirect(
      "/espacio?next=" + encodeURIComponent("/registro") + "#ids-manuales",
    );
  }

  return (
    <div className="min-h-full flex-1 bg-gradient-to-b from-slate-50 via-white to-slate-100/80 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <header className="mb-10 rounded-2xl border border-slate-200/90 bg-white/80 p-5 shadow-sm ring-1 ring-slate-900/5 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/70 dark:ring-white/5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-zinc-500">
            Registro de visitas
          </p>
          <nav className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <Link
              href="/"
              className="font-medium text-slate-600 transition hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Inicio
            </Link>
            <span className="text-slate-300 dark:text-zinc-600">/</span>
            <span className="font-semibold text-slate-900 dark:text-zinc-100">
              Formularios
            </span>
          </nav>
        </header>
        {children}
      </div>
    </div>
  );
}
