import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { CpcLayout } from '@vigooth/ui'
import tw from 'twin.macro'
import { useTmdbMovieDetail, useTmdbMovieCredits } from '@/hooks/useTmdbSearch'
import { useOmdbRatings } from '@/hooks/useOmdbRatings'
import { useAllocineRatings } from '@/hooks/useAllocineRatings'
import {
  useMoviesQuery,
  useAddMovie,
  useUpdateMovie,
  useDeleteMovie,
} from '@/hooks/useMoviesQuery'
import { useIsInWishlist, useAddToWishlist, useRemoveFromWishlist } from '@/hooks/useWishlist'
import { Header } from '@/components/layout/Header'
import { RatingBadge } from '@/components/movies/RatingBadge'
import { PersonalRating } from '@/components/movies/PersonalRating'
import { ExternalLinks } from '@/components/movies/ExternalLinks'
import { getBackdropUrl, getPosterUrl } from '@/utils/tmdbImage'
import { parseGenres, formatRuntime } from '@/utils/ratings'
import type { AddMoviePayload } from '@/types/movie'

export function MoviePage() {
  const { tmdbId: tmdbIdParam } = useParams<{ tmdbId: string }>()
  const navigate = useNavigate()
  const tmdbIdNum = tmdbIdParam ? parseInt(tmdbIdParam, 10) : null

  // TMDB data
  const { data: tmdbDetails, isLoading: loadingTmdb } = useTmdbMovieDetail(tmdbIdNum)
  const { data: credits } = useTmdbMovieCredits(tmdbIdNum)
  const { data: omdb } = useOmdbRatings(tmdbDetails?.imdb_id || null)
  const { data: allocine } = useAllocineRatings(tmdbDetails?.imdb_id || null)

  // Check if in collection
  const { data: collectionData } = useMoviesQuery()
  const dbMovie = collectionData?.movies?.find((m) => m.tmdb_id === tmdbIdNum) ?? null
  const inCollection = !!dbMovie

  // Wishlist
  const isWishlisted = useIsInWishlist(tmdbIdNum)
  const addToWishlist = useAddToWishlist()
  const removeFromWishlist = useRemoveFromWishlist()

  // Mutations
  const addMovie = useAddMovie()
  const updateMovie = useUpdateMovie()
  const deleteMovie = useDeleteMovie()

  // Local state
  const [notes, setNotes] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [adding, setAdding] = useState(false)

  if (loadingTmdb || !tmdbDetails) {
    return (
      <CpcLayout>
        <div tw="h-full flex flex-col">
          <Header />
          <div tw="flex-1 flex items-center justify-center">
            <div tw="text-cpc-cyan-500">{loadingTmdb ? 'LOADING...' : 'MOVIE NOT FOUND'}</div>
          </div>
        </div>
      </CpcLayout>
    )
  }

  const title = tmdbDetails.title
  const originalTitle = tmdbDetails.original_title
  const overview = tmdbDetails.overview
  const posterPath = tmdbDetails.poster_path
  const backdropPath = tmdbDetails.backdrop_path
  const runtimeMinutes = tmdbDetails.runtime
  const tmdbId = tmdbDetails.id
  const imdbId = tmdbDetails.imdb_id || null

  const director = credits?.crew.find((c) => c.job === 'Director')?.name || ''
  const genres = tmdbDetails.genres.map((g) => g.name)
  const year = tmdbDetails.release_date
    ? parseInt(tmdbDetails.release_date.substring(0, 4), 10)
    : 0

  const imdbRating = inCollection ? dbMovie!.imdb_rating : (omdb?.imdbRating ?? null)
  const metascore = inCollection ? dbMovie!.metascore : (omdb?.metascore ?? null)
  const rottenTomatoes = inCollection ? dbMovie!.rotten_tomatoes : (omdb?.rottenTomatoes ?? null)

  const personalRating = inCollection ? dbMovie!.personal_rating : null
  const currentNotes = notes ?? (inCollection ? dbMovie!.notes : '')

  const backdropUrl = getBackdropUrl(backdropPath)
  const posterUrl = getPosterUrl(posterPath, 'w342')
  const runtime = formatRuntime(runtimeMinutes)

  const handleRatingChange = async (value: number | null) => {
    if (inCollection) {
      updateMovie.mutate({ id: dbMovie!.id, payload: { personal_rating: value } })
    } else if (value !== null) {
      if (adding) return
      setAdding(true)

      try {
        const payload: AddMoviePayload = {
          tmdb_id: tmdbDetails.id,
          imdb_id: tmdbDetails.imdb_id || '',
          title: tmdbDetails.title,
          original_title: tmdbDetails.original_title,
          year,
          poster_path: tmdbDetails.poster_path || '',
          backdrop_path: tmdbDetails.backdrop_path || '',
          overview: tmdbDetails.overview,
          genres: JSON.stringify(genres),
          director,
          runtime: tmdbDetails.runtime || 0,
          metascore: omdb?.metascore ?? null,
          imdb_rating: omdb?.imdbRating ?? null,
          rotten_tomatoes: omdb?.rottenTomatoes ?? null,
          personal_rating: value,
          notes: '',
        }

        await addMovie.mutateAsync(payload)
      } catch (err) {
        console.error('Failed to add movie:', err)
      } finally {
        setAdding(false)
      }
    }
  }

  const handleNotesBlur = () => {
    if (inCollection && notes !== null && notes !== dbMovie!.notes) {
      updateMovie.mutate({ id: dbMovie!.id, payload: { notes } })
    }
  }

  const handleDelete = async () => {
    if (!inCollection) return
    await deleteMovie.mutateAsync(dbMovie!.id)
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
                <div className="group" tw="w-32 md:w-48 flex-shrink-0 overflow-hidden">
                  <img
                    src={posterUrl}
                    alt={title}
                    tw="w-full border-2 border-cpc-green-500 transition-transform duration-300 group-hover:scale-110"
                  />
                </div>
              )}

              {/* Main info */}
              <div tw="flex-1 min-w-0">
                <h1 tw="text-cpc-cyan-500 text-xl md:text-2xl font-bold">{title}</h1>
                {originalTitle && originalTitle !== title && (
                  <div tw="text-cpc-green-900 text-sm">{originalTitle}</div>
                )}

                <div tw="text-cpc-green-500 text-sm mt-1 flex flex-wrap gap-2 items-center">
                  <span>{year}</span>
                  {director && (
                    <>
                      <span tw="text-cpc-green-900">|</span>
                      <span>{director}</span>
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
                  <RatingBadge label="IMDb" value={imdbRating} max={10} />
                  <RatingBadge label="Metascore" value={metascore} max={100} />
                  <RatingBadge label="RT" value={rottenTomatoes} max={100} suffix="%" />
                  <RatingBadge label="AC Presse" value={allocine?.press ?? null} max={5} />
                  <RatingBadge label="AC Spect." value={allocine?.spectateurs ?? null} max={5} />
                </div>

                {/* External links */}
                <div tw="mt-3">
                  <ExternalLinks
                    imdbId={imdbId}
                    tmdbId={tmdbId}
                    title={title}
                    year={year}
                    allocineId={allocine?.allocine_id}
                  />
                </div>

                {/* Personal rating - always visible */}
                <div tw="mt-3">
                  <PersonalRating
                    value={personalRating}
                    onChange={handleRatingChange}
                    disabled={updateMovie.isPending || adding}
                  />
                </div>

                {/* Wishlist button - only when not in collection */}
                {!inCollection && (
                  <div tw="mt-3">
                    <button
                      onClick={() => {
                        if (isWishlisted) {
                          removeFromWishlist.mutate(tmdbId)
                        } else {
                          addToWishlist.mutate({
                            tmdb_id: tmdbId,
                            title,
                            year,
                            poster_path: posterPath || '',
                          })
                        }
                      }}
                      disabled={addToWishlist.isPending || removeFromWishlist.isPending}
                      css={[
                        tw`border-2 px-4 py-1 text-xs transition-colors`,
                        isWishlisted
                          ? tw`border-cpc-yellow-500 text-cpc-yellow-500 hover:bg-cpc-yellow-500 hover:text-black`
                          : tw`border-cpc-green-500 text-cpc-green-500 hover:bg-cpc-green-500 hover:text-black`,
                      ]}
                    >
                      {isWishlisted ? 'WISHLISTED' : 'ADD TO WISHLIST'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Overview */}
            {overview && (
              <div tw="mb-6">
                <div tw="text-cpc-cyan-500 text-sm font-bold mb-1">SYNOPSIS</div>
                <div tw="text-cpc-green-500 text-sm leading-relaxed">{overview}</div>
              </div>
            )}

            {/* Cast */}
            {credits && credits.cast.length > 0 && (
              <div tw="mb-6">
                <div tw="text-cpc-cyan-500 text-sm font-bold mb-1">CAST</div>
                <div tw="flex flex-wrap gap-2">
                  {credits.cast.slice(0, 10).map((actor) => (
                    <span
                      key={actor.id}
                      tw="border border-cpc-green-900 text-cpc-green-500 px-2 py-0.5 text-xs"
                    >
                      {actor.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Notes - only when in collection */}
            {inCollection && (
              <div tw="mb-6">
                <textarea
                  value={currentNotes}
                  onChange={(e) => setNotes(e.target.value)}
                  onBlur={handleNotesBlur}
                  placeholder="Add your notes..."
                  tw="w-full bg-transparent border-2 border-cpc-green-900 text-cpc-green-500 px-3 py-2 font-cpc outline-none focus:border-cpc-cyan-500 placeholder:text-cpc-green-900 min-h-[80px] resize-y text-sm"
                />
              </div>
            )}

            {/* Delete - only when in collection */}
            {inCollection && (
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
            )}
          </div>
        </div>
      </div>
    </CpcLayout>
  )
}
