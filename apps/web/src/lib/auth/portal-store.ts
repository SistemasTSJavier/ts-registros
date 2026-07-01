import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface PortalState {
  token: string | null
  registrationId: string | null
  personId: string | null
  setPortalSession: (token: string, registrationId: string, personId?: string | null) => void
  clearPortalSession: () => void
}

export const usePortalStore = create<PortalState>()(
  persist(
    (set) => ({
      token: null,
      registrationId: null,
      personId: null,
      setPortalSession: (token, registrationId, personId = null) =>
        set({ token, registrationId, personId }),
      clearPortalSession: () => set({ token: null, registrationId: null, personId: null }),
    }),
    { name: 'registros-portal' },
  ),
)
