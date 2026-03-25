import Link from "next/link";

import { auth, signIn } from "@/auth";
import { SignOutButton } from "@/components/sign-out-button";
import { getUserEmail, isAdminEmail, isOfficerEmail } from "@/lib/access";
import {
  getResolvedWorkspaceForUserEmail,
  hasLegacyGoogleIntegration,
} from "@/lib/workspace-resolver";

async function signInWithGoogle() {
  "use server";
  await signIn("google", { redirectTo: "/" });
}

export default async function Home() {
  const session = await auth();
  const email = getUserEmail(session);
  const canOfficer = isOfficerEmail(email);
  const canAdmin = isAdminEmail(email);
  const legacyGoogle = await hasLegacyGoogleIntegration();
  const workspaceActive =
    email && (await getResolvedWorkspaceForUserEmail(email));
  const needsEspacio =
    Boolean(session?.user) && !legacyGoogle && !workspaceActive;

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-zinc-50 px-6 py-16 font-sans dark:bg-zinc-950">
      <div className="w-full max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Registro de visitas
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Entradas, salidas y citas programadas.
        </p>

        {session?.user ? (
          <div className="mt-10 flex flex-col items-stretch gap-6">
            <div className="rounded-xl border border-zinc-200 bg-white p-5 text-left shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Sesión
              </p>
              <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {session.user.email ?? session.user.name}
              </p>
              <Link
                href="/espacio?next=/"
                className="mt-2 block text-center text-xs text-zinc-500 underline underline-offset-2 dark:text-zinc-400"
              >
                Espacio de trabajo (carpeta / código)
              </Link>
              <div className="mt-4 flex justify-center">
                <SignOutButton />
              </div>
            </div>

            {needsEspacio ? (
              <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-left text-sm text-sky-950 dark:border-sky-900/50 dark:bg-sky-950/40 dark:text-sky-100">
                <p className="font-medium">Configura tu espacio de trabajo</p>
                <p className="mt-1 text-sky-900/80 dark:text-sky-200/90">
                  Crea la carpeta y la hoja en Google o únete con un código de
                  invitación.
                </p>
                <Link
                  href="/espacio?next=/"
                  className="mt-3 inline-block rounded-full bg-sky-900 px-4 py-2 text-xs font-medium text-white dark:bg-sky-200 dark:text-sky-950"
                >
                  Ir a espacio de trabajo
                </Link>
              </div>
            ) : null}

            <div className="text-left">
              <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Paneles
              </p>
              <ul className="mt-3 flex flex-col gap-2">
                {canOfficer ? (
                  <li>
                    <Link
                      href="/visitas"
                      className="block rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-900 transition hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:border-zinc-600"
                    >
                      Panel oficial — visitas y escaneo
                    </Link>
                  </li>
                ) : (
                  <li className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
                    Tu correo no está en{" "}
                    <code className="rounded bg-amber-100/80 px-1 text-xs dark:bg-amber-900/80">
                      OFFICER_EMAILS
                    </code>
                    . Pide acceso al administrador o revisa las variables en Vercel.
                  </li>
                )}
                {canAdmin ? (
                  <li>
                    <Link
                      href="/admin"
                      className="block rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-900 transition hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:border-zinc-600"
                    >
                      Panel administración
                    </Link>
                  </li>
                ) : null}
              </ul>
            </div>

            <div className="text-left">
              <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Registro público
              </p>
              <Link
                href="/registro"
                className="mt-3 block rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-900 transition hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:border-zinc-600"
              >
                Formularios de visita (programada o sin cita)
              </Link>
            </div>
          </div>
        ) : (
          <form action={signInWithGoogle} className="mt-10">
            <button
              type="submit"
              className="w-full rounded-full bg-zinc-900 px-8 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            >
              Iniciar sesión con Google
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
