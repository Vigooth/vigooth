import { createContext, useContext } from "react";

export interface User {
  id: string;
  email: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

export interface AuthContextType extends AuthState {
  login: (user: User) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function getInitialAuthState(): AuthState {
  const userJson = localStorage.getItem("user");

  let user: User | null = null;
  if (userJson) {
    try {
      user = JSON.parse(userJson);
    } catch {
      localStorage.removeItem("user");
    }
  }

  return {
    user,
    isAuthenticated: !!user,
  };
}
