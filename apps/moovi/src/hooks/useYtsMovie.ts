import { useQuery } from '@tanstack/react-query'
import { getYtsMovie } from '@/lib/api/yts'
import type { YtsResponse } from '@/types/movie'

export function useYtsMovie(imdbId: string | null) {
  return useQuery<YtsResponse>({
    queryKey: ['yts', imdbId],
    queryFn: () => getYtsMovie(imdbId!),
    enabled: !!imdbId,
    staleTime: 30 * 60 * 1000,
  })
}
