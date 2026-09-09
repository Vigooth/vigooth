import { request } from '@/lib/api/client';
import type { Visit, Visitor, VisitStats } from '../types/visit';

export const PAGE_SIZE = 50;

interface VisitsResponse {
  visits: Visit[];
}

export interface VisitsQuery {
  app?: string;
  ip?: string;
  offset?: number;
  limit?: number;
}

export function fetchVisits({
  app = '',
  ip = '',
  offset = 0,
  limit = PAGE_SIZE,
}: VisitsQuery = {}): Promise<Visit[]> {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (app) params.set('app', app);
  if (ip) params.set('ip', ip);
  return request<VisitsResponse>(`/api/admin/visits?${params}`).then((response) => response.visits);
}

interface VisitorsResponse {
  visitors: Visitor[];
}

export function fetchVisitors(offset = 0): Promise<Visitor[]> {
  const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
  return request<VisitorsResponse>(`/api/admin/visitors?${params}`).then(
    (response) => response.visitors,
  );
}

export function fetchVisitStats(): Promise<VisitStats> {
  return request<VisitStats>('/api/admin/visits/stats');
}
