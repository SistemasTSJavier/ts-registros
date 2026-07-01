import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors', {
  variants: {
    variant: {
      default: 'border-transparent bg-slate-900 text-white',
      secondary: 'border-transparent bg-slate-100 text-slate-700',
      outline: 'text-slate-700',
      draft: 'border-slate-200 bg-slate-100 text-slate-600',
      invited: 'border-blue-200 bg-blue-50 text-blue-700',
      in_progress: 'border-amber-200 bg-amber-50 text-amber-700',
      pending_validation: 'border-orange-200 bg-orange-50 text-orange-700',
      approved: 'border-green-200 bg-green-50 text-green-700',
      rejected: 'border-red-200 bg-red-50 text-red-700',
      access_issued: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      expired: 'border-slate-200 bg-slate-50 text-slate-500',
      revoked: 'border-red-200 bg-red-50 text-red-700',
    },
  },
  defaultVariants: { variant: 'default' },
})

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}
