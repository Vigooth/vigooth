import { request } from './client'

export interface ServiceStatus {
  name: string
  status: 'ok' | 'error'
  latency_ms: number
  error?: string
}

export interface HealthResponse {
  services: ServiceStatus[]
  checked_at: string
}

export async function getServiceHealth(): Promise<HealthResponse> {
  return request<HealthResponse>('/api/service/status')
}
