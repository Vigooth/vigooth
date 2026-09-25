import { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import { CpcButton, CpcLayout, ListIcon, GridCompactIcon } from '@vigooth/ui';
import { useDebounce } from '@/hooks/useDebounce';
import { useQueryParam } from '@/hooks/useQueryParam';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import {
  useTmdbSearch,
  useTmdbSearchPerson,
  useTmdbDiscoverByPerson,
  useTmdbNowPlaying,
} from '@/hooks/useTmdbSearch';
import { useMoviesQuery } from '@/hooks/useMoviesQuery';
import { Header } from '@/components/layout/Header';
import { SearchBar } from '@/components/search/SearchBar';
import { SearchResultCard } from '@/components/search/SearchResultCard';
import { NearbyMoviesSection } from '@/components/search/NearbyMoviesSection';

type ViewMode = 'grid' | 'list' | 'compact';

const gridClasses: Record<ViewMode, string> = {
  grid: 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3',
  list: 'flex flex-col gap-2',
  compact: 'grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2',
};

export function SearchPage() {
  const [query, setQuery] = useQueryParam('q');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const debouncedQuery = useDebounce(query, 300);
  const isSearching = debouncedQuery.length >= 2;

  const {
    data: searchData,
    isLoading: searching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useTmdbSearch(debouncedQuery);

  // Person search (parallel)
  const { data: personData } = useTmdbSearchPerson(debouncedQuery);

  const director = useMemo(
    () => personData?.results.find((p) => p.known_for_department === 'Directing') ?? null,
    [personData],
  );

  const {
    data: directorData,
    fetchNextPage: fetchNextDirectorPage,
    hasNextPage: hasNextDirectorPage,
    isFetchingNextPage: isFetchingNextDirectorPage,
  } = useTmdbDiscoverByPerson(director?.id ?? null);

  // Recent releases fill the page until a search is typed.
  const {
    data: nowPlayingData,
    isLoading: loadingNowPlaying,
    fetchNextPage: fetchNextNowPlayingPage,
    hasNextPage: hasNextNowPlayingPage,
    isFetchingNextPage: isFetchingNextNowPlayingPage,
  } = useTmdbNowPlaying(!isSearching);
  const nowPlayingResults = nowPlayingData?.pages.flatMap((page) => page.results) ?? [];
  const { scrollRef, sentinelRef: nowPlayingSentinelRef } = useInfiniteScroll({
    hasNextPage: hasNextNowPlayingPage,
    isFetchingNextPage: isFetchingNextNowPlayingPage,
    fetchNextPage: fetchNextNowPlayingPage,
  });

  const { data: collectionData } = useMoviesQuery();

  const collectionKeys = new Set(
    (collectionData?.movies ?? []).map((m) => `${m.media_type}:${m.tmdb_id}`),
  );

  const results = (searchData?.pages.flatMap((page) => page.results) ?? []).filter(
    (r) => r.media_type === 'movie' || r.media_type === 'tv',
  );
  const totalResults = results.length;

  const directorResults = directorData?.pages.flatMap((page) => page.results) ?? [];

  // Infinite scroll observer for movie search
  const sentinelRef = useRef<HTMLDivElement>(null);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage],
  );

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(handleObserver, { threshold: 0.1 });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [handleObserver]);

  // Infinite scroll observer for director filmography
  const directorSentinelRef = useRef<HTMLDivElement>(null);

  const handleDirectorObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting && hasNextDirectorPage && !isFetchingNextDirectorPage) {
        fetchNextDirectorPage();
      }
    },
    [fetchNextDirectorPage, hasNextDirectorPage, isFetchingNextDirectorPage],
  );

  useEffect(() => {
    const sentinel = directorSentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(handleDirectorObserver, {
      threshold: 0.1,
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [handleDirectorObserver]);

  return (
    <CpcLayout>
      <div className="h-full flex flex-col">
        <Header />

        <div className="p-3 space-y-2">
          <SearchBar
            value={query}
            onChange={setQuery}
            placeholder="Search movies or directors on TMDB..."
          />
          <div className="flex items-center justify-end gap-1">
            <CpcButton
              size="xs"
              color={viewMode === 'list' ? 'cyan' : 'green'}
              onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
            >
              <ListIcon size="sm" />
            </CpcButton>
            <CpcButton
              size="xs"
              color={viewMode === 'grid' ? 'cyan' : 'green'}
              onClick={() => setViewMode(viewMode === 'grid' ? 'compact' : 'grid')}
            >
              <GridCompactIcon size="sm" />
            </CpcButton>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-auto px-3 pb-3">
          {!isSearching ? (
            <div className="flex flex-col gap-6">
              <NearbyMoviesSection
                viewMode={viewMode}
                gridClassName={gridClasses[viewMode]}
                collectionKeys={collectionKeys}
              />
              {loadingNowPlaying ? (
                <div className="text-center py-12 text-cpc-cyan-500">LOADING...</div>
              ) : nowPlayingResults.length > 0 ? (
                <div>
                  <div className="text-cpc-cyan-500 text-xs font-bold mb-2 tracking-wider">
                    SORTIES RÉCENTES
                  </div>
                  <div className={gridClasses[viewMode]}>
                    {nowPlayingResults.map((result) => (
                      <SearchResultCard
                        key={`now-playing-${result.id}`}
                        result={result}
                        viewMode={viewMode}
                        inCollection={collectionKeys.has(`movie:${result.id}`)}
                      />
                    ))}
                  </div>
                  <div ref={nowPlayingSentinelRef} className="h-8 flex items-center justify-center">
                    {isFetchingNextNowPlayingPage && (
                      <span className="text-cpc-cyan-500 text-xs">LOADING MORE...</span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-cpc-green-900">
                  <div className="text-lg mb-2">SEARCH MOVIES</div>
                  <div className="text-sm">Type a movie title or director name to search TMDB</div>
                </div>
              )}
            </div>
          ) : searching ? (
            <div className="text-center py-12 text-cpc-cyan-500">SEARCHING...</div>
          ) : (
            <>
              {/* Director filmography section */}
              {director && directorResults.length > 0 && (
                <div className="mb-6">
                  <div className="text-cpc-cyan-500 text-xs font-bold mb-2 tracking-wider">
                    FILMS DE {director.name.toUpperCase()}
                  </div>
                  <div className={gridClasses[viewMode]}>
                    {directorResults.map((result) => (
                      <SearchResultCard
                        key={`director-${result.id}`}
                        result={result}
                        viewMode={viewMode}
                        inCollection={collectionKeys.has(
                          `${result.media_type ?? 'movie'}:${result.id}`,
                        )}
                      />
                    ))}
                  </div>

                  <div ref={directorSentinelRef} className="h-8 flex items-center justify-center">
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
                <div>
                  <div className="text-cpc-green-900 text-xs mb-2">
                    {totalResults} RESULT{totalResults !== 1 ? 'S' : ''}
                  </div>
                  <div className={gridClasses[viewMode]}>
                    {results.map((result) => (
                      <SearchResultCard
                        key={result.id}
                        result={result}
                        viewMode={viewMode}
                        inCollection={collectionKeys.has(
                          `${result.media_type ?? 'movie'}:${result.id}`,
                        )}
                      />
                    ))}
                  </div>

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
  );
}
