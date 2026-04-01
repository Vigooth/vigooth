import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CpcLayout } from '@vigooth/ui'
import tw from 'twin.macro'
import { useAuth } from '@/stores/auth'
import { useMoviesQuery } from '@/hooks/useMoviesQuery'
import { useDebounce } from '@/hooks/useDebounce'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'
import { useQueryParam, useQueryParamNumber } from '@/hooks/useQueryParam'
import { Header } from '@/components/layout/Header'
import { SearchBar } from '@/components/search/SearchBar'
import { MovieGrid } from '@/components/movies/MovieGrid'
import { MovieDrawer } from '@/components/movies/MovieDrawer'
import type { Movie } from '@/types/movie'

export function CollectionPage() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const [drawerMovie, setDrawerMovie] = useState<Movie | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [search, setSearch] = useQueryParam('q')
  const [minRating, setMinRating] = useQueryParamNumber('rating')
  const debouncedSearch = useDebounce(search, 300)

  const openDrawer = (movie: Movie) => {
    setDrawerMovie(movie)
    setDrawerOpen(true)
  }

  const closeDrawer = () => {
    setDrawerOpen(false)
  }

  const onAuthError = useCallback(() => {
    logout()
    navigate('/login')
  }, [logout, navigate])

  const {
    movies,
    total,
    isLoading,
    isError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useMoviesQuery({
    search: debouncedSearch,
    minRating,
    onAuthError,
  })

  const { scrollRef, sentinelRef } = useInfiniteScroll({
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  })

  return (
    <CpcLayout>
      <div tw="h-full flex flex-col">
        <Header />

        <div tw="p-3 space-y-2">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search collection..."
          />
          <div tw="flex gap-1">
            {[
              { label: 'TOUT', value: 0 },
              { label: '5+', value: 5 },
              { label: '6+', value: 6 },
              { label: '7+', value: 7 },
              { label: '8+', value: 8 },
            ].map((preset) => (
              <button
                key={preset.value}
                onClick={() => setMinRating(preset.value)}
                css={[
                  tw`border px-3 py-1 text-xs transition-colors`,
                  minRating === preset.value
                    ? tw`border-cpc-cyan-500 text-cpc-cyan-500`
                    : tw`border-cpc-green-900 text-cpc-green-900 hover:text-cpc-green-500 hover:border-cpc-green-500`,
                ]}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div ref={scrollRef} tw="flex-1 overflow-auto px-3 pb-3">
          {isLoading ? (
            <div tw="flex items-center justify-center h-full">
              <div tw="text-cpc-cyan-500">LOADING COLLECTION...</div>
            </div>
          ) : isError ? (
            <div tw="flex items-center justify-center h-full">
              <div tw="text-cpc-red-500">ERROR LOADING COLLECTION</div>
            </div>
          ) : (
            <>
              <div tw="text-cpc-green-500 text-xs mb-3">
                {debouncedSearch || minRating > 0
                  ? `${movies.length}/${total}`
                  : `${total}`}{' '}
                MOVIE{total !== 1 ? 'S' : ''} IN COLLECTION
              </div>
              <MovieGrid
                movies={movies}
                onMovieClick={openDrawer}
                emptyMessage={debouncedSearch || minRating > 0 ? 'NO RESULTS' : 'NO MOVIES YET'}
              />
              <div ref={sentinelRef} tw="h-4" />
              {isFetchingNextPage && (
                <div tw="text-center py-3 text-cpc-cyan-500 text-xs">
                  LOADING MORE...
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <MovieDrawer
        movie={drawerMovie}
        open={drawerOpen}
        onOpenChange={(open) => { if (!open) closeDrawer() }}
        onDeleted={closeDrawer}
      />
    </CpcLayout>
  )
}
