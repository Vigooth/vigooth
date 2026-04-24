export const STEAM_CDN_BASE = 'https://cdn.akamai.steamstatic.com/steam/apps';

export function getHeaderImage(appid: number): string {
  return `${STEAM_CDN_BASE}/${appid}/header.jpg`;
}

export function getCapsuleImage(appid: number): string {
  return `${STEAM_CDN_BASE}/${appid}/library_600x900.jpg`;
}

export function getHeroImage(appid: number): string {
  return `${STEAM_CDN_BASE}/${appid}/library_hero.jpg`;
}

export function getLogoImage(appid: number): string {
  return `${STEAM_CDN_BASE}/${appid}/logo.png`;
}
