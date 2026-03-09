import { request } from './client'
import type { Movie, MovieListResponse, AddMoviePayload, UpdateMoviePayload } from '@/types/movie'

export async function getMovies(): Promise<MovieListResponse> {
  return request<MovieListResponse>('/api/movies')
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
