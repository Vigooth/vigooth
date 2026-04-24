import { request } from './client';
import type { YtsResponse } from '@/types/movie';

export async function getYtsMovie(imdbId: string): Promise<YtsResponse> {
  return request<YtsResponse>(`/api/yts?imdb_id=${encodeURIComponent(imdbId)}`);
}
