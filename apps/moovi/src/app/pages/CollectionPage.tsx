import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CpcLayout, CpcInput } from '@vigooth/ui'
import 'twin.macro'
import { useAuth } from '@/stores/auth'
import { useMoviesQuery } from '@/hooks/useMoviesQuery'
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
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

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

  // Infinite scroll with IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current
    const container = scrollRef.current
    if (!sentinel || !container) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { root: container, rootMargin: '200px' },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

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
                    ref={searchRef}
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
