import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '../stores/AuthProvider'
import { useAuth } from '../stores/auth'
import { QueryProvider } from './providers'
import { LoginPage } from './pages/LoginPage'
import { UnlockPage } from './pages/UnlockPage'
import { VaultPage } from './pages/VaultPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, masterPassword } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (!masterPassword) {
    return <Navigate to="/unlock" replace />
  }

  return <>{children}</>
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()

  if (isAuthenticated) {
    return <Navigate to="/unlock" replace />
  }

  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <AuthRoute>
            <LoginPage />
          </AuthRoute>
        }
      />
      <Route path="/unlock" element={<UnlockPage />} />
      <Route
        path="/vault"
        element={
          <ProtectedRoute>
            <VaultPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export function App() {
  return (
    <QueryProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </QueryProvider>
  )
}
