import { useQuery } from '@tanstack/react-query';
import { getTpbTorrents } from '@/lib/api/tpb';
import type { TpbResponse } from '@/types/movie';

/** Only enabled once YTS came back empty, so the fallback never runs for nothing. */
export function useTpbTorrents(
  imdbId: string | null,
  title: string,
  year: number,
  enabled: boolean,
) {
  return useQuery<TpbResponse>({
    queryKey: ['tpb', imdbId],
    queryFn: () => getTpbTorrents(imdbId!, title, year),
    enabled: enabled && !!imdbId,
    staleTime: 30 * 60 * 1000,
  });
}
