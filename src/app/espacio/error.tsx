"use client";

export default function EspacioError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-md px-4 py-12 text-center font-sans">
      <p className="text-sm font-medium text-red-800 dark:text-red-200">
        {error.message}
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-4 text-sm text-zinc-600 underline dark:text-zinc-400"
      >
        Reintentar
      </button>
    </div>
  );
}
