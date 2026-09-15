import { useQuery } from '@tanstack/react-query';
import { getSubtitles } from '@/lib/api/subtitles';
import type { SubtitlesResponse } from '@/types/movie';

export function useSubtitles(imdbId: string | null) {
  return useQuery<SubtitlesResponse>({
    queryKey: ['subtitles', imdbId],
    queryFn: () => getSubtitles(imdbId!),
    enabled: !!imdbId,
    staleTime: 30 * 60 * 1000,
  });
}
