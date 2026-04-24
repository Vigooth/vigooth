import type { OwnedGamesResponse } from '@/types/game';

export async function fetchOwnedGames(steamId: string): Promise<OwnedGamesResponse> {
  const res = await fetch(`/api/steam/owned-games/${steamId}`);
  if (!res.ok) throw new Error(`Steam API error: ${res.status}`);
  return res.json();
}

export async function resolveVanityUrl(vanityUrl: string): Promise<string> {
  const res = await fetch(`/api/steam/resolve-vanity/${encodeURIComponent(vanityUrl)}`);
  if (!res.ok) throw new Error(`Steam API error: ${res.status}`);
  const data = await res.json();

  if (data.response.success !== 1) {
    throw new Error('Could not resolve Steam vanity URL');
  }

  return data.response.steamid;
}

export interface Friend {
  steamid: string;
  relationship: string;
  friend_since: number;
}

export interface FriendListResponse {
  friendslist: {
    friends: Friend[];
  };
}

export async function fetchFriendList(steamId: string): Promise<FriendListResponse> {
  const res = await fetch(`/api/steam/friend-list/${steamId}`);
  if (!res.ok) throw new Error('Friend list is private or unavailable');
  return res.json();
}

export async function fetchPlayerSummaries(steamIds: string[]): Promise<PlayerSummary[]> {
  const res = await fetch(`/api/steam/player-summaries?steamids=${steamIds.join(',')}`);
  if (!res.ok) throw new Error(`Steam API error: ${res.status}`);
  const data = await res.json();
  return data.response.players ?? [];
}

export interface PlayerSummary {
  steamid: string;
  personaname: string;
  avatarfull: string;
  profileurl: string;
}

export async function fetchPlayerSummary(steamId: string): Promise<PlayerSummary> {
  const res = await fetch(`/api/steam/player-summary/${steamId}`);
  if (!res.ok) throw new Error(`Steam API error: ${res.status}`);
  const data = await res.json();

  const player = data.response.players?.[0];
  if (!player) throw new Error('Player not found');

  return player;
}
