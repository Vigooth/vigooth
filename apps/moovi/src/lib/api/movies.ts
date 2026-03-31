import { request } from './client'
import type { Movie, MovieListResponse, MovieListQuery, AddMoviePayload, UpdateMoviePayload } from '@/types/movie'

export async function getMovies(query: MovieListQuery = {}): Promise<MovieListResponse> {
  const params = new URLSearchParams()
  if (query.search) params.set('search', query.search)
  if (query.limit != null) params.set('limit', String(query.limit))
  if (query.offset != null) params.set('offset', String(query.offset))
  const qs = params.toString()
  return request<MovieListResponse>(`/api/movies${qs ? `?${qs}` : ''}`)
}

export async function getMovie(id: string): Promise<Movie> {
  return request<Movie>(`/api/movies/${id}`)
}

export async function addMovie(payload: AddMoviePayload): Promise<Movie> {
  return request<Movie>('/api/movies', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateMovie(id: string, payload: UpdateMoviePayload): Promise<Movie> {
  return request<Movie>(`/api/movies/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function deleteMovie(id: string): Promise<void> {
  await request(`/api/movies/${id}`, {
    method: 'DELETE',
  })
}
