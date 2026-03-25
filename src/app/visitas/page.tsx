import Link from "next/link";

export default function VisitasIndexPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Visitas
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Revisa visitas programadas (verificación de identidad en sitio) o entradas sin cita
        (estado de aprobación por correo).
      </p>
      <ul className="mt-8 flex flex-col gap-3">
        <li>
          <Link
            className="block rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm font-medium shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
            href="/visitas/programadas"
          >
            Visitas programadas
          </Link>
        </li>
        <li>
          <Link
            className="block rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm font-medium shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
            href="/visitas/sin-programacion"
          >
            Entradas sin programación
          </Link>
        </li>
      </ul>
    </div>
  );
}
