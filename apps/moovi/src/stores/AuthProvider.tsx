import { useState, useCallback, ReactNode } from "react";
import { AuthContext, AuthState, User, getInitialAuthState } from "./auth";
import { logout as apiLogout } from "@/lib/api/client";

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>(getInitialAuthState);

  const login = useCallback((user: User) => {
    localStorage.setItem("user", JSON.stringify(user));
    setState({
      user,
      isAuthenticated: true,
    });
  }, []);

  const logout = useCallback(() => {
    apiLogout().catch(() => {});
    localStorage.removeItem("user");
    setState({
      user: null,
      isAuthenticated: false,
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
