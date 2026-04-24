import { request } from "./client";
import type {
  Movie,
  MovieListResponse,
  MovieListQuery,
  AddMoviePayload,
  UpdateMoviePayload,
} from "@/types/movie";

export async function getMovies(query: MovieListQuery = {}): Promise<MovieListResponse> {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.limit != null) params.set("limit", String(query.limit));
  if (query.offset != null) params.set("offset", String(query.offset));
  if (query.added_after) params.set("added_after", query.added_after);
  if (query.min_rating) params.set("min_rating", String(query.min_rating));
  const qs = params.toString();
  return request<MovieListResponse>(`/api/movies${qs ? `?${qs}` : ""}`);
}

export async function getMovie(id: string): Promise<Movie> {
  return request<Movie>(`/api/movies/${id}`);
}

export async function addMovie(payload: AddMoviePayload): Promise<Movie> {
  return request<Movie>("/api/movies", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateMovie(id: string, payload: UpdateMoviePayload): Promise<Movie> {
  return request<Movie>(`/api/movies/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteMovie(id: string): Promise<void> {
  await request(`/api/movies/${id}`, {
    method: "DELETE",
  });
}

export async function backfillOverviews(): Promise<{ updated: number; total: number }> {
  return request("/api/movies/backfill-overviews", { method: "POST" });
}

export async function getMyTmdbIds(): Promise<{ tmdb_ids: number[] }> {
  return request<{ tmdb_ids: number[] }>("/api/movies/tmdb-ids");
}

export async function getPublicCollection(
  userId: string,
  query: MovieListQuery = {},
): Promise<MovieListResponse> {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.limit != null) params.set("limit", String(query.limit));
  if (query.offset != null) params.set("offset", String(query.offset));
  if (query.min_rating) params.set("min_rating", String(query.min_rating));
  const qs = params.toString();
  return request<MovieListResponse>(`/public/collection/${userId}${qs ? `?${qs}` : ""}`);
}
