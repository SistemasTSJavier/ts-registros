import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { getUserEmail, isOfficerEmail } from "@/lib/access";
import { ensureGoogleDriveAndSheetsSetup } from "@/lib/google-setup";
import { SignOutButton } from "@/components/sign-out-button";

export default async function VisitasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/api/auth/signin/google");
  }
  const email = getUserEmail(session);
  if (!isOfficerEmail(email)) {
    redirect("/");
  }

  // Setup idempotente de Drive/Sheets por sesión autorizada.
  // Si no está configurado Google, no rompe el panel.
  try {
    await ensureGoogleDriveAndSheetsSetup();
  } catch {
    // Ignorar para no bloquear el acceso al panel.
  }

  return (
    <div className="min-h-full flex-1 bg-zinc-50 px-4 py-10 dark:bg-zinc-950">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-6 dark:border-zinc-800">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Panel oficial
            </p>
            <p className="text-sm text-zinc-700 dark:text-zinc-300">
              {email ?? session.user.email ?? session.user.name}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/visitas"
              className="text-sm text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-400"
            >
              Resumen
            </Link>
            <Link
              href="/visitas/programadas"
              className="text-sm text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-400"
            >
              Programadas
            </Link>
            <Link
              href="/visitas/programadas/escaneo"
              className="text-sm text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-400"
            >
              Escaneo cita
            </Link>
            <Link
              href="/visitas/sin-programacion"
              className="text-sm text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-400"
            >
              Sin cita
            </Link>
            <Link
              href="/"
              className="text-sm text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-400"
            >
              Inicio
            </Link>
            <Link
              href="/admin"
              className="text-sm text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-400"
            >
              Admin
            </Link>
            <SignOutButton />
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
