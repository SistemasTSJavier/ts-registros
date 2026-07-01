import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Step {
  id: string
  label: string
}

interface StepperProps {
  steps: Step[]
  currentStep: number
  variant?: 'portal' | 'default'
}

export function Stepper({ steps, currentStep, variant = 'default' }: StepperProps) {
  const accent = variant === 'portal' ? 'bg-indigo-600' : 'bg-slate-900'

  return (
    <nav aria-label="Progreso" className="w-full">
      <ol className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isComplete = index < currentStep
          const isCurrent = index === currentStep
          return (
            <li key={step.id} className="flex flex-1 flex-col items-center">
              <div className="flex w-full items-center">
                {index > 0 && (
                  <div className={cn('h-0.5 flex-1', isComplete || isCurrent ? accent : 'bg-slate-200')} />
                )}
                <div
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                    isComplete && `${accent} text-white`,
                    isCurrent && `ring-2 ring-offset-2 ${variant === 'portal' ? 'bg-indigo-600 text-white ring-indigo-600' : 'bg-slate-900 text-white ring-slate-900'}`,
                    !isComplete && !isCurrent && 'bg-slate-200 text-slate-500',
                  )}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {isComplete ? <Check className="h-4 w-4" /> : index + 1}
                </div>
                {index < steps.length - 1 && (
                  <div className={cn('h-0.5 flex-1', isComplete ? accent : 'bg-slate-200')} />
                )}
              </div>
              <span className={cn('mt-2 hidden text-center text-xs sm:block', isCurrent ? 'font-medium text-slate-900' : 'text-slate-500')}>
                {step.label}
              </span>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
