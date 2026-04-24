import { useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import * as moviesApi from '@/lib/api/movies';

const PAGE_SIZE = 20;

export function usePublicCollectionQuery(
  userId: string,
  options?: { search?: string; minRating?: number },
) {
  const search = options?.search ?? '';
  const minRating = options?.minRating ?? 0;

  const query = useInfiniteQuery({
    queryKey: ['public-collection', userId, { search, minRating }],
    queryFn: ({ pageParam = 0 }) =>
      moviesApi.getPublicCollection(userId, {
        search: search || undefined,
        limit: PAGE_SIZE,
        offset: pageParam,
        min_rating: minRating || undefined,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.has_more ? lastPageParam + PAGE_SIZE : undefined,
    enabled: !!userId,
  });

  const movies = useMemo(
    () => query.data?.pages.flatMap((p) => p.movies ?? []) ?? [],
    [query.data?.pages],
  );
  const total = query.data?.pages[0]?.total ?? 0;

  return {
    ...query,
    movies,
    total,
  };
}
