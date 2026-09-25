import { request } from './client';
import type { NearbyMoviesResponse } from '@/types/movie';

export async function getNearbyMovies(lat: number, lon: number): Promise<NearbyMoviesResponse> {
  const params = new URLSearchParams({ lat: String(lat), lon: String(lon) });
  return request<NearbyMoviesResponse>(`/api/cinema/nearby?${params}`);
}
