import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CpcButton, CpcLayout, cn } from '@vigooth/ui';
import { useAuth } from '@/stores/auth';
import { useMoviesQuery } from '@/hooks/useMoviesQuery';
import { useRecommendations } from '@/hooks/useRecommendations';
import { Header } from '@/components/layout/Header';
import { getPosterUrl } from '@/utils/tmdbImage';
import type { Recommendation } from '@/lib/api/recommendations';

const RATING_PRESETS = [
  { label: 'TOUTES', value: 0 },
  { label: '5+', value: 5 },
  { label: '6+', value: 6 },
  { label: '7+', value: 7 },
  { label: '8+', value: 8 },
] as const;

export function RecommendationsPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const { data } = useMoviesQuery({
    onAuthError: () => {
      logout();
      navigate('/login');
    },
  });

  const {
    recommendations,
    events,
    isLoading,
    error,
    tokens,
    history,
    activeHistoryIndex,
    selectHistoryEntry,
    generate,
    generateSimple,
    cancel,
  } = useRecommendations();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showPicker, setShowPicker] = useState(false);
  const [vibe, setVibe] = useState(50);
  const [minRating, setMinRating] = useState(0);
  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');

  const toggleMovie = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allMovies = data?.movies ?? [];

  const fromYear = yearFrom ? parseInt(yearFrom, 10) : undefined;
  const toYear = yearTo ? parseInt(yearTo, 10) : undefined;

  const filteredMovies = allMovies.filter((m) => {
    if (minRating > 0) {
      if (!m.personal_rating || m.personal_rating < minRating) return false;
    }
    return true;
  });

  const hasFilters = minRating > 0;
  const movieIds =
    selectedIds.size > 0
      ? Array.from(selectedIds)
      : hasFilters
        ? filteredMovies.map((m) => m.id)
        : [];

  const handleGenerate = () => {
    generateSimple(movieIds, vibe, fromYear, toYear);
    setShowPicker(false);
  };

  const handleGenerateIA = () => {
    generate(movieIds, vibe, fromYear, toYear);
    setShowPicker(false);
  };

  const movies = filteredMovies;

  return (
    <CpcLayout>
      <div className="h-full flex flex-col">
        <Header />

        <div className="flex-1 overflow-auto p-3">
          {/* Title + History select */}
          <div className="flex items-center justify-between mb-4">
            <div className="text-cpc-cyan-500 text-sm font-bold">RECOMMENDATIONS</div>
            {history.length > 0 && (
              <select
                value={activeHistoryIndex ?? ''}
                onChange={(e) => {
                  const idx = Number(e.target.value);
                  if (!isNaN(idx)) selectHistoryEntry(idx);
                }}
                className="bg-black border border-cpc-green-900 text-cpc-green-500 text-xs px-2 py-1 outline-none cursor-pointer"
              >
                {history.map((entry, i) => (
                  <option key={entry.id} value={i}>
                    #{i + 1} —{' '}
                    {new Date(entry.created_at).toLocaleString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Config panel */}
          {!isLoading && allMovies.length > 0 && (
            <div className="border-2 border-cpc-green-900 p-3 mb-4">
              {/* Vibe slider */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-cpc-cyan-500 text-xs">NICHE</span>
                  <span className="text-cpc-green-500 text-xs font-bold">
                    {vibe <= 20
                      ? '100% PEPITES'
                      : vibe <= 40
                        ? 'PLUTOT NICHE'
                        : vibe <= 60
                          ? 'EQUILIBRE'
                          : vibe <= 80
                            ? 'PLUTOT POPULAIRE'
                            : '100% POPULAIRE'}
                  </span>
                  <span className="text-cpc-yellow-500 text-xs">POPULAIRE</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={10}
                  value={vibe}
                  onChange={(e) => setVibe(Number(e.target.value))}
                  className="w-full accent-cpc-cyan-500 cursor-pointer"
                />
              </div>

              {/* Rating filter */}
              <div className="mb-3">
                <div className="text-cpc-green-900 text-xs mb-1">NOTE PERSO</div>
                <div className="flex gap-1">
                  {RATING_PRESETS.map((preset) => (
                    <CpcButton
                      key={preset.value}
                      size="xs"
                      color={minRating === preset.value ? 'cyan' : 'green'}
                      onClick={() => {
                        setMinRating(preset.value);
                        setSelectedIds(new Set());
                      }}
                    >
                      {preset.label}
                    </CpcButton>
                  ))}
                </div>
              </div>

              {/* Year range filter */}
              <div className="mb-3">
                <div className="text-cpc-green-900 text-xs mb-1">ANNEE</div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="De"
                    value={yearFrom}
                    onChange={(e) => setYearFrom(e.target.value)}
                    className="bg-black border border-cpc-green-900 text-cpc-green-500 text-xs px-2 py-1 w-20 outline-none focus:border-cpc-cyan-500"
                  />
                  <span className="text-cpc-green-900 text-xs">{'\u2192'}</span>
                  <input
                    type="number"
                    placeholder="A"
                    value={yearTo}
                    onChange={(e) => setYearTo(e.target.value)}
                    className="bg-black border border-cpc-green-900 text-cpc-green-500 text-xs px-2 py-1 w-20 outline-none focus:border-cpc-cyan-500"
                  />
                  {(yearFrom || yearTo) && (
                    <CpcButton
                      size="xs"
                      variant="text"
                      color="red"
                      onClick={() => {
                        setYearFrom('');
                        setYearTo('');
                      }}
                    >
                      RESET
                    </CpcButton>
                  )}
                </div>
              </div>

              {/* Collection filter */}
              <div className="flex items-center justify-between mb-2">
                <CpcButton
                  size="xs"
                  variant="text"
                  color="green"
                  onClick={() => setShowPicker((p) => !p)}
                >
                  COLLECTION:{' '}
                  {selectedIds.size > 0 ? (
                    <span className="text-cpc-yellow-500">
                      {selectedIds.size} FILM{selectedIds.size > 1 ? 'S' : ''}
                    </span>
                  ) : hasFilters ? (
                    <span className="text-cpc-yellow-500">
                      {filteredMovies.length} FILM{filteredMovies.length !== 1 ? 'S' : ''}
                    </span>
                  ) : (
                    <span className="text-cpc-green-500">TOUT</span>
                  )}{' '}
                  {showPicker ? '\u25B2' : '\u25BC'}
                </CpcButton>
                {selectedIds.size > 0 && (
                  <CpcButton
                    size="xs"
                    variant="text"
                    color="red"
                    onClick={() => setSelectedIds(new Set())}
                  >
                    RESET
                  </CpcButton>
                )}
              </div>

              {/* Movie picker (expandable) */}
              {showPicker && (
                <div className="flex flex-wrap gap-2 max-h-48 overflow-auto mb-3 pt-2 border-t border-cpc-green-900">
                  {movies.map((movie) => {
                    const selected = selectedIds.has(movie.id);
                    const poster = getPosterUrl(movie.poster_path, 'w92');
                    return (
                      <CpcButton
                        key={movie.id}
                        size="xs"
                        color={selected ? 'cyan' : 'green'}
                        className="gap-2 text-left"
                        onClick={() => toggleMovie(movie.id)}
                      >
                        {poster && (
                          <img src={poster} alt="" className="w-6 h-9 object-cover flex-shrink-0" />
                        )}
                        <span className="truncate max-w-[150px]">{movie.title}</span>
                        {movie.personal_rating && (
                          <span className="text-cpc-yellow-500 flex-shrink-0">
                            {movie.personal_rating}/10
                          </span>
                        )}
                      </CpcButton>
                    );
                  })}
                </div>
              )}

              {/* Generate buttons */}
              <div className="flex gap-3">
                <CpcButton
                  size="md"
                  fullWidth
                  color="green"
                  className="justify-center font-bold"
                  onClick={handleGenerate}
                  disabled={!data || allMovies.length === 0}
                >
                  GENERATE
                </CpcButton>
                <CpcButton
                  size="md"
                  fullWidth
                  color="cyan"
                  className="justify-center font-bold"
                  onClick={handleGenerateIA}
                  disabled={!data || allMovies.length === 0}
                >
                  GENERATE IA
                </CpcButton>
              </div>
            </div>
          )}

          {/* Cancel button during loading */}
          {isLoading && (
            <div className="mb-4">
              <CpcButton
                size="md"
                fullWidth
                color="red"
                className="justify-center font-bold"
                onClick={cancel}
              >
                CANCEL
              </CpcButton>
            </div>
          )}

          {!data || allMovies.length === 0 ? (
            <div className="text-cpc-green-900 text-xs">
              ADD MOVIES TO YOUR COLLECTION FIRST TO GET RECOMMENDATIONS
            </div>
          ) : null}

          {/* Progress log */}
          {events.length > 0 && (
            <div className="border-2 border-cpc-green-900 p-3 mb-4 max-h-48 overflow-auto">
              <div className="flex items-center justify-between mb-2">
                <div className="text-cpc-green-900 text-xs">AGENT LOG</div>
                {tokens && (
                  <div className="text-cpc-yellow-500 text-xs">
                    TOKENS: {tokens.total_tokens.toLocaleString()}
                    {tokens.input_tokens > 0 &&
                      ` (in: ${tokens.input_tokens.toLocaleString()} / out: ${tokens.output_tokens.toLocaleString()})`}
                  </div>
                )}
              </div>
              {events
                .filter((e) => e.type !== 'recommendation' && e.type !== 'done')
                .map((event, i) => (
                  <div key={i} className={cn('text-xs mb-1', eventColor(event.type))}>
                    <span className="text-cpc-green-900">[{event.type.toUpperCase()}]</span>{' '}
                    {event.message}
                  </div>
                ))}
              {isLoading && <div className="text-cpc-cyan-500 text-xs animate-pulse">...</div>}
            </div>
          )}

          {error && (
            <div className="border-2 border-cpc-red-500 p-3 mb-4">
              <div className="text-cpc-red-500 text-xs">ERROR: {error}</div>
            </div>
          )}

          {/* Recommendations grid */}
          {recommendations.length > 0 && (
            <>
              <div className="text-cpc-green-900 text-xs mb-3">
                {recommendations.length} RECOMMENDATION{recommendations.length !== 1 ? 'S' : ''}{' '}
                {isLoading ? 'SO FAR...' : 'FOUND'}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recommendations.map((rec, i) => (
                  <RecommendationCard key={i} recommendation={rec} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </CpcLayout>
  );
}

function eventColor(type: string) {
  switch (type) {
    case 'thinking':
      return 'text-cpc-cyan-500';
    case 'tool_call':
      return 'text-cpc-green-500';
    case 'error':
      return 'text-cpc-red-500';
    default:
      return 'text-cpc-green-500';
  }
}

function RecommendationCard({ recommendation }: { recommendation: Recommendation }) {
  const navigate = useNavigate();
  const posterUrl = recommendation.poster_path
    ? getPosterUrl(recommendation.poster_path, 'w342')
    : null;

  const handleClick = () => {
    if (recommendation.tmdb_id) {
      navigate(`/movie/${recommendation.tmdb_id}`);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        'border-2 border-cpc-green-900 hover:border-cpc-cyan-500 transition-colors',
        !!recommendation.tmdb_id && 'cursor-pointer',
      )}
    >
      <div className="flex">
        {/* Poster */}
        <div className="w-24 min-h-[144px] bg-cpc-grey-900 flex-shrink-0">
          {posterUrl ? (
            <img
              src={posterUrl}
              alt={recommendation.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-cpc-green-900 text-xs">
              NO IMG
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-3 flex-1 min-w-0">
          <div className="text-cpc-cyan-500 text-sm font-bold truncate">{recommendation.title}</div>
          <div className="text-cpc-green-900 text-xs mb-2">{recommendation.year || ''}</div>
          <div className="text-cpc-green-500 text-xs leading-relaxed">{recommendation.reason}</div>
          {recommendation.allocine_url && (
            <a
              href={recommendation.allocine_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cpc-yellow-500 text-xs mt-2 inline-block hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              ALLOCINE
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
