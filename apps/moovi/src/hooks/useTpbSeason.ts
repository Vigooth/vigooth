import { useQuery } from '@tanstack/react-query';
import { searchTpbSeason } from '@/lib/api/tpb';
import type { TpbResponse } from '@/types/movie';

export function useTpbSeason(title: string, season: number) {
  return useQuery<TpbResponse>({
    queryKey: ['tpb', title, season],
    queryFn: () => searchTpbSeason(title, season),
    staleTime: 30 * 60 * 1000,
  });
}
