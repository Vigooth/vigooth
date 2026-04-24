export interface SteamUser {
  steamId: string;
  personaname: string;
  avatar: string;
}

export async function fetchMe(): Promise<SteamUser> {
  const res = await fetch('/auth/steam/me');
  if (!res.ok) throw new Error('Not authenticated');
  return res.json();
}

export async function logout(): Promise<void> {
  await fetch('/auth/steam/logout', { method: 'POST' });
}
