import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Tenant, User } from '@/lib/schemas'

interface AuthState {
  user: User | null
  tenant: Tenant | null
  accessToken: string | null
  setSession: (user: User, tenant: Tenant | null, accessToken: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      tenant: null,
      accessToken: null,
      setSession: (user, tenant, accessToken) => set({ user, tenant, accessToken }),
      logout: () => set({ user: null, tenant: null, accessToken: null }),
    }),
    { name: 'registros-auth' },
  ),
)
