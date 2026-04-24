import { request } from './client';

export interface AllocineRatings {
  press: number | null;
  spectateurs: number | null;
  allocine_id: string | null;
}

export async function getAllocineRatings(imdbId: string): Promise<AllocineRatings> {
  return request<AllocineRatings>(`/api/allocine/ratings?imdb_id=${encodeURIComponent(imdbId)}`);
}
