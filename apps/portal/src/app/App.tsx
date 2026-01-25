import { Routes, Route } from 'react-router-dom'
import { HomePage, AboutPage, NotFoundPage, HomePreviewPage, } from './pages'
import './App.css'

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePreviewPage />} />
      <Route path="/home" element={<HomePage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
