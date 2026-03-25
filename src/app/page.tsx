import Link from "next/link";

import { auth } from "@/auth";
import { SignOutButton } from "@/components/sign-out-button";

export default async function Home() {
  const session = await auth();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 bg-zinc-50 px-6 py-16 font-sans dark:bg-zinc-950">
      <div className="max-w-lg text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Registro de visitas
        </h1>
        <p className="mt-3 text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
          Programación de visitas, entradas sin cita (OCR de INE) y correos de notificación.
          Oficiales: inicia sesión para verificar ingresos.
        </p>
      </div>
      <div className="flex max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          className="rounded-full border border-zinc-300 px-5 py-2.5 text-center text-sm font-medium text-zinc-900 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
          href="/registro"
        >
          Nuevo registro
        </Link>
        <Link
          className="rounded-full border border-zinc-300 px-5 py-2.5 text-center text-sm font-medium text-zinc-900 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
          href="/visitas"
        >
          Panel oficial
        </Link>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {session?.user ? (
          <>
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              {session.user.email ?? session.user.name ?? "Sesión activa"}
            </span>
            <SignOutButton />
          </>
        ) : (
          <Link
            className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            href="/api/auth/signin/google"
          >
            Iniciar sesión
          </Link>
        )}
      </div>
    </div>
  );
}
