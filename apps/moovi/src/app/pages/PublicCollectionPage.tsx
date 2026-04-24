import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Drawer } from "@base-ui/react/drawer";
import { CpcLayout, cn, ListIcon, GridCompactIcon, CpcMenu, CpcMenuItem } from "@vigooth/ui";
import { getAppsConfig } from "@vigooth/config";
import { useAuth } from "@/stores/auth";
import { usePublicCollectionQuery } from "@/hooks/usePublicCollectionQuery";
import { useMyTmdbIds } from "@/hooks/useMyTmdbIds";
import { useDebounce } from "@/hooks/useDebounce";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { useQueryParam, useQueryParamNumber } from "@/hooks/useQueryParam";
import { SearchBar } from "@/components/search/SearchBar";
import { MovieGrid } from "@/components/movies/MovieGrid";
import { PublicMovieDetails } from "@/components/movies/PublicMovieDetails";
import type { Movie } from "@/types/movie";

type CompareFilter = "all" | "common" | "unique";

export function PublicCollectionPage() {
  const { userId } = useParams<{ userId: string }>();
  const { isAuthenticated } = useAuth();
  const [drawerMovie, setDrawerMovie] = useState<Movie | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [search, setSearch] = useQueryParam("q");
  const [minRating, setMinRating] = useQueryParamNumber("rating");
  const [viewMode, setViewMode] = useState<"grid" | "list" | "compact">("grid");
  const [compareFilter, setCompareFilter] = useState<CompareFilter>("all");
  const debouncedSearch = useDebounce(search, 300);

  const otherApps = getAppsConfig("movies");
  const { data: myTmdbIds } = useMyTmdbIds();

  const openDrawer = (movie: Movie) => {
    setDrawerMovie(movie);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
  };

  const {
    movies: allMovies,
    total,
    isLoading,
    isError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = usePublicCollectionQuery(userId!, {
    search: debouncedSearch,
    minRating,
  });

  const movies = useMemo(() => {
    if (compareFilter === "all" || !myTmdbIds) return allMovies;
    if (compareFilter === "common") return allMovies.filter((m) => myTmdbIds.has(m.tmdb_id));
    return allMovies.filter((m) => !myTmdbIds.has(m.tmdb_id));
  }, [allMovies, compareFilter, myTmdbIds]);

  const { scrollRef, sentinelRef } = useInfiniteScroll({
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  });

  const compareFilters: { label: string; value: CompareFilter }[] = [
    { label: "TOUS", value: "all" },
    { label: "EN COMMUN", value: "common" },
    { label: "PAS DANS MA COLLECTION", value: "unique" },
  ];

  return (
    <CpcLayout>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center p-3 border-b-2 border-cpc-green-500 gap-4">
          <CpcMenu
            color="cyan"
            trigger={
              <button className="text-cpc-cyan-500 font-bold shrink-0 cursor-pointer hover:text-cpc-yellow-500 transition-colors">
                MOOVI
              </button>
            }
          >
            {otherApps.map((app) => (
              <CpcMenuItem
                key={app.id}
                onClick={() => {
                  window.location.href = app.url;
                }}
              >
                {app.name}
              </CpcMenuItem>
            ))}
          </CpcMenu>
          <span className="text-cpc-green-500 text-sm">PUBLIC COLLECTION</span>
        </div>

        <div className="p-3 space-y-2">
          <SearchBar value={search} onChange={setSearch} placeholder="Search collection..." />

          {/* Compare filter (only when logged in) */}
          {isAuthenticated && myTmdbIds && (
            <div className="flex gap-1 overflow-x-auto scrollbar-none">
              {compareFilters.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setCompareFilter(f.value)}
                  className={cn(
                    "border px-3 py-1 text-xs transition-colors whitespace-nowrap",
                    compareFilter === f.value
                      ? "border-cpc-magenta-500 text-cpc-magenta-500"
                      : "border-cpc-green-900 text-cpc-green-900 hover:text-cpc-green-500 hover:border-cpc-green-500",
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {[
                { label: "TOUT", value: 0 },
                { label: "5+", value: 5 },
                { label: "6+", value: 6 },
                { label: "7+", value: 7 },
                { label: "8+", value: 8 },
              ].map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => setMinRating(preset.value)}
                  className={cn(
                    "border px-3 py-1 text-xs transition-colors",
                    minRating === preset.value
                      ? "border-cpc-cyan-500 text-cpc-cyan-500"
                      : "border-cpc-green-900 text-cpc-green-900 hover:text-cpc-green-500 hover:border-cpc-green-500",
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setViewMode(viewMode === "list" ? "grid" : "list")}
                className={cn(
                  "border p-1.5 transition-colors",
                  viewMode === "list"
                    ? "border-cpc-cyan-500 text-cpc-cyan-500"
                    : "border-cpc-green-900 text-cpc-green-900 hover:text-cpc-green-500 hover:border-cpc-green-500",
                )}
              >
                <ListIcon size="sm" />
              </button>
              <button
                onClick={() => setViewMode(viewMode === "compact" ? "grid" : "compact")}
                className={cn(
                  "border p-1.5 transition-colors",
                  viewMode === "compact"
                    ? "border-cpc-cyan-500 text-cpc-cyan-500"
                    : "border-cpc-green-900 text-cpc-green-900 hover:text-cpc-green-500 hover:border-cpc-green-500",
                )}
              >
                <GridCompactIcon size="sm" />
              </button>
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
              <div className="text-cpc-red-500">COLLECTION NOT FOUND</div>
            </div>
          ) : (
            <>
              <div className="text-cpc-green-500 text-xs mb-3">
                {compareFilter !== "all"
                  ? `${movies.length}/${total}`
                  : debouncedSearch || minRating > 0
                    ? `${movies.length}/${total}`
                    : `${total}`}{" "}
                MOVIE{total !== 1 ? "S" : ""}{" "}
                {compareFilter === "common"
                  ? "EN COMMUN"
                  : compareFilter === "unique"
                    ? "PAS DANS MA COLLECTION"
                    : "IN COLLECTION"}
              </div>
              <MovieGrid
                movies={movies}
                viewMode={viewMode}
                onMovieClick={openDrawer}
                emptyMessage={
                  compareFilter === "common"
                    ? "AUCUN FILM EN COMMUN"
                    : compareFilter === "unique"
                      ? "TOUS SES FILMS SONT DANS TA COLLECTION"
                      : debouncedSearch || minRating > 0
                        ? "NO RESULTS"
                        : "EMPTY COLLECTION"
                }
              />
              <div ref={sentinelRef} className="h-4" />
              {isFetchingNextPage && (
                <div className="text-center py-3 text-cpc-cyan-500 text-xs">LOADING MORE...</div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Movie detail drawer (read-only) */}
      {drawerMovie && (
        <Drawer.Root
          open={drawerOpen}
          onOpenChange={(open) => {
            if (!open) closeDrawer();
          }}
          swipeDirection="right"
        >
          <Drawer.Portal>
            <Drawer.Backdrop className="moovi-drawer-backdrop" />
            <Drawer.Viewport>
              <Drawer.Popup className="moovi-drawer-popup md:w-[600px] lg:w-[700px]">
                <div className="absolute top-3 right-3 z-20">
                  <Drawer.Close className="border-2 border-cpc-green-500 text-cpc-green-500 px-3 py-1 text-xs hover:bg-cpc-green-500 hover:text-cpc-grey-900 transition-colors cursor-pointer">
                    X
                  </Drawer.Close>
                </div>
                <Drawer.Title className="sr-only">{drawerMovie.title}</Drawer.Title>
                <Drawer.Description className="sr-only">
                  {drawerMovie.title} details
                </Drawer.Description>
                <Drawer.Content className="flex-1 overflow-y-auto" key={drawerMovie.id}>
                  <PublicMovieDetails movie={drawerMovie} />
                </Drawer.Content>
              </Drawer.Popup>
            </Drawer.Viewport>
          </Drawer.Portal>
        </Drawer.Root>
      )}
    </CpcLayout>
  );
}
