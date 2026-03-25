import Link from "next/link";

export default function AdminIndexPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Admin
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Crea registros, revisa listados y descarga PDFs. La aprobación de entradas sin cita
        se realiza desde el enlace enviado por correo.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link
          href="/registro/programada"
          className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
        >
          <div className="font-medium text-zinc-900 dark:text-zinc-50">Nueva programada</div>
          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Registrar visita con fecha/horario y correos de notificación.
          </div>
        </Link>
        <Link
          href="/registro/sin-programacion"
          className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
        >
          <div className="font-medium text-zinc-900 dark:text-zinc-50">
            Nueva sin programación
          </div>
          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Captura datos y envía correo para aprobar/denegar por token.
          </div>
        </Link>
        <Link
          href="/visitas/programadas"
          className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
        >
          <div className="font-medium text-zinc-900 dark:text-zinc-50">Listado programadas</div>
          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Ver y descargar PDF; oficiales hacen check-in/deny en sitio.
          </div>
        </Link>
        <Link
          href="/visitas/sin-programacion"
          className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
        >
          <div className="font-medium text-zinc-900 dark:text-zinc-50">Listado sin cita</div>
          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Ver tokens/estado y descargar PDF.
          </div>
        </Link>
      </div>
    </div>
  );
}

