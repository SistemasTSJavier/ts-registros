import { Card, CardContent } from '@/components/ui/card'

interface StatCardProps {
  label: string
  value: number | string
  accent?: 'admin' | 'cliente' | 'portal' | 'default'
}

const accentClasses = {
  admin: 'border-l-4 border-l-blue-600',
  cliente: 'border-l-4 border-l-emerald-600',
  portal: 'border-l-4 border-l-indigo-600',
  default: 'border-l-4 border-l-slate-400',
}

export function StatCard({ label, value, accent = 'default' }: StatCardProps) {
  return (
    <Card className={accentClasses[accent]}>
      <CardContent className="p-4">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="mt-1 text-3xl font-bold text-slate-900">{value}</p>
      </CardContent>
    </Card>
  )
}
