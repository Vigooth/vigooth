import { request } from './client';
import type { NearbyMoviesResponse } from '@/types/movie';
import type { NearbyDay } from '@/utils/showtimeDays';

export async function getNearbyMovies(
  lat: number,
  lon: number,
  day: NearbyDay,
): Promise<NearbyMoviesResponse> {
  const params = new URLSearchParams({ lat: String(lat), lon: String(lon), day });
  return request<NearbyMoviesResponse>(`/api/cinema/nearby?${params}`);
}
