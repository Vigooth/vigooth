import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as wishlistApi from '@/lib/api/wishlist';
import type { WishlistResponse, AddWishlistPayload } from '@/lib/api/wishlist';

export const WISHLIST_QUERY_KEY = ['wishlist'] as const;

export function useWishlistQuery() {
  return useQuery({
    queryKey: WISHLIST_QUERY_KEY,
    queryFn: wishlistApi.getWishlist,
  });
}

export function useIsInWishlist(tmdbId: number | null) {
  const { data } = useWishlistQuery();
  if (!tmdbId || !data?.items) return false;
  return data.items.some((item) => item.tmdb_id === tmdbId);
}

export function useAddToWishlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AddWishlistPayload) => wishlistApi.addToWishlist(payload),
    onSuccess: (newItem) => {
      queryClient.setQueryData<WishlistResponse>(WISHLIST_QUERY_KEY, (old) => {
        if (!old) return { items: [newItem], total: 1 };
        return {
          items: [newItem, ...old.items],
          total: old.total + 1,
        };
      });
    },
  });
}

export function useRemoveFromWishlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tmdbId: number) => wishlistApi.removeFromWishlist(tmdbId),
    onSuccess: (_, tmdbId) => {
      queryClient.setQueryData<WishlistResponse>(WISHLIST_QUERY_KEY, (old) => {
        if (!old) return old;
        return {
          items: old.items.filter((item) => item.tmdb_id !== tmdbId),
          total: old.total - 1,
        };
      });
    },
  });
}
