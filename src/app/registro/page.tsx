import Link from "next/link";

export default function RegistroIndexPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Formas de registro
      </h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Elige el tipo de registro que corresponda.
      </p>
      <ul className="mt-8 flex flex-col gap-4">
        <li>
          <Link
            href="/registro/programada"
            className="block rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
          >
            <span className="font-medium text-zinc-900 dark:text-zinc-50">
              Programación de visita
            </span>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Datos, horario y correos de aviso. El oficial verifica identificación al llegar.
            </p>
          </Link>
        </li>
        <li>
          <Link
            href="/registro/sin-programacion"
            className="block rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
          >
            <span className="font-medium text-zinc-900 dark:text-zinc-50">
              Entrada sin programación
            </span>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Foto de INE para ayudar a capturar datos; correo para aprobar o denegar.
            </p>
          </Link>
        </li>
      </ul>
    </div>
  );
}
