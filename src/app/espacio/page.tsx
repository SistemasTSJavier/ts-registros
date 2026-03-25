import Link from "next/link";
import { redirect } from "next/navigation";

import {
  createWorkspaceAction,
  createWorkspaceFromGoogleRefAction,
  joinWorkspaceAction,
  selectWorkspaceAction,
} from "@/actions/workspace-actions";
import { auth } from "@/auth";
import { envTrim } from "@/lib/google-env";
import { dbQuery } from "@/lib/db";
import {
  getResolvedWorkspaceForUserEmail,
  hasLegacyGoogleIntegration,
} from "@/lib/workspace-resolver";

export const dynamic = "force-dynamic";

const cardClass =
  "rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm ring-1 ring-slate-900/5 dark:border-zinc-800 dark:bg-zinc-900/80 dark:ring-white/5";
const btnPrimary =
  "inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white";
const btnSecondary =
  "inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-600";
const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none ring-slate-400/30 placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-500";

export default async function EspacioPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; createError?: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/api/auth/signin?callbackUrl=" + encodeURIComponent("/espacio"));
  }

  const email = session.user.email?.toLowerCase() ?? "";
  const sp = await searchParams;
  const next = sp.next && sp.next.startsWith("/") ? sp.next : "/";
  const createError = sp.createError?.trim();

  const legacy = await hasLegacyGoogleIntegration();
  if (legacy) {
    redirect(next);
  }

  const active = await getResolvedWorkspaceForUserEmail(email);
  if (active) {
    redirect(next);
  }

  type MembershipWithWorkspace = {
    workspaceId: string;
    role: string;
    workspace: { joinCode: string };
  };
  let memberships: MembershipWithWorkspace[] = [];
  let dbError: string | null = null;
  try {
    const rows = await dbQuery<{
      workspaceId: string;
      role: string;
      joinCode: string;
    }>(
      `
        select
          uw.workspace_id as "workspaceId",
          uw.role as role,
          w.join_code as "joinCode"
        from public.user_workspace uw
        join public.workspace w on w.id = uw.workspace_id
        where uw.user_email = $1
        order by uw.created_at asc
      `,
      [email],
    );

    memberships = rows.map((r) => ({
      workspaceId: r.workspaceId,
      role: r.role,
      workspace: { joinCode: r.joinCode },
    }));
  } catch (e) {
    dbError =
      e instanceof Error
        ? e.message
        : "No se pudo leer la base de datos (¿tablas creadas en Supabase?).";
  }

  const saEmail = envTrim("GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL");

  const uiError = createError ?? dbError;

  return (
    <div className="min-h-full bg-gradient-to-b from-slate-50 via-white to-slate-100/80 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900">
      <div className="mx-auto max-w-lg px-4 py-12 sm:px-6">
        <header className="mb-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-zinc-500">
            Configuración
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-zinc-50">
            Espacio de trabajo
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-zinc-400">
            Cada cuenta puede tener su propia hoja de cálculo. Para compartir la
            misma hoja con otras personas, enlaza el ID de la hoja o de la
            carpeta en Drive (compartidos con la cuenta de servicio del
            servidor).
          </p>
        </header>

        {uiError ? (
          <div
            className="mb-8 rounded-2xl border border-red-200/90 bg-red-50 px-5 py-4 text-left text-sm text-red-950 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-100"
            role="alert"
          >
            <p className="font-semibold">No se pudo completar la operación</p>
            <p className="mt-2 font-mono text-xs opacity-90 whitespace-pre-wrap break-words">
              {uiError}
            </p>
          </div>
        ) : null}

        {!uiError && memberships.length > 0 ? (
          <section className={`mb-8 ${cardClass}`}>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">
              Tus espacios
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">
              Elige cuál usar en esta sesión (se guarda en tu navegador).
            </p>
            <ul className="mt-5 flex flex-col gap-2">
              {memberships.map((m) => (
                <li key={m.workspaceId}>
                  <form action={selectWorkspaceAction}>
                    <input type="hidden" name="next" value={next} />
                    <input
                      type="hidden"
                      name="workspaceId"
                      value={m.workspaceId}
                    />
                    <button type="submit" className={btnSecondary}>
                      <span className="text-left">
                        Código {m.workspace.joinCode}
                        {m.role === "owner" ? (
                          <span className="ml-2 text-xs font-normal text-slate-500 dark:text-zinc-500">
                            (creador)
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section
          className={`mb-6 ${cardClass} ${uiError ? "pointer-events-none opacity-50" : ""}`}
          aria-hidden={Boolean(uiError)}
        >
          <h2 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">
            Crear hoja nueva
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">
            Se genera una carpeta y una hoja solo para esta cuenta de
            aplicación. Recibirás un código para invitar a otras personas al
            mismo espacio.
          </p>
          <form action={createWorkspaceAction} className="mt-5">
            <input type="hidden" name="next" value={next} />
            <button type="submit" className={btnPrimary}>
              Generar carpeta y hoja nuevas
            </button>
          </form>
        </section>

        <section
          className={`mb-6 ${cardClass} ${uiError ? "pointer-events-none opacity-50" : ""}`}
          aria-hidden={Boolean(uiError)}
        >
          <h2 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">
            Usar una hoja o carpeta de Drive
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">
            Pega el enlace de una hoja de Google Sheets existente, o el de una
            carpeta (se creará una hoja nueva dentro). La cuenta de servicio
            debe tener acceso como editor.
          </p>
          <form action={createWorkspaceFromGoogleRefAction} className="mt-5 space-y-3">
            <input type="hidden" name="next" value={next} />
            <input
              name="googleRef"
              type="text"
              placeholder="Enlace o ID de hoja / carpeta de Google Drive"
              autoComplete="off"
              className={inputClass}
            />
            <button type="submit" className={btnSecondary}>
              Crear espacio desde este enlace
            </button>
          </form>
        </section>

        <section
          className={`${cardClass} ${dbError ? "pointer-events-none opacity-50" : ""}`}
          aria-hidden={Boolean(dbError)}
        >
          <h2 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">
            Unirme con código
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">
            Si otra persona ya creó un espacio, pide el código (p. ej.{" "}
            REG-AB12CD34) para usar la misma hoja.
          </p>
          {saEmail ? (
            <p className="mt-2 text-xs text-slate-500 dark:text-zinc-500">
              Comparte carpetas o hojas con{" "}
              <code className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] dark:bg-zinc-800">
                {saEmail}
              </code>{" "}
              como editor.
            </p>
          ) : null}
          <form action={joinWorkspaceAction} className="mt-5 flex flex-col gap-3">
            <input type="hidden" name="next" value={next} />
            <input
              name="code"
              placeholder="REG-XXXXXXXX"
              autoComplete="off"
              className={inputClass}
            />
            <button type="submit" className={btnSecondary}>
              Unirme
            </button>
          </form>
        </section>

        <p className="mt-10 text-center text-sm text-slate-600 dark:text-zinc-500">
          <Link
            href="/"
            className="font-medium text-slate-900 underline underline-offset-4 hover:no-underline dark:text-zinc-100"
          >
            Volver al inicio
          </Link>
        </p>
      </div>
    </div>
  );
}
