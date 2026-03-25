import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function EspacioExitoPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const { c } = await searchParams;
  const code = c?.trim() ?? "";

  return (
    <div className="min-h-full bg-gradient-to-b from-slate-50 via-white to-slate-100/80 px-4 py-12 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900">
      <div className="mx-auto max-w-lg text-center">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-8 shadow-sm ring-1 ring-slate-900/5 dark:border-zinc-800 dark:bg-zinc-900/80 dark:ring-white/5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-zinc-500">
            Listo
          </p>
          <h1 className="mt-2 text-xl font-semibold tracking-tight text-slate-900 dark:text-zinc-50">
            Espacio creado
          </h1>
          {code ? (
            <p className="mt-4 text-sm text-slate-600 dark:text-zinc-400">
              Código para invitar a otros (guárdalo en un lugar seguro):
            </p>
          ) : null}
          {code ? (
            <p className="mt-3 rounded-xl bg-slate-50 px-4 py-3 font-mono text-lg font-semibold tracking-wide text-slate-900 dark:bg-zinc-800/80 dark:text-zinc-100">
              {code}
            </p>
          ) : (
            <p className="mt-4 text-sm text-slate-600 dark:text-zinc-400">
              Ya puedes usar el panel.
            </p>
          )}
          <div className="mt-8 flex flex-col gap-3">
            <Link
              href="/visitas"
              className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            >
              Ir al panel oficial
            </Link>
            <Link
              href="/"
              className="text-sm font-medium text-slate-600 underline-offset-4 hover:underline dark:text-zinc-400"
            >
              Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
