import { useState, useCallback, ReactNode } from 'react'
import { AuthContext, AuthState, User, getInitialAuthState } from './auth'
import { clearEncryptedVaultCache } from '@/lib/storage/encryptedVault'

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>(getInitialAuthState)

  const login = useCallback((token: string, user: User) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    setState(prev => ({
      ...prev,
      token,
      user,
      isAuthenticated: true,
    }))
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    // Clear encrypted vault cache on logout
    clearEncryptedVaultCache()
    setState({
      user: null,
      token: null,
      isAuthenticated: false,
      masterPassword: null,
    })
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
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
