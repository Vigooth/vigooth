import { useQuery } from '@tanstack/react-query'
import { fetchGameDetails } from '@/lib/api/store'

export function useGameDetails(appid: number | null) {
  return useQuery({
    queryKey: ['gameDetails', appid],
    queryFn: () => fetchGameDetails(appid!),
    enabled: appid !== null,
    staleTime: 1000 * 60 * 30,
    select: (data) => {
      const entry = data[String(appid!)]
      if (!entry?.success) return null
      return entry.data
    },
  })
}
