const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8090';

interface ApiError {
  error: string;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (response.status === 401 && !endpoint.startsWith('/auth/')) {
    localStorage.removeItem('user');
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// Auth
export interface AuthResponse {
  user: {
    id: string;
    email: string;
    created_at: string;
  };
}

export async function register(email: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function logout(): Promise<void> {
  await request('/auth/logout', { method: 'POST' });
}

// Vault
export interface VaultResponse {
  data: string;
  updated_at: string;
}

export async function getVault(): Promise<VaultResponse> {
  return request<VaultResponse>('/api/vault');
}

export async function saveVault(data: string): Promise<void> {
  await request('/api/vault', {
    method: 'PUT',
    body: JSON.stringify({ data }),
  });
}

export async function deleteVault(): Promise<void> {
  await request('/api/vault', {
    method: 'DELETE',
  });
}
