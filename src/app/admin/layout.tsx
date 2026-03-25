import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { getUserEmail, isAdminEmail } from "@/lib/access";
import { ensureGoogleDriveAndSheetsSetup } from "@/lib/google-setup";
import { SignOutButton } from "@/components/sign-out-button";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/api/auth/signin/google");
  }

  const email = getUserEmail(session);
  if (!isAdminEmail(email)) {
    redirect("/");
  }

  try {
    await ensureGoogleDriveAndSheetsSetup();
  } catch {
    // no bloquear panel admin si falta google
  }

  return (
    <div className="min-h-full flex-1 bg-zinc-50 px-4 py-10 dark:bg-zinc-950">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-6 dark:border-zinc-800">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Panel admin
            </p>
            <p className="text-sm text-zinc-700 dark:text-zinc-300">{email}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/admin"
              className="text-sm text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-400"
            >
              Inicio
            </Link>
            <Link
              href="/visitas"
              className="text-sm text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-400"
            >
              Oficial
            </Link>
            <Link
              href="/"
              className="text-sm text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-400"
            >
              App
            </Link>
            <SignOutButton />
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}

