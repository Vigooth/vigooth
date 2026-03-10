import { request } from './client'
import type {
  TmdbSearchResponse,
  TmdbMovieDetail,
  TmdbCredits,
  TmdbPersonSearchResponse,
} from '@/types/movie'

export async function searchMovies(query: string, page = 1): Promise<TmdbSearchResponse> {
  return request<TmdbSearchResponse>(`/api/tmdb/search?q=${encodeURIComponent(query)}&page=${page}`)
}

export async function getMovieDetails(tmdbId: number): Promise<TmdbMovieDetail> {
  return request<TmdbMovieDetail>(`/api/tmdb/movie/${tmdbId}`)
}

export async function getMovieCredits(tmdbId: number): Promise<TmdbCredits> {
  return request<TmdbCredits>(`/api/tmdb/movie/${tmdbId}/credits`)
}

export async function searchPerson(
  query: string,
  page = 1
): Promise<TmdbPersonSearchResponse> {
  return request<TmdbPersonSearchResponse>(
    `/api/tmdb/search-person?q=${encodeURIComponent(query)}&page=${page}`
  )
}

export async function discoverByPerson(
  personId: number,
  page = 1,
  sortBy = 'release_date.desc'
): Promise<TmdbSearchResponse> {
  return request<TmdbSearchResponse>(
    `/api/tmdb/discover/movie?with_crew=${personId}&page=${page}&sort_by=${sortBy}`
  )
}
