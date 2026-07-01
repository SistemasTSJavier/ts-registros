import { QRCodeSVG } from 'qrcode.react'
import { Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'

interface QRDisplayProps {
  qrPayload: string
  manualCode: string
  validFrom: string
  validUntil: string
}

export function QRDisplay({ qrPayload, manualCode, validFrom, validUntil }: QRDisplayProps) {
  const [copied, setCopied] = useState(false)

  const copyCode = async () => {
    await navigator.clipboard.writeText(manualCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card className="mx-auto max-w-md border-indigo-200">
      <CardContent className="flex flex-col items-center p-8 text-center">
        <p className="mb-4 text-sm font-medium text-slate-600">Presenta este código en el acceso de planta</p>
        <div className="rounded-xl bg-white p-4 shadow-inner" style={{ maxWidth: '90vw' }}>
          <QRCodeSVG value={qrPayload} size={Math.min(256, window.innerWidth * 0.7)} level="H" />
        </div>
        <div className="mt-6 w-full">
          <p className="text-xs uppercase tracking-wide text-slate-500">Código manual</p>
          <div className="mt-2 flex items-center justify-center gap-2">
            <span className="font-mono text-3xl font-bold tracking-widest text-indigo-700">{manualCode}</span>
            <Button variant="ghost" size="icon" onClick={copyCode} aria-label="Copiar código">
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <p className="mt-4 text-xs text-slate-500">
          Válido desde {formatDate(validFrom)} hasta {formatDate(validUntil)}
        </p>
      </CardContent>
    </Card>
  )
}
