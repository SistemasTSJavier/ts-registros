"use client";

export default function EspacioError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-full bg-gradient-to-b from-slate-50 via-white to-slate-100/80 px-4 py-16 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900">
      <div className="mx-auto max-w-md text-center">
        <div className="rounded-2xl border border-red-200/90 bg-white p-8 shadow-sm ring-1 ring-red-900/5 dark:border-red-900/40 dark:bg-zinc-900/80 dark:ring-red-900/20">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-red-600 dark:text-red-400">
            Error
          </p>
          <p className="mt-3 text-sm leading-relaxed text-red-900 dark:text-red-100">
            {error.message}
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="mt-6 inline-flex rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            Reintentar
          </button>
        </div>
      </div>
    </div>
  );
}
