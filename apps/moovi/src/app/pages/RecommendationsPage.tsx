import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import tw from 'twin.macro'
import { CpcLayout } from '@vigooth/ui'
import { useAuth } from '@/stores/auth'
import { useMoviesQuery } from '@/hooks/useMoviesQuery'
import { useRecommendations } from '@/hooks/useRecommendations'
import { Header } from '@/components/layout/Header'
import { getPosterUrl } from '@/utils/tmdbImage'
import type { Recommendation } from '@/lib/api/recommendations'

const RATING_PRESETS = [
  { label: 'TOUTES', value: 0 },
  { label: '5+', value: 5 },
  { label: '6+', value: 6 },
  { label: '7+', value: 7 },
  { label: '8+', value: 8 },
] as const

export function RecommendationsPage() {
  const navigate = useNavigate()
  const { logout } = useAuth()

  const { data } = useMoviesQuery({
    onAuthError: () => {
      logout()
      navigate('/login')
    },
  })

  const {
    recommendations, events, isLoading, error, tokens,
    history, activeHistoryIndex, selectHistoryEntry,
    generate, generateSimple, cancel,
  } = useRecommendations()

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showPicker, setShowPicker] = useState(false)
  const [vibe, setVibe] = useState(50)
  const [minRating, setMinRating] = useState(0)

  const toggleMovie = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const allMovies = data?.movies ?? []

  const filteredMovies = allMovies.filter((m) => {
    if (minRating > 0) {
      if (!m.personal_rating || m.personal_rating < minRating) return false
    }
    return true
  })

  const hasFilters = minRating > 0
  const movieIds = selectedIds.size > 0
    ? Array.from(selectedIds)
    : hasFilters
      ? filteredMovies.map((m) => m.id)
      : []

  const handleGenerate = () => {
    generateSimple(movieIds, vibe)
    setShowPicker(false)
  }

  const handleGenerateIA = () => {
    generate(movieIds, vibe)
    setShowPicker(false)
  }

  const movies = filteredMovies

  return (
    <CpcLayout>
      <div tw="h-full flex flex-col">
        <Header />

        <div tw="flex-1 overflow-auto p-3">
          {/* Title + History select */}
          <div tw="flex items-center justify-between mb-4">
            <div tw="text-cpc-cyan-500 text-sm font-bold">RECOMMENDATIONS</div>
            {history.length > 0 && (
              <select
                value={activeHistoryIndex ?? ''}
                onChange={(e) => {
                  const idx = Number(e.target.value)
                  if (!isNaN(idx)) selectHistoryEntry(idx)
                }}
                tw="bg-black border border-cpc-green-900 text-cpc-green-500 text-xs px-2 py-1 outline-none cursor-pointer"
              >
                {history.map((entry, i) => (
                  <option key={entry.id} value={i}>
                    #{i + 1} — {new Date(entry.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Config panel */}
          {!isLoading && allMovies.length > 0 && (
            <div tw="border-2 border-cpc-green-900 p-3 mb-4">
              {/* Vibe slider */}
              <div tw="mb-3">
                <div tw="flex items-center justify-between mb-1">
                  <span tw="text-cpc-cyan-500 text-xs">NICHE</span>
                  <span tw="text-cpc-green-500 text-xs font-bold">
                    {vibe <= 20 ? '100% PÉPITES' : vibe <= 40 ? 'PLUTÔT NICHE' : vibe <= 60 ? 'ÉQUILIBRÉ' : vibe <= 80 ? 'PLUTÔT POPULAIRE' : '100% POPULAIRE'}
                  </span>
                  <span tw="text-cpc-yellow-500 text-xs">POPULAIRE</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={10}
                  value={vibe}
                  onChange={(e) => setVibe(Number(e.target.value))}
                  tw="w-full accent-cpc-cyan-500 cursor-pointer"
                />
              </div>

              {/* Rating filter */}
              <div tw="mb-3">
                <div tw="text-cpc-green-900 text-xs mb-1">NOTE PERSO</div>
                <div tw="flex gap-1">
                  {RATING_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      onClick={() => { setMinRating(preset.value); setSelectedIds(new Set()) }}
                      css={[
                        tw`border px-2 py-0.5 text-xs transition-colors`,
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

              {/* Collection filter */}
              <div tw="flex items-center justify-between mb-2">
                <button
                  onClick={() => setShowPicker((p) => !p)}
                  tw="text-cpc-green-900 text-xs hover:text-cpc-green-500 transition-colors"
                >
                  COLLECTION: {selectedIds.size > 0 ? (
                    <span tw="text-cpc-yellow-500">{selectedIds.size} FILM{selectedIds.size > 1 ? 'S' : ''}</span>
                  ) : hasFilters ? (
                    <span tw="text-cpc-yellow-500">{filteredMovies.length} FILM{filteredMovies.length !== 1 ? 'S' : ''}</span>
                  ) : (
                    <span tw="text-cpc-green-500">TOUT</span>
                  )}
                  {' '}{showPicker ? '▲' : '▼'}
                </button>
                {selectedIds.size > 0 && (
                  <button
                    onClick={() => setSelectedIds(new Set())}
                    tw="text-cpc-green-900 text-xs hover:text-cpc-red-500 transition-colors"
                  >
                    RESET
                  </button>
                )}
              </div>

              {/* Movie picker (expandable) */}
              {showPicker && (
                <div tw="flex flex-wrap gap-2 max-h-48 overflow-auto mb-3 pt-2 border-t border-cpc-green-900">
                  {movies.map((movie) => {
                    const selected = selectedIds.has(movie.id)
                    const poster = getPosterUrl(movie.poster_path, 'w92')
                    return (
                      <button
                        key={movie.id}
                        onClick={() => toggleMovie(movie.id)}
                        css={[
                          tw`border-2 flex items-center gap-2 px-2 py-1 text-xs transition-colors text-left`,
                          selected
                            ? tw`border-cpc-cyan-500 text-cpc-cyan-500`
                            : tw`border-cpc-green-900 text-cpc-green-500 hover:border-cpc-green-500`,
                        ]}
                      >
                        {poster && (
                          <img src={poster} alt="" tw="w-6 h-9 object-cover flex-shrink-0" />
                        )}
                        <span tw="truncate max-w-[150px]">{movie.title}</span>
                        {movie.personal_rating && (
                          <span tw="text-cpc-yellow-500 flex-shrink-0">{movie.personal_rating}/10</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Generate buttons */}
              <div tw="flex gap-3">
                <button
                  onClick={handleGenerate}
                  disabled={!data || allMovies.length === 0}
                  css={[
                    tw`border-2 px-6 py-2 text-xs font-bold transition-colors flex-1`,
                    data && allMovies.length > 0
                      ? tw`border-cpc-green-500 text-cpc-green-500 hover:bg-cpc-green-500 hover:text-black`
                      : tw`border-cpc-green-900 text-cpc-green-900 cursor-not-allowed`,
                  ]}
                >
                  GENERATE
                </button>
                <button
                  onClick={handleGenerateIA}
                  disabled={!data || allMovies.length === 0}
                  css={[
                    tw`border-2 px-6 py-2 text-xs font-bold transition-colors flex-1`,
                    data && allMovies.length > 0
                      ? tw`border-cpc-cyan-500 text-cpc-cyan-500 hover:bg-cpc-cyan-500 hover:text-black`
                      : tw`border-cpc-green-900 text-cpc-green-900 cursor-not-allowed`,
                  ]}
                >
                  GENERATE IA
                </button>
              </div>
            </div>
          )}

          {/* Cancel button during loading */}
          {isLoading && (
            <div tw="mb-4">
              <button
                onClick={cancel}
                tw="border-2 border-cpc-red-500 text-cpc-red-500 px-6 py-2 text-xs font-bold hover:bg-cpc-red-500 hover:text-black transition-colors w-full"
              >
                CANCEL
              </button>
            </div>
          )}


          {!data || allMovies.length === 0 ? (
            <div tw="text-cpc-green-900 text-xs">
              ADD MOVIES TO YOUR COLLECTION FIRST TO GET RECOMMENDATIONS
            </div>
          ) : null}

          {/* Progress log */}
          {events.length > 0 && (
            <div tw="border-2 border-cpc-green-900 p-3 mb-4 max-h-48 overflow-auto">
              <div tw="flex items-center justify-between mb-2">
                <div tw="text-cpc-green-900 text-xs">AGENT LOG</div>
                {tokens && (
                  <div tw="text-cpc-yellow-500 text-xs">
                    TOKENS: {tokens.total_tokens.toLocaleString()}
                    {tokens.input_tokens > 0 && ` (in: ${tokens.input_tokens.toLocaleString()} / out: ${tokens.output_tokens.toLocaleString()})`}
                  </div>
                )}
              </div>
              {events
                .filter((e) => e.type !== 'recommendation' && e.type !== 'done')
                .map((event, i) => (
                  <div key={i} tw="text-xs mb-1" css={[eventColor(event.type)]}>
                    <span tw="text-cpc-green-900">[{event.type.toUpperCase()}]</span>{' '}
                    {event.message}
                  </div>
                ))}
              {isLoading && (
                <div tw="text-cpc-cyan-500 text-xs animate-pulse">...</div>
              )}
            </div>
          )}

          {error && (
            <div tw="border-2 border-cpc-red-500 p-3 mb-4">
              <div tw="text-cpc-red-500 text-xs">ERROR: {error}</div>
            </div>
          )}

          {/* Recommendations grid */}
          {recommendations.length > 0 && (
            <>
              <div tw="text-cpc-green-900 text-xs mb-3">
                {recommendations.length} RECOMMENDATION{recommendations.length !== 1 ? 'S' : ''}{' '}
                {isLoading ? 'SO FAR...' : 'FOUND'}
              </div>
              <div tw="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recommendations.map((rec, i) => (
                  <RecommendationCard key={i} recommendation={rec} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </CpcLayout>
  )
}

function eventColor(type: string) {
  switch (type) {
    case 'thinking':
      return tw`text-cpc-cyan-500`
    case 'tool_call':
      return tw`text-cpc-green-500`
    case 'error':
      return tw`text-cpc-red-500`
    default:
      return tw`text-cpc-green-500`
  }
}

function RecommendationCard({ recommendation }: { recommendation: Recommendation }) {
  const navigate = useNavigate()
  const posterUrl = recommendation.poster_path
    ? getPosterUrl(recommendation.poster_path, 'w342')
    : null

  const handleClick = () => {
    if (recommendation.tmdb_id) {
      navigate(`/movie/${recommendation.tmdb_id}`)
    }
  }

  return (
    <div
      onClick={handleClick}
      css={[
        tw`border-2 border-cpc-green-900 hover:border-cpc-cyan-500 transition-colors`,
        !!recommendation.tmdb_id && tw`cursor-pointer`,
      ]}
    >
      <div tw="flex">
        {/* Poster */}
        <div tw="w-24 min-h-[144px] bg-cpc-grey-900 flex-shrink-0">
          {posterUrl ? (
            <img
              src={posterUrl}
              alt={recommendation.title}
              tw="w-full h-full object-cover"
            />
          ) : (
            <div tw="w-full h-full flex items-center justify-center text-cpc-green-900 text-xs">
              NO IMG
            </div>
          )}
        </div>

        {/* Info */}
        <div tw="p-3 flex-1 min-w-0">
          <div tw="text-cpc-cyan-500 text-sm font-bold truncate">
            {recommendation.title}
          </div>
          <div tw="text-cpc-green-900 text-xs mb-2">
            {recommendation.year || ''}
          </div>
          <div tw="text-cpc-green-500 text-xs leading-relaxed">
            {recommendation.reason}
          </div>
          {recommendation.allocine_url && (
            <a
              href={recommendation.allocine_url}
              target="_blank"
              rel="noopener noreferrer"
              tw="text-cpc-yellow-500 text-xs mt-2 inline-block hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              ALLOCINE
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
