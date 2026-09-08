import { request, requestVoid } from './client';

export interface User {
  id: string;
  email: string;
  is_admin: boolean;
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

export function logout(): Promise<void> {
  return requestVoid('/auth/logout', { method: 'POST' });
}

/**
 * Ask who owns the auth cookie. Throws with status 401 when there is no session.
 *
 * The cookie is scoped to the whole domain, so a sign-in on moovi or garden
 * already counts here; this is how the admin space skips its login form for
 * someone who is already in.
 */
export function me(): Promise<User> {
  return request<AuthResponse>('/auth/me').then((response) => response.user);
}
