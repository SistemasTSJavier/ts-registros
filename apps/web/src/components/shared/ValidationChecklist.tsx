import { useState } from 'react'
import { CheckCircle, XCircle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { ValidationItem } from '@/lib/schemas'
import { cn } from '@/lib/utils'

interface ValidationChecklistProps {
  items: ValidationItem[]
  onApprove: (id: string) => void
  onReject: (id: string, reason: string) => void
  readOnly?: boolean
  canApprove?: boolean
  canDelete?: boolean
}

export function ValidationChecklist({
  items,
  onApprove,
  onReject,
  readOnly,
  canApprove = true,
  canDelete = true,
}: ValidationChecklistProps) {
  const approved = items.filter((i) => i.status === 'approved').length
  const total = items.length
  const progress = total > 0 ? Math.round((approved / total) * 100) : 0

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-1 flex justify-between text-sm">
          <span className="text-slate-600">Progreso de validación</span>
          <span className="font-medium">{approved}/{total} ({progress}%)</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id} className={cn('rounded-lg border p-4', item.status === 'rejected' && 'border-red-200 bg-red-50')}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                {item.status === 'approved' && <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />}
                {item.status === 'rejected' && <XCircle className="h-5 w-5 text-red-600 shrink-0" />}
                {item.status === 'pending' && <Clock className="h-5 w-5 text-amber-500 shrink-0" />}
                <div>
                  <p className="text-sm font-medium text-slate-900">{item.label}</p>
                  <p className="text-xs text-slate-500 capitalize">{item.category}</p>
                  {item.rejectionReason && (
                    <p className="mt-1 text-sm text-red-600">Motivo: {item.rejectionReason}</p>
                  )}
                </div>
              </div>
              {!readOnly && item.status === 'pending' && (
                <div className="flex shrink-0 gap-2">
                  {canApprove && (
                    <Button size="sm" variant="success" onClick={() => onApprove(item.id)}>
                      Aprobar
                    </Button>
                  )}
                  {canDelete && <RejectButton onReject={(reason) => onReject(item.id, reason)} />}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function RejectButton({ onReject }: { onReject: (reason: string) => void }) {
  const [show, setShow] = useState(false)
  const [reason, setReason] = useState('')

  if (!show) {
    return (
      <Button size="sm" variant="destructive" onClick={() => setShow(true)}>
        Rechazar
      </Button>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <Input
        placeholder="Motivo del rechazo"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="w-48"
      />
      <Button
        size="sm"
        variant="destructive"
        disabled={!reason.trim()}
        onClick={() => {
          onReject(reason)
          setShow(false)
        }}
      >
        Confirmar
      </Button>
    </div>
  )
}
