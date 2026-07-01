import { useCallback, useState } from 'react'
import { Upload, FileText, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface UploadedFile {
  name: string
  type: string
  fileName: string
  contentBase64?: string
}

interface FileUploadZoneProps {
  accept?: string
  label: string
  docType: string
  onUpload: (file: UploadedFile) => void | Promise<void>
  uploaded?: UploadedFile | null
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const base64 = result.includes(',') ? result.split(',')[1]! : result
      resolve(base64)
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export function FileUploadZone({ accept = '.pdf,.jpg,.jpeg,.png', label, docType, onUpload, uploaded }: FileUploadZoneProps) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)

  const handleFile = useCallback(
    async (file: File) => {
      setUploading(true)
      try {
        const contentBase64 = await readFileAsBase64(file)
        await onUpload({ name: label, type: docType, fileName: file.name, contentBase64 })
      } finally {
        setUploading(false)
      }
    },
    [docType, label, onUpload],
  )

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) void handleFile(file)
  }

  if (uploaded) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-emerald-600" />
          <div>
            <p className="text-sm font-medium text-slate-900">{uploaded.name}</p>
            <p className="text-xs text-slate-500">{uploaded.fileName}</p>
          </div>
        </div>
        <span className="text-xs font-medium text-emerald-700">Subido</span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'rounded-lg border-2 border-dashed p-6 text-center transition-colors',
        dragging ? 'border-indigo-400 bg-indigo-50' : 'border-slate-300 bg-slate-50',
      )}
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <Upload className="mx-auto h-8 w-8 text-slate-400" />
      <p className="mt-2 text-sm font-medium text-slate-700">{label}</p>
      <p className="mt-1 text-xs text-slate-500">Arrastra o selecciona un archivo</p>
      <label className="mt-3 inline-block">
        <input
          type="file"
          accept={accept}
          className="sr-only"
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void handleFile(file)
          }}
        />
        <Button type="button" variant="outline" size="sm" disabled={uploading}>
          <span>{uploading ? 'Subiendo…' : 'Seleccionar archivo'}</span>
        </Button>
      </label>
    </div>
  )
}

export function FileUploadList({
  files,
  onRemove,
}: {
  files: UploadedFile[]
  onRemove?: (index: number) => void
}) {
  return (
    <div className="space-y-2">
      {files.map((file, i) => (
        <div key={i} className="flex items-center justify-between rounded-md border p-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-slate-500" />
            <span className="text-sm">{file.fileName}</span>
          </div>
          {onRemove && (
            <button type="button" onClick={() => onRemove(i)} aria-label="Eliminar archivo">
              <X className="h-4 w-4 text-slate-400 hover:text-red-500" />
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
