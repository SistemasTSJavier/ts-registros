import { notFound } from "next/navigation";

import { WalkInDecisionButtons } from "@/components/walk-in-decision-buttons";
import { getWalkInByToken } from "@/lib/sheets-visits";

const statusLabel: Record<string, string> = {
  AWAITING_APPROVAL: "Pendiente",
  APPROVED: "Aprobada",
  DENIED: "Denegada",
};

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
    <div className="min-h-full flex-1 bg-zinc-50 px-4 py-16 dark:bg-zinc-950">
      <div className="mx-auto max-w-lg rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-center text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Decisión de entrada
        </h1>
        <p className="mt-2 text-center text-sm text-zinc-500 dark:text-zinc-400">
          Estado: {statusLabel[visit.status] ?? visit.status}
        </p>

        <dl className="mt-8 space-y-3 text-sm">
          <div>
            <dt className="text-xs text-zinc-500">Token</dt>
            <dd className="font-mono text-zinc-800 dark:text-zinc-200">
              {token}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">ID registro</dt>
            <dd className="font-mono text-zinc-800 dark:text-zinc-200">
              {visit.recordId}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Persona</dt>
            <dd className="font-medium text-zinc-900 dark:text-zinc-50">
              {visit.visitorFullName}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Empresa</dt>
            <dd>{visit.visitorCompany}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Motivo</dt>
            <dd>{visit.reason}</dd>
          </div>
          {visit.curpOrId ? (
            <div>
              <dt className="text-xs text-zinc-500">CURP / ID</dt>
              <dd className="font-mono">{visit.curpOrId}</dd>
            </div>
          ) : null}
        </dl>

        {visit.status === "AWAITING_APPROVAL" ? (
          <div className="mt-10">
            <WalkInDecisionButtons token={token} />
          </div>
        ) : (
          <p className="mt-10 text-center text-sm text-zinc-600 dark:text-zinc-400">
            Esta solicitud ya fue resuelta.
          </p>
        )}

        <div className="mt-6 border-t border-zinc-100 pt-6 dark:border-zinc-800">
          <a
            href={`/api/visitas/walk-in/pdf/${encodeURIComponent(token)}`}
            className="inline-flex rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            Generar PDF del registro
          </a>
        </div>
      </div>
    </div>
  );
}
