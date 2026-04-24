import { useMemo } from "react";
import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as moviesApi from "@/lib/api/movies";
import type { AddMoviePayload, UpdateMoviePayload, MovieListResponse } from "@/types/movie";

const PAGE_SIZE = 20;

export const MOVIES_QUERY_KEY = ["movies"] as const;

export function useMoviesQuery(options?: {
  search?: string;
  minRating?: number;
  onAuthError?: () => void;
}) {
  const search = options?.search ?? "";
  const minRating = options?.minRating ?? 0;

  const query = useInfiniteQuery({
    queryKey: [...MOVIES_QUERY_KEY, { search, minRating }],
    queryFn: ({ pageParam = 0 }) =>
      moviesApi.getMovies({
        search: search || undefined,
        limit: PAGE_SIZE,
        offset: pageParam,
        min_rating: minRating || undefined,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.has_more ? lastPageParam + PAGE_SIZE : undefined,
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes("401")) {
        options?.onAuthError?.();
        return false;
      }
      return failureCount < 2;
    },
  });

  const movies = useMemo(
    () => query.data?.pages.flatMap((p) => p.movies ?? []) ?? [],
    [query.data?.pages],
  );
  const total = query.data?.pages[0]?.total ?? 0;

  return {
    ...query,
    data: query.data ? { movies, total } : undefined,
    movies,
    total,
  };
}

export function useMovieQuery(id: string) {
  return useQuery({
    queryKey: ["movie", id],
    queryFn: () => moviesApi.getMovie(id),
    enabled: !!id,
  });
}

export function useAddMovie() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AddMoviePayload) => moviesApi.addMovie(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MOVIES_QUERY_KEY });
    },
  });
}

export function useUpdateMovie() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateMoviePayload }) =>
      moviesApi.updateMovie(id, payload),
    onSuccess: (updatedMovie) => {
      queryClient.setQueriesData<{ pages: MovieListResponse[]; pageParams: number[] }>(
        { queryKey: MOVIES_QUERY_KEY },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              movies: page.movies.map((m) => (m.id === updatedMovie.id ? updatedMovie : m)),
            })),
          };
        },
      );
    },
  });
}

export function useDeleteMovie() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => moviesApi.deleteMovie(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MOVIES_QUERY_KEY });
    },
  });
}
