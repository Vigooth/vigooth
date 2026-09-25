import { request } from './client';
import type { TpbResponse } from '@/types/movie';

export async function searchTpbSeason(title: string, season: number): Promise<TpbResponse> {
  const params = new URLSearchParams({ q: title, season: String(season) });
  return request<TpbResponse>(`/api/tpb?${params}`);
}
