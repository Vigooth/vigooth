import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getNearbyMovies } from '@/lib/api/cinema';
import type { NearbyMoviesResponse } from '@/types/movie';
import type { NearbyDay } from '@/utils/showtimeDays';

/** Films showing on a day, or all week, in the cinemas around a position. */
export function useNearbyMovies(position: { lat: number; lon: number } | null, day: NearbyDay) {
  // Rounded to ~1 km so small moves reuse the cached answer.
  const lat = position ? Math.round(position.lat * 100) / 100 : null;
  const lon = position ? Math.round(position.lon * 100) / 100 : null;

  return useQuery<NearbyMoviesResponse>({
    queryKey: ['nearby-movies', lat, lon, day],
    queryFn: () => getNearbyMovies(lat ?? 0, lon ?? 0, day),
    // Keeps the previous day's films on screen while another day loads.
    placeholderData: keepPreviousData,
    enabled: lat !== null && lon !== null,
    staleTime: 1000 * 60 * 30,
  });
}
