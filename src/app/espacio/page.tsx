import Link from "next/link";
import { redirect } from "next/navigation";

import {
  createWorkspaceAction,
  joinWorkspaceAction,
  selectWorkspaceAction,
} from "@/actions/workspace-actions";
import { auth } from "@/auth";
import { envTrim } from "@/lib/google-env";
import { prisma } from "@/lib/prisma";
import {
  getResolvedWorkspaceForUserEmail,
  hasLegacyGoogleIntegration,
} from "@/lib/workspace-resolver";

export const dynamic = "force-dynamic";

export default async function EspacioPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/api/auth/signin?callbackUrl=" + encodeURIComponent("/espacio"));
  }

  const email = session.user.email?.toLowerCase() ?? "";
  const sp = await searchParams;
  const next = sp.next && sp.next.startsWith("/") ? sp.next : "/";

  const legacy = await hasLegacyGoogleIntegration();
  if (legacy) {
    redirect(next);
  }

  const active = await getResolvedWorkspaceForUserEmail(email);
  if (active) {
    redirect(next);
  }

  const memberships = await prisma.userWorkspace.findMany({
    where: { userEmail: email },
    include: { workspace: true },
    orderBy: { createdAt: "asc" },
  });

  const saEmail = envTrim("GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL");

  return (
    <div className="mx-auto min-h-full max-w-lg px-4 py-12 font-sans">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Espacio de trabajo
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Un espacio agrupa una carpeta en Google Drive y una hoja de cálculo. Los
        oficiales que unan el mismo código comparten los mismos registros. Cada
        instalación de la app es independiente de otras.
      </p>

      {memberships.length > 0 ? (
        <section className="mt-10 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Ya perteneces a un espacio
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Elige cuál usar en esta sesión (se guarda en tu navegador).
          </p>
          <ul className="mt-4 flex flex-col gap-2">
            {memberships.map((m) => (
              <li key={m.workspaceId}>
                <form action={selectWorkspaceAction}>
                  <input type="hidden" name="next" value={next} />
                  <input
                    type="hidden"
                    name="workspaceId"
                    value={m.workspaceId}
                  />
                  <button
                    type="submit"
                    className="w-full rounded-lg border border-zinc-200 px-4 py-3 text-left text-sm font-medium text-zinc-900 transition hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-50 dark:hover:border-zinc-600"
                  >
                    Código {m.workspace.joinCode}
                    {m.role === "owner" ? (
                      <span className="ml-2 text-xs text-zinc-500">
                        (creador)
                      </span>
                    ) : null}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-10 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Crear nuevo espacio
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          La app crea automáticamente una carpeta y una hoja en el Drive de la
          cuenta de servicio del servidor. Recibirás un{" "}
          <strong>código de acceso</strong> para invitar a otras personas.
        </p>
        <form action={createWorkspaceAction} className="mt-4">
          <input type="hidden" name="next" value={next} />
          <button
            type="submit"
            className="w-full rounded-full bg-zinc-900 px-4 py-3 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Generar carpeta y hoja nuevas
          </button>
        </form>
      </section>

      <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Unirme con código
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Pide el código (p. ej. REG-AB12CD34) a quien creó el espacio. Con
          eso vinculas tu cuenta al mismo registro;{" "}
          <strong>no necesitas permisos extra en Drive</strong> para usar el
          panel (la app usa la cuenta de servicio).
        </p>
        {saEmail ? (
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            Si en el futuro enlazas una carpeta tuya manualmente, compártela con:{" "}
            <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
              {saEmail}
            </code>{" "}
            como Editor.
          </p>
        ) : null}
        <form action={joinWorkspaceAction} className="mt-4 flex flex-col gap-3">
          <input type="hidden" name="next" value={next} />
          <input
            name="code"
            placeholder="REG-XXXXXXXX"
            autoComplete="off"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
          />
          <button
            type="submit"
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-600"
          >
            Unirme
          </button>
        </form>
      </section>

      <p className="mt-10 text-center text-sm">
        <Link href="/" className="text-zinc-600 underline dark:text-zinc-400">
          Volver al inicio
        </Link>
      </p>
    </div>
  );
}
