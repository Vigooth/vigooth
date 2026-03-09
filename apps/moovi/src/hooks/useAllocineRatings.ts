import { useQuery } from '@tanstack/react-query'
import { getAllocineRatings } from '@/lib/api/allocine'
import type { AllocineRatings } from '@/lib/api/allocine'

export function useAllocineRatings(imdbId: string | null) {
  return useQuery<AllocineRatings>({
    queryKey: ['allocine', imdbId],
    queryFn: () => getAllocineRatings(imdbId!),
    enabled: !!imdbId,
    staleTime: 1000 * 60 * 30,
  })
}
