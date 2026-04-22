import { createContext } from 'react'
import type { SteamUser } from '@/lib/auth'

export interface AuthContextValue {
  user: SteamUser | null
  isLoading: boolean
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  logout: async () => {},
})
