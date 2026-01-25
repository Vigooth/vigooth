import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { HomePage } from './pages/HomePage'
import { UnlockPage } from './pages/UnlockPage'
import { VaultPage } from './pages/VaultPage'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<UnlockPage />} />
        <Route path="/vault" element={<VaultPage />} />
        <Route path="*" element={<HomePage />} />
      </Routes>
    </BrowserRouter>
  )
}
