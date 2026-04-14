import { useRef, useEffect, useCallback, useMemo } from 'react'
import { CpcLayout } from '@vigooth/ui'
import { useDebounce } from '@/hooks/useDebounce'
import { useQueryParam } from '@/hooks/useQueryParam'
import {
  useTmdbSearch,
  useTmdbSearchPerson,
  useTmdbDiscoverByPerson,
} from '@/hooks/useTmdbSearch'
import { useMoviesQuery } from '@/hooks/useMoviesQuery'
import { Header } from '@/components/layout/Header'
import { SearchBar } from '@/components/search/SearchBar'
import { SearchResultCard } from '@/components/search/SearchResultCard'

export function SearchPage() {
  const [query, setQuery] = useQueryParam('q')
  const debouncedQuery = useDebounce(query, 300)

  const {
    data: searchData,
    isLoading: searching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useTmdbSearch(debouncedQuery)

  // Person search (parallel)
  const { data: personData } = useTmdbSearchPerson(debouncedQuery)

  const director = useMemo(
    () =>
      personData?.results.find(
        (p) => p.known_for_department === 'Directing'
      ) ?? null,
    [personData]
  )

  const {
    data: directorData,
    fetchNextPage: fetchNextDirectorPage,
    hasNextPage: hasNextDirectorPage,
    isFetchingNextPage: isFetchingNextDirectorPage,
  } = useTmdbDiscoverByPerson(director?.id ?? null)

  const { data: collectionData } = useMoviesQuery()

  const collectionKeys = new Set(
    (collectionData?.movies ?? []).map((m) => `${m.media_type}:${m.tmdb_id}`)
  )

  const results = (searchData?.pages.flatMap((page) => page.results) ?? [])
    .filter((r) => r.media_type === 'movie' || r.media_type === 'tv')
  const totalResults = results.length

  const directorResults =
    directorData?.pages.flatMap((page) => page.results) ?? []

  // Infinite scroll observer for movie search
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

  // Infinite scroll observer for director filmography
  const directorSentinelRef = useRef<HTMLDivElement>(null)

  const handleDirectorObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (
        entries[0].isIntersecting &&
        hasNextDirectorPage &&
        !isFetchingNextDirectorPage
      ) {
        fetchNextDirectorPage()
      }
    },
    [fetchNextDirectorPage, hasNextDirectorPage, isFetchingNextDirectorPage]
  )

  useEffect(() => {
    const sentinel = directorSentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(handleDirectorObserver, {
      threshold: 0.1,
    })
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [handleDirectorObserver])

  return (
    <CpcLayout>
      <div className="h-full flex flex-col">
        <Header />

        <div className="p-3">
          <SearchBar
            value={query}
            onChange={setQuery}
            placeholder="Search movies or directors on TMDB..."
          />
        </div>

        <div className="flex-1 overflow-auto px-3 pb-3">
          {!debouncedQuery || debouncedQuery.length < 2 ? (
            <div className="text-center py-12 text-cpc-green-900">
              <div className="text-lg mb-2">SEARCH MOVIES</div>
              <div className="text-sm">Type a movie title or director name to search TMDB</div>
            </div>
          ) : searching ? (
            <div className="text-center py-12 text-cpc-cyan-500">
              SEARCHING...
            </div>
          ) : (
            <>
              {/* Director filmography section */}
              {director && directorResults.length > 0 && (
                <div className="mb-6">
                  <div className="text-cpc-cyan-500 text-xs font-bold mb-2 tracking-wider">
                    FILMS DE {director.name.toUpperCase()}
                  </div>
                  <div className="space-y-2">
                    {directorResults.map((result) => (
                      <SearchResultCard
                        key={`director-${result.id}`}
                        result={result}
                        inCollection={collectionKeys.has(`${result.media_type ?? 'movie'}:${result.id}`)}
                      />
                    ))}
                  </div>

                  <div
                    ref={directorSentinelRef}
                    className="h-8 flex items-center justify-center"
                  >
                    {isFetchingNextDirectorPage && (
                      <span className="text-cpc-cyan-500 text-xs">LOADING MORE...</span>
                    )}
                  </div>

                  <div className="border-t border-cpc-green-900/30 mt-4 pt-4" />
                </div>
              )}

              {/* Movie search results */}
              {results.length === 0 && !director ? (
                <div className="text-center py-12 text-cpc-green-900">
                  <div className="text-lg">NO RESULTS</div>
                  <div className="text-sm mt-1">Try a different search term</div>
                </div>
              ) : results.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-cpc-green-900 text-xs mb-2">
                    {totalResults} RESULT{totalResults !== 1 ? 'S' : ''}
                  </div>
                  {results.map((result) => (
                    <SearchResultCard
                      key={result.id}
                      result={result}
                      inCollection={collectionKeys.has(`${result.media_type ?? 'movie'}:${result.id}`)}
                    />
                  ))}

                  {/* Sentinel for infinite scroll */}
                  <div ref={sentinelRef} className="h-8 flex items-center justify-center">
                    {isFetchingNextPage && (
                      <span className="text-cpc-cyan-500 text-xs">LOADING MORE...</span>
                    )}
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </CpcLayout>
  )
}
