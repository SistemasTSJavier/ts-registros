import { notFound } from "next/navigation";

import { WalkInDecisionButtons } from "@/components/walk-in-decision-buttons";
import { getWalkInByToken } from "@/lib/sheets-visits";

const statusLabel: Record<string, string> = {
  AWAITING_APPROVAL: "Pendiente",
  APPROVED: "Aprobada",
  DENIED: "Denegada",
};

const pdfBtn =
  "inline-flex rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white";

export default async function AprobarEntradaPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token: raw } = await params;
  const token = decodeURIComponent(raw);

  const visit = await getWalkInByToken(token);

  if (!visit) notFound();

  return (
    <div className="min-h-full flex-1 bg-gradient-to-b from-slate-50 via-white to-slate-100/80 px-4 py-12 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900">
      <div className="mx-auto max-w-lg">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-8 shadow-sm ring-1 ring-slate-900/5 dark:border-zinc-800 dark:bg-zinc-900/80 dark:ring-white/5">
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-zinc-500">
            Entrada sin cita
          </p>
          <h1 className="mt-2 text-center text-xl font-semibold tracking-tight text-slate-900 dark:text-zinc-50">
            Decisión de entrada
          </h1>
          <p className="mt-2 text-center text-sm text-slate-600 dark:text-zinc-400">
            Estado:{" "}
            <span className="font-medium text-slate-900 dark:text-zinc-100">
              {statusLabel[visit.status] ?? visit.status}
            </span>
          </p>

          <dl className="mt-8 space-y-4 text-sm">
            <div className="rounded-xl bg-slate-50/80 px-4 py-3 dark:bg-zinc-800/50">
              <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-zinc-500">
                Token
              </dt>
              <dd className="mt-1 break-all font-mono text-xs text-slate-800 dark:text-zinc-200">
                {token}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-zinc-500">
                ID registro
              </dt>
              <dd className="mt-1 font-mono text-slate-800 dark:text-zinc-200">
                {visit.recordId}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-zinc-500">
                Persona
              </dt>
              <dd className="mt-1 font-semibold text-slate-900 dark:text-zinc-50">
                {visit.visitorFullName}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-zinc-500">
                Empresa
              </dt>
              <dd className="mt-1 text-slate-700 dark:text-zinc-300">
                {visit.visitorCompany}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-zinc-500">
                Motivo
              </dt>
              <dd className="mt-1 text-slate-700 dark:text-zinc-300">
                {visit.reason}
              </dd>
            </div>
            {visit.curpOrId ? (
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-zinc-500">
                  CURP / ID
                </dt>
                <dd className="mt-1 font-mono text-slate-800 dark:text-zinc-200">
                  {visit.curpOrId}
                </dd>
              </div>
            ) : null}
          </dl>

          {visit.status === "AWAITING_APPROVAL" ? (
            <div className="mt-10">
              <WalkInDecisionButtons token={token} />
            </div>
          ) : (
            <p className="mt-10 text-center text-sm text-slate-600 dark:text-zinc-400">
              Esta solicitud ya fue resuelta.
            </p>
          )}

          <div className="mt-8 border-t border-slate-100 pt-8 dark:border-zinc-800">
            <a
              href={`/api/visitas/walk-in/pdf/${encodeURIComponent(token)}`}
              className={pdfBtn}
            >
              Generar PDF del registro
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
