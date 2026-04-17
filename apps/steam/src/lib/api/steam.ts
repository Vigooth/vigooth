import { STEAM_API_KEY, STEAM_ID } from '@/config'
import type { OwnedGamesResponse } from '@/types/game'

export async function fetchOwnedGames(steamId?: string): Promise<OwnedGamesResponse> {
  const id = steamId || STEAM_ID
  const params = new URLSearchParams({
    key: STEAM_API_KEY,
    steamid: id,
    include_appinfo: '1',
    include_played_free_games: '1',
    format: 'json',
  })

  const res = await fetch(`/api/steam/IPlayerService/GetOwnedGames/v1/?${params}`)
  if (!res.ok) throw new Error(`Steam API error: ${res.status}`)
  return res.json()
}

export async function resolveVanityUrl(vanityUrl: string): Promise<string> {
  const params = new URLSearchParams({
    key: STEAM_API_KEY,
    vanityurl: vanityUrl,
  })

  const res = await fetch(`/api/steam/ISteamUser/ResolveVanityURL/v1/?${params}`)
  if (!res.ok) throw new Error(`Steam API error: ${res.status}`)
  const data = await res.json()

  if (data.response.success !== 1) {
    throw new Error('Could not resolve Steam vanity URL')
  }

  return data.response.steamid
}

export interface Friend {
  steamid: string
  relationship: string
  friend_since: number
}

export interface FriendListResponse {
  friendslist: {
    friends: Friend[]
  }
}

export async function fetchFriendList(steamId: string): Promise<FriendListResponse> {
  const params = new URLSearchParams({
    key: STEAM_API_KEY,
    steamid: steamId,
    relationship: 'friend',
  })

  const res = await fetch(`/api/steam/ISteamUser/GetFriendList/v1/?${params}`)
  if (!res.ok) throw new Error('Friend list is private or unavailable')
  return res.json()
}

export async function fetchPlayerSummaries(steamIds: string[]): Promise<PlayerSummary[]> {
  const params = new URLSearchParams({
    key: STEAM_API_KEY,
    steamids: steamIds.join(','),
  })

  const res = await fetch(`/api/steam/ISteamUser/GetPlayerSummaries/v2/?${params}`)
  if (!res.ok) throw new Error(`Steam API error: ${res.status}`)
  const data = await res.json()
  return data.response.players ?? []
}

export interface PlayerSummary {
  steamid: string
  personaname: string
  avatarfull: string
  profileurl: string
}

export async function fetchPlayerSummary(steamId: string): Promise<PlayerSummary> {
  const params = new URLSearchParams({
    key: STEAM_API_KEY,
    steamids: steamId,
  })

  const res = await fetch(`/api/steam/ISteamUser/GetPlayerSummaries/v2/?${params}`)
  if (!res.ok) throw new Error(`Steam API error: ${res.status}`)
  const data = await res.json()

  const player = data.response.players?.[0]
  if (!player) throw new Error('Player not found')

  return player
}
