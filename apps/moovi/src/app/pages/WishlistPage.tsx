import { useNavigate } from 'react-router-dom'
import { CpcLayout } from '@vigooth/ui'
import 'twin.macro'
import { useWishlistQuery, useRemoveFromWishlist } from '@/hooks/useWishlist'
import { Header } from '@/components/layout/Header'
import { getPosterUrl } from '@/utils/tmdbImage'
import type { WishlistItem } from '@/lib/api/wishlist'

function WishlistCard({ item }: { item: WishlistItem }) {
  const navigate = useNavigate()
  const removeFromWishlist = useRemoveFromWishlist()
  const posterUrl = getPosterUrl(item.poster_path, 'w342')

  return (
    <div
      className="group"
      tw="border-2 border-cpc-green-900 hover:border-cpc-yellow-500 transition-colors"
    >
      <div
        onClick={() => navigate(`/movie/${item.tmdb_id}`)}
        tw="cursor-pointer"
      >
        <div tw="aspect-[2/3] bg-cpc-grey-900 overflow-hidden relative">
          {posterUrl ? (
            <img
              src={posterUrl}
              alt={item.title}
              tw="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
                e.currentTarget.nextElementSibling?.removeAttribute('hidden')
              }}
            />
          ) : null}
          <div hidden={!!posterUrl} tw="w-full h-full flex items-center justify-center text-cpc-green-900">
            NO POSTER
          </div>
        </div>

        <div tw="p-2">
          <div tw="text-cpc-cyan-500 text-sm font-bold truncate group-hover:text-cpc-yellow-500 transition-colors">
            {item.title}
          </div>
          <div tw="text-cpc-green-900 text-xs">{item.year}</div>
        </div>
      </div>

      <div tw="px-2 pb-2">
        <button
          onClick={() => removeFromWishlist.mutate(item.tmdb_id)}
          disabled={removeFromWishlist.isPending}
          tw="w-full border border-cpc-red-500 text-cpc-red-500 text-xs py-1 hover:bg-cpc-red-500 hover:text-black transition-colors"
        >
          {removeFromWishlist.isPending ? 'REMOVING...' : 'REMOVE'}
        </button>
      </div>
    </div>
  )
}

export function WishlistPage() {
  const { data, isLoading, isError } = useWishlistQuery()
  const items = data?.items ?? []

  return (
    <CpcLayout>
      <div tw="h-full flex flex-col">
        <Header />

        <div tw="flex-1 overflow-auto p-3">
          {isLoading ? (
            <div tw="flex items-center justify-center h-full">
              <div tw="text-cpc-cyan-500">LOADING WISHLIST...</div>
            </div>
          ) : isError ? (
            <div tw="flex items-center justify-center h-full">
              <div tw="text-cpc-red-500">ERROR LOADING WISHLIST</div>
            </div>
          ) : (
            <>
              <div tw="text-cpc-green-900 text-xs mb-3">
                {data?.total ?? 0} MOVIE{(data?.total ?? 0) !== 1 ? 'S' : ''} IN WISHLIST
              </div>
              {items.length === 0 ? (
                <div tw="text-center py-12 text-cpc-green-900">
                  <div tw="text-lg mb-2">NO MOVIES IN WISHLIST</div>
                  <div tw="text-sm">Browse movies and add them to your wishlist</div>
                </div>
              ) : (
                <div tw="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {items.map((item) => (
                    <WishlistCard key={item.id} item={item} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </CpcLayout>
  )
}
