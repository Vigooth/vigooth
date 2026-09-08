import { request } from '@/lib/api/client';
import type { Visit, VisitStats } from '../types/visit';

export const PAGE_SIZE = 50;

interface VisitsResponse {
  visits: Visit[];
}

export interface VisitsQuery {
  app?: string;
  offset?: number;
}

export function fetchVisits({ app = '', offset = 0 }: VisitsQuery = {}): Promise<Visit[]> {
  const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
  if (app) params.set('app', app);
  return request<VisitsResponse>(`/api/admin/visits?${params}`).then((response) => response.visits);
}

export function fetchVisitStats(): Promise<VisitStats> {
  return request<VisitStats>('/api/admin/visits/stats');
}
