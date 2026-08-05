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

/**
 * Ask who owns the auth cookie. Throws with status 401 when there is no session.
 *
 * The cookie is scoped to the whole domain, so it already arrives here from a
 * sign-in on any sibling app — but localStorage is per-origin, so this is the only
 * way to tell an active session from no session on first load.
 */
export function me(): Promise<User> {
  return request<AuthResponse>('/auth/me').then((response) => response.user);
}
