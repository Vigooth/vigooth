import { useQuery } from '@tanstack/react-query';
import { fetchPlayerSummary } from '@/lib/api/steam';

export function usePlayerSummary(steamId: string | undefined) {
  return useQuery({
    queryKey: ['playerSummary', steamId],
    queryFn: () => fetchPlayerSummary(steamId!),
    enabled: !!steamId,
    staleTime: 1000 * 60 * 10,
  });
}
