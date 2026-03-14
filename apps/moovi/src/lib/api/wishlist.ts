import { request } from './client'

export interface WishlistItem {
  id: string
  user_id: string
  tmdb_id: number
  title: string
  year: number
  poster_path: string
  added_at: string
}

export interface WishlistResponse {
  items: WishlistItem[]
  total: number
}

export interface AddWishlistPayload {
  tmdb_id: number
  title: string
  year: number
  poster_path: string
}

export async function getWishlist(): Promise<WishlistResponse> {
  return request<WishlistResponse>('/api/wishlist')
}

export async function addToWishlist(payload: AddWishlistPayload): Promise<WishlistItem> {
  return request<WishlistItem>('/api/wishlist', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function removeFromWishlist(tmdbId: number): Promise<void> {
  await request(`/api/wishlist/${tmdbId}`, {
    method: 'DELETE',
  })
}
