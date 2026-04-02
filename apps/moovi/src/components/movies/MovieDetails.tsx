import { useState } from 'react'
import { css, keyframes } from '@emotion/react'
import tw from 'twin.macro'
import { useTmdbMovieDetail, useTmdbMovieCredits, useTmdbTvDetail, useTmdbTvCredits } from '@/hooks/useTmdbSearch'
import { useOmdbRatings } from '@/hooks/useOmdbRatings'
import { useAllocineRatings } from '@/hooks/useAllocineRatings'
import {
  useMoviesQuery,
  useAddMovie,
  useUpdateMovie,
  useDeleteMovie,
} from '@/hooks/useMoviesQuery'
import { useIsInWishlist, useAddToWishlist, useRemoveFromWishlist } from '@/hooks/useWishlist'
import { getBackdropUrl, getPosterUrl } from '@/utils/tmdbImage'
import { formatRuntime } from '@/utils/ratings'
import { RatingBadge } from '@/components/movies/RatingBadge'
import { PersonalRating } from '@/components/movies/PersonalRating'
import { ExternalLinks } from '@/components/movies/ExternalLinks'
import type { AddMoviePayload } from '@/types/movie'

interface MovieDetailsProps {
  tmdbId: number
  mediaType?: string
  onDeleted?: () => void
}

export function MovieDetails({ tmdbId: tmdbIdNum, mediaType = 'movie', onDeleted }: MovieDetailsProps) {
  const isTv = mediaType === 'tv'

  // TMDB data — fetch movie OR tv details
  const { data: movieDetails, isLoading: loadingMovie } = useTmdbMovieDetail(isTv ? null : tmdbIdNum)
  const { data: movieCredits } = useTmdbMovieCredits(isTv ? null : tmdbIdNum)
  const { data: tvDetails, isLoading: loadingTv } = useTmdbTvDetail(isTv ? tmdbIdNum : null)
  const { data: tvCredits } = useTmdbTvCredits(isTv ? tmdbIdNum : null)

  const tmdbDetails = isTv ? tvDetails : movieDetails
  const credits = isTv ? tvCredits : movieCredits
  const loadingTmdb = isTv ? loadingTv : loadingMovie

  const imdbIdForRatings = isTv
    ? (tvDetails?.external_ids?.imdb_id || null)
    : (movieDetails?.imdb_id || null)

  const { data: omdb } = useOmdbRatings(imdbIdForRatings)
  const { data: allocine } = useAllocineRatings(imdbIdForRatings)

  // Check if in collection
  const { data: collectionData } = useMoviesQuery()
  const dbMovie = collectionData?.movies?.find((m) => m.tmdb_id === tmdbIdNum && m.media_type === mediaType) ?? null
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

  if (!loadingTmdb && !tmdbDetails) {
    return (
      <div tw="flex-1 flex items-center justify-center">
        <div tw="text-cpc-cyan-500">MOVIE NOT FOUND</div>
      </div>
    )
  }

  if (loadingTmdb || !tmdbDetails) {
    return <MovieDetailsSkeleton />
  }

  const title = isTv ? (tvDetails?.name || '') : (movieDetails?.title || '')
  const originalTitle = isTv ? (tvDetails?.original_name || '') : (movieDetails?.original_title || '')
  const overview = tmdbDetails?.overview || ''
  const posterPath = tmdbDetails?.poster_path || null
  const backdropPath = tmdbDetails?.backdrop_path || null
  const runtimeMinutes = isTv ? (tvDetails?.episode_run_time?.[0] || 0) : (movieDetails?.runtime || 0)
  const tmdbId = tmdbDetails?.id || tmdbIdNum
  const imdbId = imdbIdForRatings

  const director = isTv
    ? (tvDetails?.created_by?.[0]?.name || credits?.crew.find((c) => c.job === 'Director')?.name || '')
    : (credits?.crew.find((c) => c.job === 'Director')?.name || '')
  const genres = (isTv ? tvDetails?.genres : movieDetails?.genres)?.map((g) => g.name) || []
  const dateStr = isTv ? tvDetails?.first_air_date : movieDetails?.release_date
  const year = dateStr ? parseInt(dateStr.substring(0, 4), 10) : 0
  const seasonInfo = isTv && tvDetails ? `${tvDetails.number_of_seasons}S ${tvDetails.number_of_episodes}EP` : ''

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
          tmdb_id: tmdbId,
          imdb_id: imdbId || '',
          media_type: mediaType,
          title,
          original_title: originalTitle,
          year,
          poster_path: posterPath || '',
          backdrop_path: backdropPath || '',
          overview,
          genres: JSON.stringify(genres),
          director,
          runtime: runtimeMinutes || 0,
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
    onDeleted?.()
  }

  return (
    <>
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
        <div tw="mb-6">
          {/* Poster — floated left, content wraps around it */}
          {posterUrl && (
            <div className="group" tw="float-left w-32 md:w-48 mr-4 mb-2 overflow-hidden">
              <img
                src={posterUrl}
                alt={title}
                tw="w-full border-2 border-cpc-green-500 transition-transform duration-300 group-hover:scale-110"
              />
            </div>
          )}

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
            {seasonInfo && (
              <>
                <span tw="text-cpc-green-900">|</span>
                <span>{seasonInfo}</span>
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

          {/* Personal rating */}
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
    </>
  )
}

const shimmer = keyframes`
  0% { background-position: -400px 0; }
  100% { background-position: 400px 0; }
`

const skeletonBar = css`
  ${tw`rounded-sm`}
  background: linear-gradient(90deg, #1a2a1a 25%, #2a3a2a 50%, #1a2a1a 75%);
  background-size: 400px 100%;
  animation: ${shimmer} 1.5s ease-in-out infinite;
`

function SkeletonBlock({ width = '100%', height = '14px' }: { width?: string; height?: string }) {
  return <div css={skeletonBar} style={{ width, height }} />
}

function MovieDetailsSkeleton() {
  return (
    <>
      {/* Backdrop skeleton */}
      <div tw="relative h-48 md:h-64 overflow-hidden">
        <div css={skeletonBar} tw="w-full h-full" />
      </div>

      <div tw="p-4 max-w-4xl mx-auto -mt-20 relative">
        <div tw="mb-6">
          {/* Poster skeleton — float left */}
          <div tw="float-left w-32 md:w-48 mr-4 mb-2">
            <div css={skeletonBar} tw="w-full border-2 border-cpc-green-900" style={{ aspectRatio: '2/3' }} />
          </div>

          {/* Title */}
          <SkeletonBlock width="70%" height="24px" />
          <div tw="mt-2" />
          <SkeletonBlock width="40%" height="14px" />

          {/* Year | Director | Runtime */}
          <div tw="mt-3 flex gap-2">
            <SkeletonBlock width="40px" height="14px" />
            <SkeletonBlock width="100px" height="14px" />
            <SkeletonBlock width="50px" height="14px" />
          </div>

          {/* Genres */}
          <div tw="flex gap-1 mt-3">
            <SkeletonBlock width="60px" height="22px" />
            <SkeletonBlock width="80px" height="22px" />
            <SkeletonBlock width="50px" height="22px" />
          </div>

          {/* Ratings */}
          <div tw="flex gap-3 mt-3">
            <SkeletonBlock width="55px" height="20px" />
            <SkeletonBlock width="75px" height="20px" />
            <SkeletonBlock width="45px" height="20px" />
          </div>

          {/* External links */}
          <div tw="flex gap-2 mt-3">
            <SkeletonBlock width="50px" height="28px" />
            <SkeletonBlock width="50px" height="28px" />
            <SkeletonBlock width="70px" height="28px" />
          </div>

          {/* Personal rating */}
          <div tw="flex gap-1 mt-3">
            {Array.from({ length: 10 }, (_, i) => (
              <SkeletonBlock key={i} width="32px" height="32px" />
            ))}
          </div>
        </div>

        {/* Synopsis */}
        <div tw="mb-6">
          <SkeletonBlock width="80px" height="14px" />
          <div tw="mt-2 flex flex-col gap-2">
            <SkeletonBlock width="100%" height="14px" />
            <SkeletonBlock width="100%" height="14px" />
            <SkeletonBlock width="60%" height="14px" />
          </div>
        </div>

        {/* Cast */}
        <div tw="mb-6">
          <SkeletonBlock width="50px" height="14px" />
          <div tw="flex flex-wrap gap-2 mt-2">
            {Array.from({ length: 6 }, (_, i) => (
              <SkeletonBlock key={i} width="80px" height="22px" />
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
