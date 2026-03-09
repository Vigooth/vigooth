import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import { searchMovies, getMovieDetails, getMovieCredits } from '@/lib/api/tmdb'
import type { TmdbSearchResponse } from '@/types/movie'

export function useTmdbSearch(query: string) {
  return useInfiniteQuery<TmdbSearchResponse>({
    queryKey: ['tmdb-search', query],
    queryFn: ({ pageParam }) => searchMovies(query, pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.page < lastPage.total_pages) {
        return lastPage.page + 1
      }
      return undefined
    },
    enabled: query.length >= 2,
    staleTime: 1000 * 60 * 5,
  })
}

export function useTmdbMovieDetail(tmdbId: number | null) {
  return useQuery({
    queryKey: ['tmdb-detail', tmdbId],
    queryFn: () => getMovieDetails(tmdbId!),
    enabled: tmdbId !== null,
    staleTime: 1000 * 60 * 30,
  })
}

export function useTmdbMovieCredits(tmdbId: number | null) {
  return useQuery({
    queryKey: ['tmdb-credits', tmdbId],
    queryFn: () => getMovieCredits(tmdbId!),
    enabled: tmdbId !== null,
    staleTime: 1000 * 60 * 30,
  })
}
