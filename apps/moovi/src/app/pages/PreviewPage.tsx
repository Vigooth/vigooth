import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { CpcLayout } from '@vigooth/ui'
import tw from 'twin.macro'
import { useTmdbMovieDetail, useTmdbMovieCredits } from '@/hooks/useTmdbSearch'
import { useOmdbRatings } from '@/hooks/useOmdbRatings'
import { useAllocineRatings } from '@/hooks/useAllocineRatings'
import { useMoviesQuery, useAddMovie } from '@/hooks/useMoviesQuery'
import { Header } from '@/components/layout/Header'
import { RatingBadge } from '@/components/movies/RatingBadge'
import { ExternalLinks } from '@/components/movies/ExternalLinks'
import { getBackdropUrl, getPosterUrl } from '@/utils/tmdbImage'
import { formatRuntime } from '@/utils/ratings'
import type { AddMoviePayload } from '@/types/movie'

export function PreviewPage() {
  const { tmdbId } = useParams<{ tmdbId: string }>()
  const navigate = useNavigate()
  const tmdbIdNum = tmdbId ? parseInt(tmdbId, 10) : null

  const { data: details, isLoading: loadingDetails } = useTmdbMovieDetail(tmdbIdNum)
  const { data: credits } = useTmdbMovieCredits(tmdbIdNum)
  const { data: omdb } = useOmdbRatings(details?.imdb_id || null)
  const { data: allocine } = useAllocineRatings(details?.imdb_id || null)
  const { data: collectionData } = useMoviesQuery()
  const addMovie = useAddMovie()

  const [adding, setAdding] = useState(false)

  const inCollection = collectionData?.movies?.some((m) => m.tmdb_id === tmdbIdNum) ?? false

  if (loadingDetails || !details) {
    return (
      <CpcLayout>
        <div tw="h-full flex flex-col">
          <Header />
          <div tw="flex-1 flex items-center justify-center">
            <div tw="text-cpc-cyan-500">{loadingDetails ? 'LOADING...' : 'MOVIE NOT FOUND'}</div>
          </div>
        </div>
      </CpcLayout>
    )
  }

  const director = credits?.crew.find((c) => c.job === 'Director')?.name || ''
  const genres = details.genres.map((g) => g.name)
  const year = details.release_date ? parseInt(details.release_date.substring(0, 4), 10) : 0
  const runtime = formatRuntime(details.runtime)
  const backdropUrl = getBackdropUrl(details.backdrop_path)
  const posterUrl = getPosterUrl(details.poster_path, 'w342')

  const handleAdd = async () => {
    if (inCollection || adding) return
    setAdding(true)

    try {
      const payload: AddMoviePayload = {
        tmdb_id: details.id,
        imdb_id: details.imdb_id || '',
        title: details.title,
        original_title: details.original_title,
        year,
        poster_path: details.poster_path || '',
        backdrop_path: details.backdrop_path || '',
        overview: details.overview,
        genres: JSON.stringify(genres),
        director,
        runtime: details.runtime || 0,
        metascore: omdb?.metascore ?? null,
        imdb_rating: omdb?.imdbRating ?? null,
        rotten_tomatoes: omdb?.rottenTomatoes ?? null,
        personal_rating: null,
        notes: '',
      }

      const movie = await addMovie.mutateAsync(payload)
      navigate(`/movie/${movie.id}`)
    } catch (err) {
      console.error('Failed to add movie:', err)
      setAdding(false)
    }
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
                    alt={details.title}
                    tw="w-full border-2 border-cpc-green-500"
                  />
                </div>
              )}

              {/* Main info */}
              <div tw="flex-1 min-w-0">
                <h1 tw="text-cpc-cyan-500 text-xl md:text-2xl font-bold">{details.title}</h1>
                {details.original_title && details.original_title !== details.title && (
                  <div tw="text-cpc-green-900 text-sm">{details.original_title}</div>
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
                  <RatingBadge label="IMDb" value={omdb?.imdbRating ?? null} max={10} />
                  <RatingBadge label="Metascore" value={omdb?.metascore ?? null} max={100} />
                  <RatingBadge label="RT" value={omdb?.rottenTomatoes ?? null} max={100} suffix="%" />
                  <RatingBadge label="AC Presse" value={allocine?.press ?? null} max={5} />
                  <RatingBadge label="AC Spect." value={allocine?.spectateurs ?? null} max={5} />
                </div>

                {/* External links */}
                <div tw="mt-3">
                  <ExternalLinks
                    imdbId={details.imdb_id || null}
                    tmdbId={details.id}
                    title={details.title}
                    year={year}
                    allocineId={allocine?.allocine_id}
                  />
                </div>

                {/* Add button */}
                <div tw="mt-4">
                  <button
                    onClick={handleAdd}
                    disabled={inCollection || adding}
                    css={[
                      tw`border-2 px-4 py-2 text-sm font-bold transition-colors`,
                      inCollection
                        ? tw`border-cpc-green-500 text-cpc-green-500 cursor-default`
                        : adding
                          ? tw`border-cpc-yellow-500 text-cpc-yellow-500 opacity-50 cursor-wait`
                          : tw`border-cpc-cyan-500 text-cpc-cyan-500 hover:bg-cpc-cyan-500 hover:text-black`,
                    ]}
                  >
                    {inCollection ? 'IN COLLECTION' : adding ? 'ADDING...' : 'ADD TO COLLECTION'}
                  </button>
                </div>
              </div>
            </div>

            {/* Overview */}
            {details.overview && (
              <div tw="mb-6">
                <div tw="text-cpc-cyan-500 text-sm font-bold mb-1">SYNOPSIS</div>
                <div tw="text-cpc-green-500 text-sm leading-relaxed">{details.overview}</div>
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
          </div>
        </div>
      </div>
    </CpcLayout>
  )
}
