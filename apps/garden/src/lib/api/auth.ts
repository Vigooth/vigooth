import { request, requestVoid } from './client';

export interface User {
  id: string;
  email: string;
  created_at?: string;
}

interface AuthResponse {
  user: User;
}

export async function login(email: string, password: string): Promise<User> {
  const response = await request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return response.user;
}

export async function register(email: string, password: string): Promise<User> {
  const response = await request<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return response.user;
}

export function logout(): Promise<void> {
  return requestVoid('/auth/logout', { method: 'POST' });
}
