import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CpcButton, CpcLayout, ListIcon, GridCompactIcon } from '@vigooth/ui';
import { useAuth } from '@/stores/auth';
import { useMoviesQuery } from '@/hooks/useMoviesQuery';
import { useBackfillOverviews } from '@/hooks/useBackfillOverviews';
import { useDebounce } from '@/hooks/useDebounce';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { useQueryParam, useQueryParamNumber } from '@/hooks/useQueryParam';
import { Header } from '@/components/layout/Header';
import { SearchBar } from '@/components/search/SearchBar';
import { MovieGrid } from '@/components/movies/MovieGrid';
import { MovieDrawer } from '@/components/movies/MovieDrawer';
import type { Movie } from '@/types/movie';

export function CollectionPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [drawerMovie, setDrawerMovie] = useState<Movie | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [search, setSearch] = useQueryParam('q');
  const [minRating, setMinRating] = useQueryParamNumber('rating');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'compact'>('grid');
  useBackfillOverviews();
  const debouncedSearch = useDebounce(search, 300);

  const openDrawer = (movie: Movie) => {
    setDrawerMovie(movie);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
  };

  const onAuthError = useCallback(() => {
    logout();
    navigate('/login');
  }, [logout, navigate]);

  const { movies, total, isLoading, isError, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useMoviesQuery({
      search: debouncedSearch,
      minRating,
      onAuthError,
    });

  const { scrollRef, sentinelRef } = useInfiniteScroll({
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  });

  return (
    <CpcLayout>
      <div className="h-full flex flex-col">
        <Header />

        <div className="p-3 space-y-2">
          <SearchBar value={search} onChange={setSearch} placeholder="Search collection..." />
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {[
                { label: 'TOUT', value: 0 },
                { label: '5+', value: 5 },
                { label: '6+', value: 6 },
                { label: '7+', value: 7 },
                { label: '8+', value: 8 },
              ].map((preset) => (
                <CpcButton
                  key={preset.value}
                  size="xs"
                  color={minRating === preset.value ? 'cyan' : 'green'}
                  onClick={() => setMinRating(preset.value)}
                >
                  {preset.label}
                </CpcButton>
              ))}
            </div>
            <div className="flex gap-1">
              <CpcButton
                size="xs"
                color={viewMode === 'list' ? 'cyan' : 'green'}
                onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
              >
                <ListIcon size="sm" />
              </CpcButton>
              <CpcButton
                size="xs"
                color={viewMode === 'compact' ? 'cyan' : 'green'}
                onClick={() => setViewMode(viewMode === 'compact' ? 'grid' : 'compact')}
              >
                <GridCompactIcon size="sm" />
              </CpcButton>
            </div>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-auto px-3 pb-3">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-cpc-cyan-500">LOADING COLLECTION...</div>
            </div>
          ) : isError ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-cpc-red-500">ERROR LOADING COLLECTION</div>
            </div>
          ) : (
            <>
              <div className="text-cpc-green-500 text-xs mb-3">
                {debouncedSearch || minRating > 0 ? `${movies.length}/${total}` : `${total}`} MOVIE
                {total !== 1 ? 'S' : ''} IN COLLECTION
              </div>
              <MovieGrid
                movies={movies}
                viewMode={viewMode}
                onMovieClick={openDrawer}
                emptyMessage={debouncedSearch || minRating > 0 ? 'NO RESULTS' : 'NO MOVIES YET'}
              />
              <div ref={sentinelRef} className="h-4" />
              {isFetchingNextPage && (
                <div className="text-center py-3 text-cpc-cyan-500 text-xs">LOADING MORE...</div>
              )}
            </>
          )}
        </div>
      </div>

      <MovieDrawer
        movie={drawerMovie}
        open={drawerOpen}
        onOpenChange={(open) => {
          if (!open) closeDrawer();
        }}
        onDeleted={closeDrawer}
      />
    </CpcLayout>
  );
}
