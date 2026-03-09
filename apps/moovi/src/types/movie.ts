export interface Movie {
  id: string
  user_id: string
  tmdb_id: number
  imdb_id: string
  title: string
  original_title: string
  year: number
  poster_path: string
  backdrop_path: string
  overview: string
  genres: string // JSON string: '["Action","Drama"]'
  director: string
  runtime: number
  metascore: number | null
  imdb_rating: number | null
  rotten_tomatoes: number | null
  personal_rating: number | null
  notes: string
  added_at: string
  updated_at: string
}

export interface MovieListResponse {
  movies: Movie[]
  total: number
}

export interface AddMoviePayload {
  tmdb_id: number
  imdb_id: string
  title: string
  original_title: string
  year: number
  poster_path: string
  backdrop_path: string
  overview: string
  genres: string
  director: string
  runtime: number
  metascore: number | null
  imdb_rating: number | null
  rotten_tomatoes: number | null
  personal_rating: number | null
  notes: string
}

export interface UpdateMoviePayload {
  personal_rating?: number | null
  notes?: string
  metascore?: number | null
  imdb_rating?: number | null
  rotten_tomatoes?: number | null
}

// TMDB types
export interface TmdbSearchResult {
  id: number
  title: string
  original_title: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  release_date: string
  genre_ids: number[]
  vote_average: number
}

export interface TmdbSearchResponse {
  page: number
  results: TmdbSearchResult[]
  total_pages: number
  total_results: number
}

export interface TmdbGenre {
  id: number
  name: string
}

export interface TmdbMovieDetail {
  id: number
  title: string
  original_title: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  release_date: string
  genres: TmdbGenre[]
  runtime: number
  imdb_id: string
  vote_average: number
}

export interface TmdbCastMember {
  id: number
  name: string
  character: string
  profile_path: string | null
}

export interface TmdbCrewMember {
  id: number
  name: string
  job: string
  department: string
}

export interface TmdbCredits {
  id: number
  cast: TmdbCastMember[]
  crew: TmdbCrewMember[]
}

// OMDB types
export interface OmdbRating {
  Source: string
  Value: string
}

export interface OmdbResponse {
  Title: string
  Year: string
  Metascore: string
  imdbRating: string
  Ratings: OmdbRating[]
  Response: string
}

export interface ParsedRatings {
  metascore: number | null
  imdbRating: number | null
  rottenTomatoes: number | null
}
