import { request } from './client';
import type { TpbResponse } from '@/types/movie';

export async function searchTpb(
  title: string,
  season: number,
  episode?: number,
): Promise<TpbResponse> {
  const params = new URLSearchParams({ q: title, season: String(season) });
  if (episode) params.set('episode', String(episode));
  return request<TpbResponse>(`/api/tpb?${params}`);
}
