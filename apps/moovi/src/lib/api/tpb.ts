import { request } from './client';
import type { TpbResponse } from '@/types/movie';

export async function getTpbTorrents(
  imdbId: string,
  title: string,
  year: number,
): Promise<TpbResponse> {
  const params = new URLSearchParams({ imdb_id: imdbId, title, year: String(year) });
  return request<TpbResponse>(`/api/tpb?${params.toString()}`);
}
