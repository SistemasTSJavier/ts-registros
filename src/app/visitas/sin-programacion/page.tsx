import Link from "next/link";

import { listRecentWalkIn } from "@/lib/sheets-visits";

const statusLabel: Record<string, string> = {
  AWAITING_APPROVAL: "Esperando decisión por correo",
  APPROVED: "Aprobada",
  DENIED: "Denegada",
};

export default async function VisitasSinProgramacionPage() {
  const rows = await listRecentWalkIn(40);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Entradas sin programación
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Historial reciente. La aprobación formal se hace desde el enlace del correo.
      </p>
      <div className="mt-6">
        <Link
          href="/registro/sin-programacion"
          className="inline-flex rounded-full border border-zinc-300 px-4 py-2 text-xs font-medium text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          Registrar nueva entrada sin programación
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="mt-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
          Aún no hay registros.
        </p>
      ) : (
        <ul className="mt-8 flex flex-col gap-4">
          {rows.map((v) => (
            <li
              key={v.tokenOrId}
              className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">
                    {v.visitorFullName}
                  </p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {v.visitorCompany}
                  </p>
                </div>
                <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  {statusLabel[v.status] ?? v.status}
                </span>
              </div>
              <div className="mt-2 break-all text-xs text-zinc-600 dark:text-zinc-400">
                <div>
                  Token:{" "}
                  <code className="font-mono text-zinc-800 dark:text-zinc-200">
                    {v.tokenOrId}
                  </code>
                </div>
                <div className="mt-0.5">
                  ID:{" "}
                  <code className="font-mono text-zinc-800 dark:text-zinc-200">
                    {v.recordId}
                  </code>
                </div>
              </div>
              <dl className="mt-3 space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                <div>
                  <dt className="text-xs text-zinc-500">Motivo</dt>
                  <dd>{v.reason}</dd>
                </div>
                {v.curpOrId ? (
                  <div>
                    <dt className="text-xs text-zinc-500">CURP / ID</dt>
                    <dd className="font-mono">{v.curpOrId}</dd>
                  </div>
                ) : null}
                <div>
                  <dt className="text-xs text-zinc-500">Correo de aprobación</dt>
                  <dd>{v.approvalEmail}</dd>
                </div>
                <div className="text-xs text-zinc-500">
                  Creado: {v.createdAt.toLocaleString("es-MX")}
                  {v.resolvedAt
                    ? ` · Resuelto: ${v.resolvedAt.toLocaleString("es-MX")}`
                    : null}
                </div>
              </dl>
              <div className="mt-4 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                <a
                  href={`/api/visitas/walk-in/pdf/${encodeURIComponent(
                    v.tokenOrId,
                  )}`}
                  className="inline-flex rounded-full bg-zinc-900 px-4 py-2 text-xs font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
                >
                  Generar PDF
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
