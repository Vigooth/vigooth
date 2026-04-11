const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8090'

interface ApiError {
  error: string
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  })

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({ error: 'Network error' }))
    throw new Error(error.error || `HTTP ${response.status}`)
  }

  return response.json()
}

// Auth
export interface AuthResponse {
  user: {
    id: string
    email: string
    created_at: string
  }
  totp_required?: boolean
}

export async function register(email: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export async function logout(): Promise<void> {
  await request('/auth/logout', { method: 'POST' })
}

// TOTP 2FA
export async function verifyTotpLogin(code: string): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/totp/verify', {
    method: 'POST',
    body: JSON.stringify({ code }),
  })
}

export async function verifyRecoveryCode(recovery: string): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/totp/verify', {
    method: 'POST',
    body: JSON.stringify({ recovery }),
  })
}

export interface TotpSetupResponse {
  secret: string
  qr_code_uri: string
}

export interface TotpEnableResponse {
  recovery_codes: string[]
}

export interface TotpStatusResponse {
  enabled: boolean
}

export async function getTotpStatus(): Promise<TotpStatusResponse> {
  return request<TotpStatusResponse>('/api/totp/status')
}

export async function setupTotp(): Promise<TotpSetupResponse> {
  return request<TotpSetupResponse>('/api/totp/setup', { method: 'POST' })
}

export async function enableTotp(code: string): Promise<TotpEnableResponse> {
  return request<TotpEnableResponse>('/api/totp/enable', {
    method: 'POST',
    body: JSON.stringify({ code }),
  })
}

export async function disableTotp(code: string): Promise<void> {
  await request('/api/totp/disable', {
    method: 'POST',
    body: JSON.stringify({ code }),
  })
}

// Vault
export interface VaultResponse {
  data: string
  updated_at: string
}

export async function getVault(): Promise<VaultResponse> {
  return request<VaultResponse>('/api/vault')
}

export async function saveVault(data: string): Promise<void> {
  await request('/api/vault', {
    method: 'PUT',
    body: JSON.stringify({ data }),
  })
}

export async function deleteVault(): Promise<void> {
  await request('/api/vault', {
    method: 'DELETE',
  })
}
