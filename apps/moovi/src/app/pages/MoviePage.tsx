import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { CpcLayout } from '@vigooth/ui'
import tw from 'twin.macro'
import { useTmdbMovieDetail, useTmdbMovieCredits } from '@/hooks/useTmdbSearch'
import { useOmdbRatings } from '@/hooks/useOmdbRatings'
import { useAllocineRatings } from '@/hooks/useAllocineRatings'
import {
  useMovieQuery,
  useMoviesQuery,
  useAddMovie,
  useUpdateMovie,
  useDeleteMovie,
} from '@/hooks/useMoviesQuery'
import { Header } from '@/components/layout/Header'
import { RatingBadge } from '@/components/movies/RatingBadge'
import { PersonalRating } from '@/components/movies/PersonalRating'
import { ExternalLinks } from '@/components/movies/ExternalLinks'
import { getBackdropUrl, getPosterUrl } from '@/utils/tmdbImage'
import { parseGenres, formatRuntime } from '@/utils/ratings'
import type { AddMoviePayload } from '@/types/movie'

export function MoviePage() {
  const { id, tmdbId: tmdbIdParam } = useParams<{ id?: string; tmdbId?: string }>()
  const navigate = useNavigate()

  const isTmdbMode = !!tmdbIdParam
  const tmdbIdNum = tmdbIdParam ? parseInt(tmdbIdParam, 10) : null

  // DB mode hooks
  const { data: dbMovie, isLoading: loadingDb, isError: dbError } = useMovieQuery(id ?? '')

  // TMDB mode hooks
  const { data: tmdbDetails, isLoading: loadingTmdb } = useTmdbMovieDetail(
    isTmdbMode ? tmdbIdNum : null,
  )
  const { data: credits } = useTmdbMovieCredits(isTmdbMode ? tmdbIdNum : null)
  const { data: omdb } = useOmdbRatings(
    isTmdbMode ? (tmdbDetails?.imdb_id || null) : null,
  )

  // Allocine for both modes
  const imdbIdForAllocine = isTmdbMode
    ? (tmdbDetails?.imdb_id || null)
    : (dbMovie?.imdb_id || null)
  const { data: allocine } = useAllocineRatings(imdbIdForAllocine)

  // Collection check
  const { data: collectionData } = useMoviesQuery()

  // Mutations
  const addMovie = useAddMovie()
  const updateMovie = useUpdateMovie()
  const deleteMovie = useDeleteMovie()

  // Local state
  const [notes, setNotes] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [adding, setAdding] = useState(false)

  // In TMDB mode, check if already in collection and redirect
  const collectionMatch = isTmdbMode
    ? collectionData?.movies?.find((m) => m.tmdb_id === tmdbIdNum)
    : null

  useEffect(() => {
    if (collectionMatch) {
      navigate(`/movie/${collectionMatch.id}`, { replace: true })
    }
  }, [collectionMatch, navigate])

  // Determine if movie is in collection (for DB mode it always is)
  const inCollection = !isTmdbMode && !!dbMovie

  // Loading states
  const isLoading = isTmdbMode ? loadingTmdb : loadingDb
  const hasData = isTmdbMode ? !!tmdbDetails : !!dbMovie
  const hasError = !isTmdbMode && dbError

  if (isLoading || (!hasData && !hasError)) {
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

  if (hasError || !hasData) {
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

  // Normalize data from either source
  const title = isTmdbMode ? tmdbDetails!.title : dbMovie!.title
  const originalTitle = isTmdbMode ? tmdbDetails!.original_title : dbMovie!.original_title
  const overview = isTmdbMode ? tmdbDetails!.overview : dbMovie!.overview
  const posterPath = isTmdbMode ? tmdbDetails!.poster_path : dbMovie!.poster_path
  const backdropPath = isTmdbMode ? tmdbDetails!.backdrop_path : dbMovie!.backdrop_path
  const runtimeMinutes = isTmdbMode ? tmdbDetails!.runtime : dbMovie!.runtime
  const tmdbId = isTmdbMode ? tmdbDetails!.id : dbMovie!.tmdb_id
  const imdbId = isTmdbMode ? (tmdbDetails!.imdb_id || null) : (dbMovie!.imdb_id || null)

  const director = isTmdbMode
    ? (credits?.crew.find((c) => c.job === 'Director')?.name || '')
    : dbMovie!.director

  const genres = isTmdbMode
    ? tmdbDetails!.genres.map((g) => g.name)
    : parseGenres(dbMovie!.genres)

  const year = isTmdbMode
    ? (tmdbDetails!.release_date ? parseInt(tmdbDetails!.release_date.substring(0, 4), 10) : 0)
    : dbMovie!.year

  const imdbRating = isTmdbMode ? (omdb?.imdbRating ?? null) : dbMovie!.imdb_rating
  const metascore = isTmdbMode ? (omdb?.metascore ?? null) : dbMovie!.metascore
  const rottenTomatoes = isTmdbMode ? (omdb?.rottenTomatoes ?? null) : dbMovie!.rotten_tomatoes

  const personalRating = inCollection ? dbMovie!.personal_rating : null
  const currentNotes = notes ?? (inCollection ? dbMovie!.notes : '')

  const backdropUrl = getBackdropUrl(backdropPath)
  const posterUrl = getPosterUrl(posterPath, 'w342')
  const runtime = formatRuntime(runtimeMinutes)

  const handleRatingChange = async (value: number | null) => {
    if (inCollection) {
      // Already in collection - just update
      updateMovie.mutate({ id: dbMovie!.id, payload: { personal_rating: value } })
    } else if (value !== null && isTmdbMode && tmdbDetails) {
      // Not in collection, rating clicked -> auto-add
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

        const movie = await addMovie.mutateAsync(payload)
        navigate(`/movie/${movie.id}`, { replace: true })
      } catch (err) {
        console.error('Failed to add movie:', err)
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
                <div tw="w-32 md:w-48 flex-shrink-0">
                  <img
                    src={posterUrl}
                    alt={title}
                    tw="w-full border-2 border-cpc-green-500"
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
              </div>
            </div>

            {/* Overview */}
            {overview && (
              <div tw="mb-6">
                <div tw="text-cpc-cyan-500 text-sm font-bold mb-1">SYNOPSIS</div>
                <div tw="text-cpc-green-500 text-sm leading-relaxed">{overview}</div>
              </div>
            )}

            {/* Cast (TMDB mode only) */}
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
