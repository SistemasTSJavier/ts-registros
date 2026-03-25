import Link from "next/link";

import { listRecentWalkIn } from "@/lib/sheets-visits";

const statusLabel: Record<string, string> = {
  AWAITING_APPROVAL: "Esperando decisión por correo",
  APPROVED: "Aprobada",
  DENIED: "Denegada",
};

const cardClass =
  "rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm ring-1 ring-slate-900/5 dark:border-zinc-800 dark:bg-zinc-900/80 dark:ring-white/5";

const pdfBtn =
  "inline-flex rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white";

export default async function VisitasSinProgramacionPage() {
  const rows = await listRecentWalkIn(40);

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-zinc-50">
        Entradas sin programación
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-zinc-400">
        Historial reciente. La aprobación formal se hace desde el enlace del
        correo.
      </p>
      <div className="mt-6">
        <Link
          href="/registro/sin-programacion"
          className="inline-flex rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-600"
        >
          Registrar nueva entrada sin programación
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="mt-12 text-center text-sm text-slate-500 dark:text-zinc-400">
          Aún no hay registros.
        </p>
      ) : (
        <ul className="mt-8 flex flex-col gap-5">
          {rows.map((v) => (
            <li key={v.tokenOrId} className={cardClass}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-zinc-50">
                    {v.visitorFullName}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-zinc-400">
                    {v.visitorCompany}
                  </p>
                </div>
                <span className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-medium text-slate-800 dark:bg-zinc-800 dark:text-zinc-200">
                  {statusLabel[v.status] ?? v.status}
                </span>
              </div>
              <div className="mt-2 break-all text-xs text-slate-500 dark:text-zinc-500">
                <div>
                  Token:{" "}
                  <code className="font-mono text-slate-700 dark:text-zinc-300">
                    {v.tokenOrId}
                  </code>
                </div>
                <div className="mt-0.5">
                  ID:{" "}
                  <code className="font-mono text-slate-700 dark:text-zinc-300">
                    {v.recordId}
                  </code>
                </div>
              </div>
              <dl className="mt-4 space-y-2 text-sm text-slate-600 dark:text-zinc-400">
                <div>
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-zinc-500">
                    Motivo
                  </dt>
                  <dd>{v.reason}</dd>
                </div>
                {v.curpOrId ? (
                  <div>
                    <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-zinc-500">
                      CURP / ID
                    </dt>
                    <dd className="font-mono text-slate-800 dark:text-zinc-200">
                      {v.curpOrId}
                    </dd>
                  </div>
                ) : null}
                <div>
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-zinc-500">
                    Correo de aprobación
                  </dt>
                  <dd>{v.approvalEmail}</dd>
                </div>
                <div className="text-xs text-slate-500 dark:text-zinc-500">
                  Creado: {v.createdAt.toLocaleString("es-MX")}
                  {v.resolvedAt
                    ? ` · Resuelto: ${v.resolvedAt.toLocaleString("es-MX")}`
                    : null}
                </div>
              </dl>
              <div className="mt-5 border-t border-slate-100 pt-5 dark:border-zinc-800">
                <a
                  href={`/api/visitas/walk-in/pdf/${encodeURIComponent(
                    v.tokenOrId,
                  )}`}
                  className={pdfBtn}
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
