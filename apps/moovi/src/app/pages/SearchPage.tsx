import { useRef, useEffect, useCallback } from 'react'
import { CpcLayout } from '@vigooth/ui'
import { useSearchParams } from 'react-router-dom'
import 'twin.macro'
import { useDebounce } from '@/hooks/useDebounce'
import { useTmdbSearch } from '@/hooks/useTmdbSearch'
import { useMoviesQuery } from '@/hooks/useMoviesQuery'
import { Header } from '@/components/layout/Header'
import { SearchBar } from '@/components/search/SearchBar'
import { SearchResultCard } from '@/components/search/SearchResultCard'

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') || ''
  const debouncedQuery = useDebounce(query, 300)

  const setQuery = (value: string) => {
    if (value) {
      setSearchParams({ q: value }, { replace: true })
    } else {
      setSearchParams({}, { replace: true })
    }
  }

  const {
    data: searchData,
    isLoading: searching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useTmdbSearch(debouncedQuery)

  const { data: collectionData } = useMoviesQuery()

  const collectionTmdbIds = new Set(
    (collectionData?.movies ?? []).map((m) => m.tmdb_id)
  )

  const results = searchData?.pages.flatMap((page) => page.results) ?? []
  const totalResults = searchData?.pages[0]?.total_results ?? 0

  // Infinite scroll observer
  const sentinelRef = useRef<HTMLDivElement>(null)

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage()
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  )

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(handleObserver, { threshold: 0.1 })
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [handleObserver])

  return (
    <CpcLayout>
      <div tw="h-full flex flex-col">
        <Header />

        <div tw="p-3">
          <SearchBar
            value={query}
            onChange={setQuery}
            placeholder="Search movies on TMDB..."
          />
        </div>

        <div tw="flex-1 overflow-auto px-3 pb-3">
          {!debouncedQuery ? (
            <div tw="text-center py-12 text-cpc-green-900">
              <div tw="text-lg mb-2">SEARCH MOVIES</div>
              <div tw="text-sm">Type a movie title to search TMDB</div>
            </div>
          ) : searching ? (
            <div tw="text-center py-12 text-cpc-cyan-500">
              SEARCHING...
            </div>
          ) : results.length === 0 ? (
            <div tw="text-center py-12 text-cpc-green-900">
              <div tw="text-lg">NO RESULTS</div>
              <div tw="text-sm mt-1">Try a different search term</div>
            </div>
          ) : (
            <div tw="space-y-2">
              <div tw="text-cpc-green-900 text-xs mb-2">
                {totalResults} RESULT{totalResults !== 1 ? 'S' : ''}
              </div>
              {results.map((result) => (
                <SearchResultCard
                  key={result.id}
                  result={result}
                  inCollection={collectionTmdbIds.has(result.id)}
                />
              ))}

              {/* Sentinel for infinite scroll */}
              <div ref={sentinelRef} tw="h-8 flex items-center justify-center">
                {isFetchingNextPage && (
                  <span tw="text-cpc-cyan-500 text-xs">LOADING MORE...</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </CpcLayout>
  )
}
