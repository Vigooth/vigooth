import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryProvider } from './providers'
import { LibraryPage } from './pages/LibraryPage'
import { SetupPage } from './pages/SetupPage'
import { STEAM_API_KEY, STEAM_ID } from '@/config'

function AppRoutes() {
  const hasConfig = !!STEAM_API_KEY && !!STEAM_ID

  return (
    <Routes>
      <Route
        path="/library"
        element={hasConfig ? <LibraryPage /> : <Navigate to="/setup" replace />}
      />
      <Route path="/u/:steamId" element={<LibraryPage />} />
      <Route path="/setup" element={<SetupPage />} />
      <Route path="*" element={<Navigate to={hasConfig ? '/library' : '/setup'} replace />} />
    </Routes>
  )
}

export function App() {
  return (
    <QueryProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryProvider>
  )
}
