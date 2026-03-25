import Link from "next/link";

export default function RegistroLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-full flex-1 bg-zinc-50 px-4 py-10 dark:bg-zinc-950">
      <div className="mx-auto max-w-2xl">
        <nav className="mb-8 flex flex-wrap items-center gap-3 text-sm">
          <Link
            href="/"
            className="text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-400"
          >
            Inicio
          </Link>
          <span className="text-zinc-400">/</span>
          <Link
            href="/registro"
            className="text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-400"
          >
            Registros
          </Link>
        </nav>
        {children}
      </div>
    </div>
  );
}
