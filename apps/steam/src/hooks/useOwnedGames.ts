import { useQuery } from '@tanstack/react-query'
import { fetchOwnedGames } from '@/lib/api/steam'
import { STEAM_ID } from '@/config'

export function useOwnedGames(steamId?: string) {
  const id = steamId || STEAM_ID

  return useQuery({
    queryKey: ['ownedGames', id],
    queryFn: () => fetchOwnedGames(id),
    enabled: !!id,
    select: (data) => data.response,
  })
}
