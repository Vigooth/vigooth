import { useState, useCallback, ReactNode } from 'react'
import { AuthContext, AuthState, User, getInitialAuthState } from './auth'
import { clearEncryptedVaultCache } from '@/lib/storage/encryptedVault'
import { logout as apiLogout } from '@/lib/api/client'

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>(getInitialAuthState)

  const login = useCallback((user: User) => {
    localStorage.setItem('user', JSON.stringify(user))
    setState(prev => ({
      ...prev,
      user,
      isAuthenticated: true,
      totpPending: false,
    }))
  }, [])

  const logout = useCallback(() => {
    apiLogout().catch(() => {})
    localStorage.removeItem('user')
    clearEncryptedVaultCache()
    setState({
      user: null,
      isAuthenticated: false,
      masterPassword: null,
      totpPending: false,
    })
  }, [])

  const setTotpPending = useCallback((pending: boolean) => {
    setState(prev => ({
      ...prev,
      totpPending: pending,
    }))
  }, [])

  const setMasterPassword = useCallback((password: string) => {
    setState(prev => ({
      ...prev,
      masterPassword: password,
    }))
  }, [])

  const clearMasterPassword = useCallback(() => {
    setState(prev => ({
      ...prev,
      masterPassword: null,
    }))
  }, [])

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        setMasterPassword,
        clearMasterPassword,
        setTotpPending,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
