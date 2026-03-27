import Link from "next/link";

import { auth } from "@/auth";
import { getUserEmail, isAdminEmail } from "@/lib/access";
import { ScheduledVisitActions } from "@/components/scheduled-visit-actions";
import { scheduledVisitListWindow } from "@/lib/visit-window";
import { listScheduledInWindow } from "@/lib/sheets-visits";
import { getResolvedWorkspaceForUserEmail } from "@/lib/workspace-resolver";

function fmtDate(d: Date) {
  return d.toLocaleDateString("es-MX", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const statusLabel: Record<string, string> = {
  SCHEDULED: "Pendiente de ingreso",
  CHECKED_IN: "Ingresó",
  CHECKED_OUT: "Salida registrada",
  DENIED: "Denegada",
};

const cardClass =
  "rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm ring-1 ring-slate-900/5 dark:border-zinc-800 dark:bg-zinc-900/80 dark:ring-white/5";

const pdfBtn =
  "inline-flex rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white";

export default async function VisitasProgramadasPage() {
  const session = await auth();
  const email = getUserEmail(session);
  const ws = email ? await getResolvedWorkspaceForUserEmail(email) : null;
  const canAdmin = await isAdminEmail(email, ws?.workspaceId);

  const { start, end } = scheduledVisitListWindow();
  const visits = await listScheduledInWindow(start, end);

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-zinc-50">
        Visitas programadas
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-zinc-400">
        Compara la identificación física con los datos registrados antes de
        permitir el ingreso.
      </p>
      {canAdmin ? (
        <div className="mt-6">
          <Link
            href="/registro/programada"
            className="inline-flex rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-600"
          >
            Registrar visita programada
          </Link>
        </div>
      ) : null}

      {visits.length === 0 ? (
        <p className="mt-12 text-center text-sm text-slate-500 dark:text-zinc-400">
          No hay visitas en el rango mostrado.
        </p>
      ) : (
        <ul className="mt-8 flex flex-col gap-5">
          {visits.map((v) => (
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
                ID:{" "}
                <code className="font-mono text-slate-700 dark:text-zinc-300">
                  {v.tokenOrId}
                </code>
              </div>
              <dl className="mt-4 grid gap-2 text-sm text-slate-600 dark:text-zinc-400 sm:grid-cols-2">
                <div>
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-zinc-500">
                    Fecha
                  </dt>
                  <dd>{fmtDate(new Date(`${v.visitDate}T12:00:00`))}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-zinc-500">
                    Horario
                  </dt>
                  <dd>
                    {v.visitStartTime} – {v.visitEndTime}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-zinc-500">
                    Asunto
                  </dt>
                  <dd>{v.subject || "—"}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-zinc-500">
                    Responsable
                  </dt>
                  <dd>{v.responsible || "—"}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-zinc-500">
                    A quién visita
                  </dt>
                  <dd>{v.visitTo || "—"}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-zinc-500">
                    Motivo
                  </dt>
                  <dd>{v.reason}</dd>
                </div>
                {v.identification ? (
                  <div className="sm:col-span-2">
                    <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-zinc-500">
                      Identificación
                    </dt>
                    <dd className="font-mono text-slate-800 dark:text-zinc-200">
                      {v.identification}
                    </dd>
                  </div>
                ) : null}
                {v.companions ? (
                  <div className="sm:col-span-2">
                    <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-zinc-500">
                      Acompañantes
                    </dt>
                    <dd>{v.companions}</dd>
                  </div>
                ) : null}
                {v.checkInAt ? (
                  <div className="sm:col-span-2 text-xs text-slate-500 dark:text-zinc-500">
                    Entrada: {v.checkInAt.toLocaleString("es-MX")}
                  </div>
                ) : null}
                {v.checkOutAt ? (
                  <div className="sm:col-span-2 text-xs text-slate-500 dark:text-zinc-500">
                    Salida: {v.checkOutAt.toLocaleString("es-MX")}
                  </div>
                ) : null}
                {v.checkedInByEmail ? (
                  <div className="sm:col-span-2 text-xs text-slate-500 dark:text-zinc-500">
                    Registró ingreso: {v.checkedInByEmail}
                  </div>
                ) : null}
              </dl>
              {v.status === "SCHEDULED" ? (
                <div className="mt-5 border-t border-slate-100 pt-5 dark:border-zinc-800">
                  <ScheduledVisitActions visitId={v.tokenOrId} />
                </div>
              ) : null}
              <div className="mt-5 border-t border-slate-100 pt-5 dark:border-zinc-800">
                <a
                  href={`/api/visitas/programadas/pdf/${encodeURIComponent(
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
