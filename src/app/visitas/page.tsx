import Link from "next/link";

const cardClass =
  "group block rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm ring-1 ring-slate-900/5 transition hover:border-slate-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/80 dark:ring-white/5 dark:hover:border-zinc-600";

export default function VisitasIndexPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-zinc-50">
        Resumen
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-zinc-400">
        Verificación de identidad en sitio y seguimiento de entradas sin cita.
      </p>
      <ul className="mt-8 flex flex-col gap-4">
        <li>
          <Link href="/visitas/programadas" className={cardClass}>
            <span className="font-semibold text-slate-900 dark:text-zinc-50">
              Visitas programadas
            </span>
            <p className="mt-2 text-sm text-slate-600 dark:text-zinc-400">
              Lista por fechas, acciones de ingreso y PDF por registro.
            </p>
            <span className="mt-4 inline-flex text-sm font-medium text-slate-700 group-hover:text-slate-900 dark:text-zinc-400 dark:group-hover:text-zinc-200">
              Abrir →
            </span>
          </Link>
        </li>
        <li>
          <Link href="/visitas/sin-programacion" className={cardClass}>
            <span className="font-semibold text-slate-900 dark:text-zinc-50">
              Entradas sin programación
            </span>
            <p className="mt-2 text-sm text-slate-600 dark:text-zinc-400">
              Historial y estado de aprobación por correo.
            </p>
            <span className="mt-4 inline-flex text-sm font-medium text-slate-700 group-hover:text-slate-900 dark:text-zinc-400 dark:group-hover:text-zinc-200">
              Abrir →
            </span>
          </Link>
        </li>
      </ul>
    </div>
  );
}
