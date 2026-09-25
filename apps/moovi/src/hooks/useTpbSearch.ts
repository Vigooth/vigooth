import { useQuery } from '@tanstack/react-query';
import { searchTpb } from '@/lib/api/tpb';
import type { TpbResponse } from '@/types/movie';

/** Searches a season pack, or a single episode when `episode` is given. */
export function useTpbSearch(title: string, season: number, episode?: number) {
  return useQuery<TpbResponse>({
    queryKey: ['tpb', title, season, episode],
    queryFn: () => searchTpb(title, season, episode),
    staleTime: 30 * 60 * 1000,
  });
}
