import { ScheduledVisitActions } from "@/components/scheduled-visit-actions";
import { scheduledVisitListWindow } from "@/lib/visit-window";
import { listScheduledInWindow } from "@/lib/sheets-visits";

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

export default async function VisitasProgramadasPage() {
  const { start, end } = scheduledVisitListWindow();
  const visits = await listScheduledInWindow(start, end);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Visitas programadas
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Compara la identificación física con los datos registrados antes de permitir el
        ingreso.
      </p>

      {visits.length === 0 ? (
        <p className="mt-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
          No hay visitas en el rango mostrado.
        </p>
      ) : (
        <ul className="mt-8 flex flex-col gap-4">
          {visits.map((v) => (
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
                ID:{" "}
                <code className="font-mono text-zinc-800 dark:text-zinc-200">
                  {v.tokenOrId}
                </code>
              </div>
              <dl className="mt-3 grid gap-1 text-sm text-zinc-600 dark:text-zinc-400 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-zinc-500">Fecha</dt>
                  <dd>{fmtDate(new Date(`${v.visitDate}T12:00:00`))}</dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-500">Horario</dt>
                  <dd>
                    {v.visitStartTime} – {v.visitEndTime}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs text-zinc-500">Asunto</dt>
                  <dd>{v.subject || "-"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-500">Responsable</dt>
                  <dd>{v.responsible || "-"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-500">A quién visita</dt>
                  <dd>{v.visitTo || "-"}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs text-zinc-500">Motivo</dt>
                  <dd>{v.reason}</dd>
                </div>
                {v.identification ? (
                  <div className="sm:col-span-2">
                    <dt className="text-xs text-zinc-500">Identificación</dt>
                    <dd className="font-mono text-zinc-800 dark:text-zinc-200">
                      {v.identification}
                    </dd>
                  </div>
                ) : null}
                {v.companions ? (
                  <div className="sm:col-span-2">
                    <dt className="text-xs text-zinc-500">Acompañantes</dt>
                    <dd>{v.companions}</dd>
                  </div>
                ) : null}
                {v.checkInAt ? (
                  <div className="sm:col-span-2 text-xs">
                    Entrada: {v.checkInAt.toLocaleString("es-MX")}
                  </div>
                ) : null}
                {v.checkOutAt ? (
                  <div className="sm:col-span-2 text-xs">
                    Salida: {v.checkOutAt.toLocaleString("es-MX")}
                  </div>
                ) : null}
                {v.checkedInByEmail ? (
                  <div className="sm:col-span-2 text-xs">
                    Registró ingreso: {v.checkedInByEmail}
                  </div>
                ) : null}
              </dl>
              {v.status === "SCHEDULED" ? (
                <div className="mt-4 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                  <ScheduledVisitActions visitId={v.tokenOrId} />
                </div>
              ) : null}
              <div className="mt-4 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                <a
                  href={`/api/visitas/programadas/pdf/${encodeURIComponent(
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
