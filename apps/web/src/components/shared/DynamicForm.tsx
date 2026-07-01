import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { FieldSchema } from '@/lib/schemas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

interface DynamicFormProps {
  schema: FieldSchema
  defaultValues?: Record<string, string>
  onSubmit: (data: Record<string, string>) => void
  submitLabel?: string
  isLoading?: boolean
}

function buildZodSchema(schema: FieldSchema) {
  const shape: Record<string, z.ZodTypeAny> = {}
  for (const field of schema.fields) {
    let validator: z.ZodTypeAny = z.string()
    if (field.type === 'email') validator = z.string().email('Email inválido')
    if (field.validation?.minLength) validator = (validator as z.ZodString).min(field.validation.minLength)
    if (!field.required) {
      shape[field.name] = validator.optional().or(z.literal(''))
    } else {
      shape[field.name] = (validator as z.ZodString).min(1, `${field.label} es requerido`)
    }
  }
  return z.object(shape)
}

export function DynamicForm({
  schema,
  defaultValues,
  onSubmit,
  submitLabel = 'Guardar',
  isLoading,
}: DynamicFormProps) {
  const zodSchema = buildZodSchema(schema)
  const form = useForm<Record<string, string>>({
    resolver: zodResolver(zodSchema) as never,
    defaultValues,
  })
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = form

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {schema.fields.map((field) => (
        <div key={field.name} className="space-y-2">
          <Label htmlFor={field.name}>
            {field.label}
            {field.required && <span className="text-red-500"> *</span>}
          </Label>
          {field.type === 'textarea' ? (
            <Textarea id={field.name} {...register(field.name)} aria-describedby={`${field.name}-error`} />
          ) : field.type === 'select' ? (
            <Select id={field.name} {...register(field.name)} aria-describedby={`${field.name}-error`}>
              <option value="">Seleccionar...</option>
              {field.options?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          ) : (
            <Input
              id={field.name}
              type={field.type === 'date' ? 'date' : field.type === 'tel' ? 'tel' : field.type === 'email' ? 'email' : 'text'}
              {...register(field.name)}
              aria-describedby={`${field.name}-error`}
            />
          )}
          {errors[field.name] && (
            <p id={`${field.name}-error`} className="text-sm text-red-600" role="alert">
              {errors[field.name]?.message as string}
            </p>
          )}
        </div>
      ))}
      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Guardando...' : submitLabel}
      </Button>
    </form>
  )
}
