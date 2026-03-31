import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CpcLayout, CpcInput } from '@vigooth/ui'
import 'twin.macro'
import { useAuth } from '@/stores/auth'
import { useMoviesQuery } from '@/hooks/useMoviesQuery'
import { useDebounce } from '@/hooks/useDebounce'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'
import { Header } from '@/components/layout/Header'
import { MovieGrid } from '@/components/movies/MovieGrid'
import { MovieDrawer } from '@/components/movies/MovieDrawer'
import type { Movie } from '@/types/movie'

export function CollectionPage() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const [drawerMovie, setDrawerMovie] = useState<Movie | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [search, setSearch] = useState('')
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

        <div ref={scrollRef} tw="flex-1 overflow-auto p-3">
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
              <div tw="flex items-center justify-between mb-3">
                <div tw="text-cpc-green-900 text-xs">
                  {debouncedSearch
                    ? `${movies.length}/${total}`
                    : `${total}`}{' '}
                  MOVIE{total !== 1 ? 'S' : ''} IN COLLECTION
                </div>
                <div tw="text-cpc-green-500 text-xs flex items-center gap-1">
                  <span>{'>'}</span>
                  <CpcInput
                    value={search}
                    onChange={setSearch}
                    placeholder="SEARCH..."
                  />
                </div>
              </div>
              <MovieGrid movies={movies} onMovieClick={openDrawer} />
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
