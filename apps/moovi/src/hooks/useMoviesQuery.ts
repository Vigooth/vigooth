import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as moviesApi from '@/lib/api/movies'
import type { AddMoviePayload, UpdateMoviePayload, MovieListResponse } from '@/types/movie'

export const MOVIES_QUERY_KEY = ['movies'] as const

export function useMoviesQuery(options?: { onAuthError?: () => void }) {
  return useQuery({
    queryKey: MOVIES_QUERY_KEY,
    queryFn: moviesApi.getMovies,
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes('401')) {
        options?.onAuthError?.()
        return false
      }
      return failureCount < 2
    },
  })
}

export function useMovieQuery(id: string) {
  return useQuery({
    queryKey: ['movie', id],
    queryFn: () => moviesApi.getMovie(id),
    enabled: !!id,
  })
}

export function useAddMovie() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: AddMoviePayload) => moviesApi.addMovie(payload),
    onSuccess: (newMovie) => {
      queryClient.setQueryData<MovieListResponse>(MOVIES_QUERY_KEY, (old) => {
        if (!old) return { movies: [newMovie], total: 1 }
        return {
          movies: [newMovie, ...old.movies],
          total: old.total + 1,
        }
      })
    },
  })
}

export function useUpdateMovie() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateMoviePayload }) =>
      moviesApi.updateMovie(id, payload),
    onSuccess: (updatedMovie) => {
      queryClient.setQueryData<MovieListResponse>(MOVIES_QUERY_KEY, (old) => {
        if (!old) return old
        return {
          ...old,
          movies: old.movies.map((m) => (m.id === updatedMovie.id ? updatedMovie : m)),
        }
      })
      queryClient.setQueryData(['movie', updatedMovie.id], updatedMovie)
    },
  })
}

export function useDeleteMovie() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => moviesApi.deleteMovie(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData<MovieListResponse>(MOVIES_QUERY_KEY, (old) => {
        if (!old) return old
        return {
          movies: old.movies.filter((m) => m.id !== id),
          total: old.total - 1,
        }
      })
      queryClient.removeQueries({ queryKey: ['movie', id] })
    },
  })
}
