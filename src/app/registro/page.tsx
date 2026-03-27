import Link from "next/link";

import { auth } from "@/auth";
import { getUserEmail, isAdminEmail } from "@/lib/access";
import { getResolvedWorkspaceForUserEmail } from "@/lib/workspace-resolver";

export default async function RegistroIndexPage() {
  const session = await auth();
  const email = getUserEmail(session);
  const ws = email ? await getResolvedWorkspaceForUserEmail(email) : null;
  const canAdmin = await isAdminEmail(email, ws?.workspaceId);

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-zinc-50">
        Tipo de registro
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-zinc-400">
        Los datos se guardan en la hoja del espacio que tengas seleccionado. Los
        avisos por correo salen desde tu cuenta de Google.
      </p>
      <ul className="mt-8 flex flex-col gap-4">
        {canAdmin ? (
          <li>
            <Link
              href="/registro/programada"
              className="group block rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm ring-1 ring-slate-900/5 transition hover:border-slate-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/80 dark:ring-white/5 dark:hover:border-zinc-600"
            >
              <span className="font-semibold text-slate-900 dark:text-zinc-50">
                Visita programada
              </span>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-zinc-400">
                Fecha, horario y notificaciones por correo. En recepción se
                verifica la identificación.
              </p>
              <span className="mt-4 inline-flex text-sm font-medium text-slate-700 group-hover:text-slate-900 dark:text-zinc-400 dark:group-hover:text-zinc-200">
                Abrir formulario →
              </span>
            </Link>
          </li>
        ) : null}
        <li>
          <Link
            href="/registro/sin-programacion"
            className="group block rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm ring-1 ring-slate-900/5 transition hover:border-slate-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/80 dark:ring-white/5 dark:hover:border-zinc-600"
          >
            <span className="font-semibold text-slate-900 dark:text-zinc-50">
              Entrada sin cita
            </span>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-zinc-400">
              Opcional: captura de INE; correo para aprobar o denegar la entrada.
            </p>
            <span className="mt-4 inline-flex text-sm font-medium text-slate-700 group-hover:text-slate-900 dark:text-zinc-400 dark:group-hover:text-zinc-200">
              Abrir formulario →
            </span>
          </Link>
        </li>
      </ul>
    </div>
  );
}
