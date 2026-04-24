import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryProvider, AuthProvider, useAuth } from "./providers";
import { LibraryPage } from "./pages/LibraryPage";
import { LoginPage } from "./pages/LoginPage";

function AppRoutes() {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;

  return (
    <Routes>
      <Route path="/library" element={user ? <LibraryPage /> : <Navigate to="/login" replace />} />
      <Route
        path="/u/:steamId"
        element={user ? <LibraryPage /> : <Navigate to="/login" replace />}
      />
      <Route path="/login" element={user ? <Navigate to="/library" replace /> : <LoginPage />} />
      <Route path="*" element={<Navigate to={user ? "/library" : "/login"} replace />} />
    </Routes>
  );
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
  );
}
