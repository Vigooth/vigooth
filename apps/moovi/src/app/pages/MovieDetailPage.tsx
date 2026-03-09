import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { CpcLayout } from '@vigooth/ui'
import tw from 'twin.macro'
import { useMovieQuery, useUpdateMovie, useDeleteMovie } from '@/hooks/useMoviesQuery'
import { useAllocineRatings } from '@/hooks/useAllocineRatings'
import { Header } from '@/components/layout/Header'
import { RatingBadge } from '@/components/movies/RatingBadge'
import { PersonalRating } from '@/components/movies/PersonalRating'
import { ExternalLinks } from '@/components/movies/ExternalLinks'
import { getBackdropUrl, getPosterUrl } from '@/utils/tmdbImage'
import { parseGenres, formatRuntime } from '@/utils/ratings'

export function MovieDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: movie, isLoading, isError } = useMovieQuery(id!)
  const updateMovie = useUpdateMovie()
  const deleteMovie = useDeleteMovie()
  const { data: allocine } = useAllocineRatings(movie?.imdb_id || null)

  const [notes, setNotes] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  if (isLoading) {
    return (
      <CpcLayout>
        <div tw="h-full flex flex-col">
          <Header />
          <div tw="flex-1 flex items-center justify-center">
            <div tw="text-cpc-cyan-500">LOADING...</div>
          </div>
        </div>
      </CpcLayout>
    )
  }

  if (isError || !movie) {
    return (
      <CpcLayout>
        <div tw="h-full flex flex-col">
          <Header />
          <div tw="flex-1 flex items-center justify-center">
            <div tw="text-cpc-red-500">MOVIE NOT FOUND</div>
          </div>
        </div>
      </CpcLayout>
    )
  }

  const backdropUrl = getBackdropUrl(movie.backdrop_path)
  const posterUrl = getPosterUrl(movie.poster_path, 'w342')
  const genres = parseGenres(movie.genres)
  const runtime = formatRuntime(movie.runtime)
  const currentNotes = notes ?? movie.notes

  const handleRatingChange = (value: number | null) => {
    updateMovie.mutate({ id: movie.id, payload: { personal_rating: value } })
  }

  const handleNotesBlur = () => {
    if (notes !== null && notes !== movie.notes) {
      updateMovie.mutate({ id: movie.id, payload: { notes } })
    }
  }

  const handleDelete = async () => {
    await deleteMovie.mutateAsync(movie.id)
    navigate('/collection')
  }

  return (
    <CpcLayout>
      <div tw="h-full flex flex-col">
        <Header />

        <div tw="flex-1 overflow-auto">
          {/* Backdrop */}
          {backdropUrl && (
            <div tw="relative h-48 md:h-64 overflow-hidden">
              <img
                src={backdropUrl}
                alt=""
                tw="w-full h-full object-cover opacity-30"
              />
              <div tw="absolute inset-0 bg-gradient-to-b from-transparent to-black" />
            </div>
          )}

          <div tw="p-4 max-w-4xl mx-auto" css={backdropUrl ? tw`-mt-20 relative` : undefined}>
            <div tw="flex gap-4 mb-6">
              {/* Poster */}
              {posterUrl && (
                <div tw="w-32 md:w-48 flex-shrink-0">
                  <img
                    src={posterUrl}
                    alt={movie.title}
                    tw="w-full border-2 border-cpc-green-500"
                  />
                </div>
              )}

              {/* Main info */}
              <div tw="flex-1 min-w-0">
                <h1 tw="text-cpc-cyan-500 text-xl md:text-2xl font-bold">{movie.title}</h1>
                {movie.original_title && movie.original_title !== movie.title && (
                  <div tw="text-cpc-green-900 text-sm">{movie.original_title}</div>
                )}

                <div tw="text-cpc-green-500 text-sm mt-1 flex flex-wrap gap-2 items-center">
                  <span>{movie.year}</span>
                  {movie.director && (
                    <>
                      <span tw="text-cpc-green-900">|</span>
                      <span>{movie.director}</span>
                    </>
                  )}
                  {runtime && (
                    <>
                      <span tw="text-cpc-green-900">|</span>
                      <span>{runtime}</span>
                    </>
                  )}
                </div>

                {/* Genres */}
                {genres.length > 0 && (
                  <div tw="flex flex-wrap gap-1 mt-2">
                    {genres.map((genre) => (
                      <span
                        key={genre}
                        tw="border border-cpc-green-900 text-cpc-green-500 px-2 py-0.5 text-xs"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                )}

                {/* Ratings */}
                <div tw="flex flex-wrap gap-3 mt-3">
                  <RatingBadge label="IMDb" value={movie.imdb_rating} max={10} />
                  <RatingBadge label="Metascore" value={movie.metascore} max={100} />
                  <RatingBadge label="RT" value={movie.rotten_tomatoes} max={100} suffix="%" />
                  <RatingBadge label="AC Presse" value={allocine?.press ?? null} max={5} />
                  <RatingBadge label="AC Spect." value={allocine?.spectateurs ?? null} max={5} />
                </div>

                {/* External links */}
                <div tw="mt-3">
                  <ExternalLinks
                    imdbId={movie.imdb_id || null}
                    tmdbId={movie.tmdb_id}
                    title={movie.title}
                    year={movie.year}
                    allocineId={allocine?.allocine_id}
                  />
                </div>
              </div>
            </div>

            {/* Overview */}
            {movie.overview && (
              <div tw="mb-6">
                <div tw="text-cpc-cyan-500 text-sm font-bold mb-1">SYNOPSIS</div>
                <div tw="text-cpc-green-500 text-sm leading-relaxed">{movie.overview}</div>
              </div>
            )}

            {/* Personal rating */}
            <div tw="mb-6">
              <PersonalRating
                value={movie.personal_rating}
                onChange={handleRatingChange}
                disabled={updateMovie.isPending}
              />
            </div>

            {/* Notes */}
            <div tw="mb-6">
              <div tw="text-cpc-cyan-500 text-sm mb-2">NOTES</div>
              <textarea
                value={currentNotes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={handleNotesBlur}
                placeholder="Add your notes..."
                tw="w-full bg-transparent border-2 border-cpc-green-900 text-cpc-green-500 px-3 py-2 font-cpc outline-none focus:border-cpc-cyan-500 placeholder:text-cpc-green-900 min-h-[80px] resize-y text-sm"
              />
            </div>

            {/* Delete */}
            <div tw="border-t-2 border-cpc-green-900 pt-4">
              {showDeleteConfirm ? (
                <div tw="flex items-center gap-3">
                  <span tw="text-cpc-red-500 text-sm">CONFIRM DELETE?</span>
                  <button
                    onClick={handleDelete}
                    disabled={deleteMovie.isPending}
                    tw="border-2 border-cpc-red-500 text-cpc-red-500 px-3 py-1 text-xs hover:bg-cpc-red-500 hover:text-black transition-colors"
                  >
                    {deleteMovie.isPending ? 'DELETING...' : 'YES, DELETE'}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    tw="border-2 border-cpc-green-500 text-cpc-green-500 px-3 py-1 text-xs hover:bg-cpc-green-500 hover:text-black transition-colors"
                  >
                    CANCEL
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  tw="border-2 border-cpc-red-500 text-cpc-red-500 px-3 py-1 text-xs hover:bg-cpc-red-500 hover:text-black transition-colors"
                >
                  REMOVE FROM COLLECTION
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </CpcLayout>
  )
}
