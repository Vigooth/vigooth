export interface Movie {
  id: string;
  user_id: string;
  tmdb_id: number;
  imdb_id: string;
  media_type: string;
  title: string;
  original_title: string;
  year: number;
  poster_path: string;
  backdrop_path: string;
  overview: string;
  genres: string; // JSON string: '["Action","Drama"]'
  director: string;
  runtime: number;
  metascore: number | null;
  imdb_rating: number | null;
  rotten_tomatoes: number | null;
  personal_rating: number | null;
  notes: string;
  added_at: string;
  updated_at: string;
}

export interface MovieListQuery {
  search?: string;
  limit?: number;
  offset?: number;
  added_after?: string;
  min_rating?: number;
}

export interface MovieListResponse {
  movies: Movie[];
  total: number;
  has_more: boolean;
}

export interface AddMoviePayload {
  tmdb_id: number;
  imdb_id: string;
  media_type: string;
  title: string;
  original_title: string;
  year: number;
  poster_path: string;
  backdrop_path: string;
  overview: string;
  genres: string;
  director: string;
  runtime: number;
  metascore: number | null;
  imdb_rating: number | null;
  rotten_tomatoes: number | null;
  personal_rating: number | null;
  notes: string;
}

export interface UpdateMoviePayload {
  personal_rating?: number | null;
  notes?: string;
  metascore?: number | null;
  imdb_rating?: number | null;
  rotten_tomatoes?: number | null;
}

// TMDB types
export interface TmdbSearchResult {
  id: number;
  media_type: 'movie' | 'tv' | 'person';
  // Movie fields
  title?: string;
  original_title?: string;
  release_date?: string;
  // TV fields
  name?: string;
  original_name?: string;
  first_air_date?: string;
  // Shared fields
  overview?: string;
  poster_path: string | null;
  backdrop_path?: string | null;
  genre_ids?: number[];
  vote_average?: number;
}

export interface TmdbSearchResponse {
  page: number;
  results: TmdbSearchResult[];
  total_pages: number;
  total_results: number;
}

export interface TmdbNowPlayingResponse extends TmdbSearchResponse {
  /** Release window of the films in cinemas; older dates are re-releases. */
  dates: { minimum: string; maximum: string };
}

export interface NearbyMovie {
  result: TmdbSearchResult;
  /** Cinemas showing the film today. */
  theaters: string[];
}

export interface NearbyMoviesResponse {
  city: string;
  movies: NearbyMovie[];
}

export interface TmdbGenre {
  id: number;
  name: string;
}

export interface TmdbMovieDetail {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  genres: TmdbGenre[];
  runtime: number;
  imdb_id: string;
  vote_average: number;
}

export interface TmdbSeason {
  season_number: number;
  episode_count: number;
}

export interface TmdbTvDetail {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  genres: TmdbGenre[];
  number_of_seasons: number;
  number_of_episodes: number;
  seasons?: TmdbSeason[];
  episode_run_time: number[];
  created_by: { id: number; name: string }[];
  vote_average: number;
  external_ids?: { imdb_id?: string };
}

export interface TmdbCastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
}

export interface TmdbCrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
}

export interface TmdbCredits {
  id: number;
  cast: TmdbCastMember[];
  crew: TmdbCrewMember[];
}

// TMDB Person types
export interface TmdbPersonResult {
  id: number;
  name: string;
  known_for_department: string;
  profile_path: string | null;
}

export interface TmdbPersonSearchResponse {
  page: number;
  results: TmdbPersonResult[];
  total_results: number;
}

// OMDB types
export interface OmdbRating {
  Source: string;
  Value: string;
}

export interface OmdbResponse {
  Title: string;
  Year: string;
  Metascore: string;
  imdbRating: string;
  Ratings: OmdbRating[];
  Response: string;
}

export interface ParsedRatings {
  metascore: number | null;
  imdbRating: number | null;
  rottenTomatoes: number | null;
}

// YTS types
export interface YtsTorrent {
  url: string;
  magnet: string;
  quality: string;
  type: string;
  size: string;
}

export interface YtsResponse {
  found: boolean;
  url?: string;
  title?: string;
  torrents?: YtsTorrent[];
}

// The Pirate Bay types
export interface TpbTorrent {
  id: string;
  name: string;
  url: string;
  magnet: string;
  quality: string;
  size: string;
  seeders: number;
  leechers: number;
}

export interface TpbResponse {
  found: boolean;
  url: string;
  torrents?: TpbTorrent[];
}

// OpenSubtitles types
export interface Subtitle {
  file_id: number;
  language: string;
  release: string;
  download_count: number;
  hearing_impaired: boolean;
  url: string;
  /** Release tags parsed by the API, used to match a subtitle with a YTS torrent. */
  yify: boolean;
  quality: string;
  source: string;
}

export interface SubtitlesResponse {
  found: boolean;
  configured: boolean;
  downloadable: boolean;
  subtitles?: Subtitle[];
}
