import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import {
  searchMovies,
  getMovieDetails,
  getMovieCredits,
  getTvDetails,
  getTvCredits,
  searchPerson,
  discoverByPerson,
} from "@/lib/api/tmdb";
import type { TmdbSearchResponse, TmdbTvDetail, TmdbPersonSearchResponse } from "@/types/movie";

export function useTmdbSearch(query: string) {
  return useInfiniteQuery<TmdbSearchResponse>({
    queryKey: ["tmdb-search", query],
    queryFn: ({ pageParam }) => searchMovies(query, pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.page < lastPage.total_pages) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    enabled: query.length >= 2,
    staleTime: 1000 * 60 * 5,
  });
}

export function useTmdbMovieDetail(tmdbId: number | null) {
  return useQuery({
    queryKey: ["tmdb-detail", tmdbId],
    queryFn: () => getMovieDetails(tmdbId!),
    enabled: tmdbId !== null,
    staleTime: 1000 * 60 * 30,
  });
}

export function useTmdbMovieCredits(tmdbId: number | null) {
  return useQuery({
    queryKey: ["tmdb-credits", tmdbId],
    queryFn: () => getMovieCredits(tmdbId!),
    enabled: tmdbId !== null,
    staleTime: 1000 * 60 * 30,
  });
}

export function useTmdbTvDetail(tmdbId: number | null) {
  return useQuery<TmdbTvDetail>({
    queryKey: ["tmdb-tv-detail", tmdbId],
    queryFn: () => getTvDetails(tmdbId!),
    enabled: tmdbId !== null,
    staleTime: 1000 * 60 * 30,
  });
}

export function useTmdbTvCredits(tmdbId: number | null) {
  return useQuery({
    queryKey: ["tmdb-tv-credits", tmdbId],
    queryFn: () => getTvCredits(tmdbId!),
    enabled: tmdbId !== null,
    staleTime: 1000 * 60 * 30,
  });
}

export function useTmdbSearchPerson(query: string) {
  return useQuery<TmdbPersonSearchResponse>({
    queryKey: ["tmdb-search-person", query],
    queryFn: () => searchPerson(query),
    enabled: query.length >= 2,
    staleTime: 1000 * 60 * 5,
  });
}

export function useTmdbDiscoverByPerson(personId: number | null) {
  return useInfiniteQuery<TmdbSearchResponse>({
    queryKey: ["tmdb-discover-person", personId],
    queryFn: ({ pageParam }) => discoverByPerson(personId!, pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.page < lastPage.total_pages) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    enabled: personId !== null,
    staleTime: 1000 * 60 * 5,
  });
}
