import { Plus, Trash2, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  PERMISSION_LABELS,
  PERMISSION_PRESETS,
  type TenantUserInput,
  type UserPermissions,
} from '@/lib/schemas/permissions'
import { cn } from '@/lib/utils'

interface TenantUsersEditorProps {
  users: TenantUserInput[]
  onChange: (users: TenantUserInput[]) => void
  errors?: string
}

const emptyUser = (): TenantUserInput => ({
  name: '',
  email: '',
  phone: '',
  permissions: { ...PERMISSION_PRESETS.operator.permissions },
  isPrimary: false,
})

export function TenantUsersEditor({ users, onChange, errors }: TenantUsersEditorProps) {
  const updateUser = (index: number, patch: Partial<TenantUserInput>) => {
    const next = users.map((u, i) => (i === index ? { ...u, ...patch } : u))
    onChange(next)
  }

  const updatePermission = (index: number, key: keyof UserPermissions, value: boolean) => {
    updateUser(index, {
      permissions: { ...users[index].permissions, [key]: value },
    })
  }

  const setPrimary = (index: number) => {
    onChange(users.map((u, i) => ({ ...u, isPrimary: i === index })))
  }

  const addUser = () => onChange([...users, emptyUser()])

  const removeUser = (index: number) => {
    if (users.length <= 1) return
    const next = users.filter((_, i) => i !== index)
    if (!next.some((u) => u.isPrimary)) next[0].isPrimary = true
    onChange(next)
  }

  const applyPreset = (index: number, presetKey: keyof typeof PERMISSION_PRESETS) => {
    updateUser(index, { permissions: { ...PERMISSION_PRESETS[presetKey].permissions } })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-slate-900">Usuarios del cliente</h3>
          <p className="text-sm text-slate-500">Añade uno o más usuarios con permisos personalizados</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addUser}>
          <Plus className="h-4 w-4" />
          Añadir usuario
        </Button>
      </div>

      {users.map((user, index) => (
        <Card key={index} className={cn(user.isPrimary && 'ring-2 ring-blue-200')}>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-slate-500" />
                <span className="text-sm font-medium">Usuario {index + 1}</span>
                {user.isPrimary && (
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                    Principal
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                {!user.isPrimary && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setPrimary(index)}>
                    Marcar principal
                  </Button>
                )}
                {users.length > 1 && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeUser(index)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
                  value={user.name}
                  onChange={(e) => updateUser(index, { name: e.target.value })}
                  placeholder="Nombre completo"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={user.email}
                  onChange={(e) => updateUser(index, { email: e.target.value })}
                  placeholder="correo@empresa.com"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Teléfono (opcional)</Label>
                <Input
                  value={user.phone ?? ''}
                  onChange={(e) => updateUser(index, { phone: e.target.value })}
                  placeholder="+52 ..."
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label>Permisos</Label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(PERMISSION_PRESETS).map(([key, preset]) => (
                  <Button
                    key={key}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyPreset(index, key as keyof typeof PERMISSION_PRESETS)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
              <div className="flex flex-wrap gap-4 rounded-lg border bg-slate-50 p-3">
                {(Object.keys(PERMISSION_LABELS) as (keyof UserPermissions)[]).map((key) => (
                  <label key={key} className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={user.permissions[key]}
                      onChange={(e) => updatePermission(index, key, e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    {PERMISSION_LABELS[key]}
                  </label>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {errors && <p className="text-sm text-red-600">{errors}</p>}
    </div>
  )
}

export function getDefaultTenantUsers(): TenantUserInput[] {
  return [{ ...emptyUser(), isPrimary: true }]
}
