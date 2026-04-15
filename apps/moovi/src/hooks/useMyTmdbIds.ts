import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/stores/auth'
import * as moviesApi from '@/lib/api/movies'

export function useMyTmdbIds() {
  const { isAuthenticated } = useAuth()

  return useQuery({
    queryKey: ['my-tmdb-ids'],
    queryFn: () => moviesApi.getMyTmdbIds(),
    enabled: isAuthenticated,
    select: (data) => new Set(data.tmdb_ids),
    staleTime: 60_000,
  })
}
