import { request } from './client'
import type { TmdbSearchResponse, TmdbMovieDetail, TmdbCredits } from '@/types/movie'

export async function searchMovies(query: string, page = 1): Promise<TmdbSearchResponse> {
  return request<TmdbSearchResponse>(`/api/tmdb/search?q=${encodeURIComponent(query)}&page=${page}`)
}

export async function getMovieDetails(tmdbId: number): Promise<TmdbMovieDetail> {
  return request<TmdbMovieDetail>(`/api/tmdb/movie/${tmdbId}`)
}

export async function getMovieCredits(tmdbId: number): Promise<TmdbCredits> {
  return request<TmdbCredits>(`/api/tmdb/movie/${tmdbId}/credits`)
}
