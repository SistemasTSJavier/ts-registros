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
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-gradient-to-b from-slate-50 via-white to-slate-100/90 px-6 py-16 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900">
      <div className="w-full max-w-md">
        <div className="text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-zinc-500">
            Control de accesos
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 dark:text-zinc-50">
            Registro de visitas
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-zinc-400">
            Citas programadas, entradas sin cita y seguimiento para recepción.
          </p>
        </div>

        {session?.user ? (
          <div className="mt-10 flex flex-col items-stretch gap-5">
            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 text-left shadow-sm ring-1 ring-slate-900/5 dark:border-zinc-800 dark:bg-zinc-900/80 dark:ring-white/5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-500">
                Sesión activa
              </p>
              <p className="mt-2 text-sm font-medium text-slate-900 dark:text-zinc-100">
                {session.user.email ?? session.user.name}
              </p>
              <div className="mt-3 flex flex-col gap-2">
                <Link
                  href="/espacio?next=/#ids-manuales"
                  className="inline-flex text-sm font-medium text-slate-700 underline-offset-4 hover:underline dark:text-zinc-300"
                >
                  Espacio de trabajo y hoja de Google
                </Link>
                {!needsEspacio ? (
                  <Link
                    href="/espacio?reconfigure=1&next=/"
                    className="inline-flex text-xs font-medium text-slate-500 underline-offset-4 hover:text-slate-800 hover:underline dark:text-zinc-500 dark:hover:text-zinc-300"
                  >
                    Usar otra carpeta u hoja (nuevo espacio)
                  </Link>
                ) : null}
              </div>
              <div className="mt-5 flex justify-center border-t border-slate-100 pt-5 dark:border-zinc-800">
                <SignOutButton />
              </div>
            </div>

            {needsEspacio ? (
              <div className="rounded-2xl border border-sky-200/80 bg-sky-50/90 p-5 text-left text-sm text-sky-950 shadow-sm dark:border-sky-900/40 dark:bg-sky-950/35 dark:text-sky-100">
                <p className="font-semibold">Configura tu espacio</p>
                <p className="mt-1 leading-relaxed text-sky-900/85 dark:text-sky-200/90">
                  Crea una hoja nueva, enlaza una existente o únete con código.
                </p>
                <Link
                  href="/espacio?next=/#ids-manuales"
                  className="mt-4 inline-flex rounded-xl bg-sky-900 px-4 py-2.5 text-xs font-semibold text-white shadow-sm dark:bg-sky-200 dark:text-sky-950"
                >
                  Ir a configuración
                </Link>
              </div>
            ) : null}

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-500">
                Paneles
              </p>
              <ul className="mt-3 flex flex-col gap-2">
                {canOfficer ? (
                  <li>
                    <Link
                      href="/visitas"
                      className="block rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-medium text-slate-900 shadow-sm transition hover:border-slate-300 hover:shadow dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:border-zinc-600"
                    >
                      Panel oficial — visitas y escaneo
                    </Link>
                  </li>
                ) : (
                  <li className="rounded-xl border border-amber-200/90 bg-amber-50 px-4 py-3.5 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
                    Tu correo no está en{" "}
                    <code className="rounded-md bg-amber-100/90 px-1.5 py-0.5 text-xs dark:bg-amber-900/80">
                      OFFICER_EMAILS
                    </code>
                    . Pide acceso al administrador.
                  </li>
                )}
                {canAdmin ? (
                  <li>
                    <Link
                      href="/admin"
                      className="block rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-medium text-slate-900 shadow-sm transition hover:border-slate-300 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:border-zinc-600"
                    >
                      Administración
                    </Link>
                  </li>
                ) : null}
              </ul>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-500">
                Formularios
              </p>
              <Link
                href="/registro"
                className="mt-3 block rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-medium text-slate-900 shadow-sm transition hover:border-slate-300 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:border-zinc-600"
              >
                Registrar visita (requiere sesión)
              </Link>
            </div>
          </div>
        ) : (
          <form action={signInWithGoogle} className="mt-10">
            <button
              type="submit"
              className="w-full rounded-xl bg-slate-900 px-8 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            >
              Iniciar sesión con Google
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
