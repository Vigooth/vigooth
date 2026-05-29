import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { EditorPage } from './pages/EditorPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<EditorPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
