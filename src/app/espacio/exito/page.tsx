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
    <div className="mx-auto min-h-full max-w-lg px-4 py-12 font-sans text-center">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        Espacio creado
      </h1>
      {code ? (
        <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
          Código para invitar a otros oficiales (guárdalo):
        </p>
      ) : null}
      {code ? (
        <p className="mt-2 font-mono text-lg font-semibold tracking-wide text-zinc-900 dark:text-zinc-100">
          {code}
        </p>
      ) : (
        <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
          Ya puedes usar el panel.
        </p>
      )}
      <div className="mt-8 flex flex-col gap-3 text-sm">
        <Link
          href="/visitas"
          className="rounded-full bg-zinc-900 px-4 py-3 font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Ir al panel oficial
        </Link>
        <Link href="/" className="text-zinc-600 underline dark:text-zinc-400">
          Inicio
        </Link>
      </div>
    </div>
  );
}
