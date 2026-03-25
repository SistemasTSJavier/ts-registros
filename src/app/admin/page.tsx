import Link from "next/link";

const cardClass =
  "group block rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm ring-1 ring-slate-900/5 transition hover:border-slate-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/80 dark:ring-white/5 dark:hover:border-zinc-600";

export default function AdminIndexPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-zinc-50">
        Panel de administración
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-zinc-400">
        Accesos rápidos a registros y listados. La aprobación de entradas sin cita se hace
        desde el enlace del correo.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link href="/registro/programada" className={cardClass}>
          <div className="font-semibold text-slate-900 dark:text-zinc-50">
            Nueva programada
          </div>
          <div className="mt-2 text-sm text-slate-600 dark:text-zinc-400">
            Visita con fecha, horario y correos de notificación.
          </div>
          <span className="mt-4 inline-flex text-sm font-medium text-slate-700 group-hover:text-slate-900 dark:text-zinc-400 dark:group-hover:text-zinc-200">
            Abrir →
          </span>
        </Link>
        <Link href="/registro/sin-programacion" className={cardClass}>
          <div className="font-semibold text-slate-900 dark:text-zinc-50">
            Nueva sin programación
          </div>
          <div className="mt-2 text-sm text-slate-600 dark:text-zinc-400">
            Datos y correo para aprobar o denegar por token.
          </div>
          <span className="mt-4 inline-flex text-sm font-medium text-slate-700 group-hover:text-slate-900 dark:text-zinc-400 dark:group-hover:text-zinc-200">
            Abrir →
          </span>
        </Link>
        <Link href="/visitas/programadas" className={cardClass}>
          <div className="font-semibold text-slate-900 dark:text-zinc-50">
            Listado programadas
          </div>
          <div className="mt-2 text-sm text-slate-600 dark:text-zinc-400">
            PDF y check-in en sitio.
          </div>
          <span className="mt-4 inline-flex text-sm font-medium text-slate-700 group-hover:text-slate-900 dark:text-zinc-400 dark:group-hover:text-zinc-200">
            Abrir →
          </span>
        </Link>
        <Link href="/visitas/sin-programacion" className={cardClass}>
          <div className="font-semibold text-slate-900 dark:text-zinc-50">
            Listado sin cita
          </div>
          <div className="mt-2 text-sm text-slate-600 dark:text-zinc-400">
            Tokens, estado y PDF.
          </div>
          <span className="mt-4 inline-flex text-sm font-medium text-slate-700 group-hover:text-slate-900 dark:text-zinc-400 dark:group-hover:text-zinc-200">
            Abrir →
          </span>
        </Link>
      </div>
    </div>
  );
}
