import { Plus, Trash2 } from 'lucide-react'
import type { RegistrationPersonInput } from '@/lib/schemas'
import { validatePerson } from '@/lib/registration/validate-person'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const EMPTY_PERSON: RegistrationPersonInput = {
  nombreCompleto: '',
  telefono: '',
  curp: '',
  email: '',
  puesto: '',
}

interface PersonsEditorProps {
  value: RegistrationPersonInput[]
  onChange: (persons: RegistrationPersonInput[]) => void
  showErrors?: boolean
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-red-600">{message}</p>
}

export function PersonsEditor({ value, onChange, showErrors = false }: PersonsEditorProps) {
  const updatePerson = (index: number, field: keyof RegistrationPersonInput, fieldValue: string) => {
    const next = [...value]
    next[index] = { ...next[index], [field]: fieldValue }
    onChange(next)
  }

  const addPerson = () => onChange([...value, { ...EMPTY_PERSON }])

  const removePerson = (index: number) => {
    if (value.length <= 1) return
    onChange(value.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-4">
      {value.map((person, index) => {
        const errors = showErrors ? validatePerson(person) : {}
        const curpHint =
          person.curp.length > 0 && person.curp.length !== 18
            ? `${person.curp.length}/18 caracteres`
            : person.curp.length === 18
              ? '18/18 ✓'
              : '18 caracteres'

        return (
          <Card key={index} className={showErrors && Object.keys(errors).length > 0 ? 'border-red-200' : undefined}>
            <CardHeader className="flex flex-row items-center justify-between py-4">
              <CardTitle className="text-base">Persona {index + 1}</CardTitle>
              {value.length > 1 && (
                <Button type="button" variant="ghost" size="sm" onClick={() => removePerson(index)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Nombre completo</Label>
                <Input
                  value={person.nombreCompleto}
                  onChange={(e) => updatePerson(index, 'nombreCompleto', e.target.value)}
                  className={cn(errors.nombreCompleto && 'border-red-400')}
                  required
                />
                <FieldError message={errors.nombreCompleto} />
              </div>
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input
                  type="tel"
                  value={person.telefono}
                  onChange={(e) => updatePerson(index, 'telefono', e.target.value)}
                  className={cn(errors.telefono && 'border-red-400')}
                  required
                />
                <FieldError message={errors.telefono} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>CURP</Label>
                  <span
                    className={cn(
                      'text-xs',
                      person.curp.length === 18 ? 'text-emerald-600' : 'text-slate-400',
                    )}
                  >
                    {curpHint}
                  </span>
                </div>
                <Input
                  value={person.curp}
                  onChange={(e) =>
                    updatePerson(index, 'curp', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))
                  }
                  maxLength={18}
                  placeholder="18 caracteres, ej. XXXX000000HDFXXX00"
                  className={cn(errors.curp && 'border-red-400')}
                  required
                />
                <FieldError message={errors.curp} />
              </div>
              <div className="space-y-2">
                <Label>Correo electrónico</Label>
                <Input
                  type="email"
                  value={person.email}
                  onChange={(e) => updatePerson(index, 'email', e.target.value)}
                  className={cn(errors.email && 'border-red-400')}
                  required
                />
                <FieldError message={errors.email} />
              </div>
              <div className="space-y-2">
                <Label>Puesto</Label>
                <Input
                  value={person.puesto}
                  onChange={(e) => updatePerson(index, 'puesto', e.target.value)}
                  className={cn(errors.puesto && 'border-red-400')}
                  required
                />
                <FieldError message={errors.puesto} />
              </div>
            </CardContent>
          </Card>
        )
      })}
      <Button type="button" variant="outline" onClick={addPerson}>
        <Plus className="mr-2 h-4 w-4" />
        Agregar otra persona
      </Button>
    </div>
  )
}
