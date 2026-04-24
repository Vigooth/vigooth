export interface SteamGame {
  appid: number;
  name: string;
  playtime_forever: number;
  playtime_2weeks?: number;
  img_icon_url: string;
  playtime_windows_forever: number;
  playtime_mac_forever: number;
  playtime_linux_forever: number;
  playtime_deck_forever: number;
  rtime_last_played: number;
}

export interface OwnedGamesResponse {
  response: {
    game_count: number;
    games: SteamGame[];
  };
}

export interface GameDetails {
  type: string;
  name: string;
  steam_appid: number;
  required_age: number;
  is_free: boolean;
  detailed_description: string;
  about_the_game: string;
  short_description: string;
  header_image: string;
  capsule_image: string;
  website: string | null;
  developers: string[];
  publishers: string[];
  genres: { id: string; description: string }[];
  categories: { id: number; description: string }[];
  screenshots: { id: number; path_thumbnail: string; path_full: string }[];
  movies?: { id: number; name: string; thumbnail: string; webm: { max: string } }[];
  release_date: { coming_soon: boolean; date: string };
  metacritic?: { score: number; url: string };
  platforms: { windows: boolean; mac: boolean; linux: boolean };
  price_overview?: {
    currency: string;
    initial: number;
    final: number;
    discount_percent: number;
    final_formatted: string;
  };
  background: string;
  background_raw: string;
}

export interface AppDetailsResponse {
  [appid: string]: {
    success: boolean;
    data: GameDetails;
  };
}

export type SortOption = 'name' | 'playtime' | 'recent';
