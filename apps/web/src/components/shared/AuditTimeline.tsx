import type { AuditLog } from '@/lib/schemas'
import { formatDate } from '@/lib/utils'

interface AuditTimelineProps {
  logs: AuditLog[]
}

const actionColors: Record<string, string> = {
  crear: 'bg-blue-100 text-blue-700',
  editar: 'bg-amber-100 text-amber-700',
  eliminar: 'bg-red-100 text-red-700',
  validar: 'bg-emerald-100 text-emerald-700',
  emitir_acceso: 'bg-indigo-100 text-indigo-700',
  invitar: 'bg-purple-100 text-purple-700',
  enviar_acceso: 'bg-indigo-100 text-indigo-700',
}

export function AuditTimeline({ logs }: AuditTimelineProps) {
  if (logs.length === 0) {
    return <p className="text-sm text-slate-500">No hay registros de actividad.</p>
  }

  return (
    <ol className="relative border-l border-slate-200 pl-6">
      {logs.map((log) => (
        <li key={log.id} className="mb-6 ml-2">
          <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-white bg-slate-400" />
          <div className="flex flex-wrap items-center gap-2">
            <time className="text-xs text-slate-500">{formatDate(log.createdAt)}</time>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${actionColors[log.action] ?? 'bg-slate-100 text-slate-600'}`}>
              {log.action}
            </span>
          </div>
          <p className="mt-1 text-sm font-medium text-slate-900">{log.detail}</p>
          <p className="text-xs text-slate-500">
            {log.actorName} · {log.entity} #{log.entityId.slice(0, 8)}
          </p>
        </li>
      ))}
    </ol>
  )
}
