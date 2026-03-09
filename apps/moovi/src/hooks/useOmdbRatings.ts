import { useQuery } from '@tanstack/react-query'
import { getOmdbRatings, parseOmdbRatings } from '@/lib/api/omdb'
import type { ParsedRatings } from '@/types/movie'

export function useOmdbRatings(imdbId: string | null) {
  return useQuery({
    queryKey: ['omdb', imdbId],
    queryFn: async (): Promise<ParsedRatings> => {
      const data = await getOmdbRatings(imdbId!)
      return parseOmdbRatings(data)
    },
    enabled: !!imdbId,
    staleTime: 1000 * 60 * 30,
  })
}
