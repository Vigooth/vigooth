import { useQuery } from '@tanstack/react-query'
import { fetchFriendList, fetchPlayerSummaries } from '@/lib/api/steam'
import type { PlayerSummary } from '@/lib/api/steam'
import { STEAM_ID } from '@/config'

export interface FriendWithProfile {
  steamid: string
  personaname: string
  avatarfull: string
  profileurl: string
  friend_since: number
}

export function useFriendList(steamId?: string) {
  const id = steamId || STEAM_ID

  return useQuery({
    queryKey: ['friendList', id],
    queryFn: async (): Promise<FriendWithProfile[]> => {
      const friendData = await fetchFriendList(id)
      const friends = friendData.friendslist.friends

      // Fetch summaries in batches of 100 (API limit)
      const profiles: PlayerSummary[] = []
      for (let i = 0; i < friends.length; i += 100) {
        const batch = friends.slice(i, i + 100).map((f) => f.steamid)
        const summaries = await fetchPlayerSummaries(batch)
        profiles.push(...summaries)
      }

      const profileMap = new Map(profiles.map((p) => [p.steamid, p]))

      return friends
        .map((f) => {
          const profile = profileMap.get(f.steamid)
          return {
            steamid: f.steamid,
            personaname: profile?.personaname ?? f.steamid,
            avatarfull: profile?.avatarfull ?? '',
            profileurl: profile?.profileurl ?? '',
            friend_since: f.friend_since,
          }
        })
        .sort((a, b) => a.personaname.localeCompare(b.personaname))
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  })
}
