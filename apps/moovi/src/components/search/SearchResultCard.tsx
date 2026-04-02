import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import tw from 'twin.macro'
import type { TmdbSearchResult } from '@/types/movie'
import { getPosterUrl } from '@/utils/tmdbImage'
import { getMovieDetails, getMovieCredits, getTvDetails, getTvCredits } from '@/lib/api/tmdb'
import { getOmdbRatings, parseOmdbRatings } from '@/lib/api/omdb'
import { useAddMovie } from '@/hooks/useMoviesQuery'
import type { AddMoviePayload } from '@/types/movie'

interface SearchResultCardProps {
  result: TmdbSearchResult
  inCollection: boolean
}

export function SearchResultCard({ result, inCollection }: SearchResultCardProps) {
  const navigate = useNavigate()
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(inCollection)
  const addMovie = useAddMovie()
  const posterUrl = getPosterUrl(result.poster_path, 'w185')
  const isTv = result.media_type === 'tv'
  const displayTitle = isTv ? result.name || '' : result.title || ''
  const displayOriginalTitle = isTv ? result.original_name || '' : result.original_title || ''
  const dateStr = isTv ? result.first_air_date : result.release_date
  const year = dateStr ? parseInt(dateStr.substring(0, 4), 10) : 0

  const handleAdd = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (added || adding) return
    setAdding(true)

    try {
      let title: string, originalTitle: string, overview: string, genres: string
      let posterPath: string, backdropPath: string, director: string
      let runtime: number, imdbId: string, releaseYear: number

      if (isTv) {
        const [details, credits] = await Promise.all([
          getTvDetails(result.id),
          getTvCredits(result.id),
        ])
        title = details.name
        originalTitle = details.original_name
        overview = details.overview
        genres = JSON.stringify(details.genres.map((g) => g.name))
        posterPath = details.poster_path || ''
        backdropPath = details.backdrop_path || ''
        director = details.created_by?.[0]?.name || credits.crew.find((c) => c.job === 'Director')?.name || ''
        runtime = details.episode_run_time?.[0] || 0
        imdbId = details.external_ids?.imdb_id || ''
        releaseYear = details.first_air_date ? parseInt(details.first_air_date.substring(0, 4), 10) : 0
      } else {
        const [details, credits] = await Promise.all([
          getMovieDetails(result.id),
          getMovieCredits(result.id),
        ])
        title = details.title
        originalTitle = details.original_title
        overview = details.overview
        genres = JSON.stringify(details.genres.map((g) => g.name))
        posterPath = details.poster_path || ''
        backdropPath = details.backdrop_path || ''
        director = credits.crew.find((c) => c.job === 'Director')?.name || ''
        runtime = details.runtime || 0
        imdbId = details.imdb_id || ''
        releaseYear = details.release_date ? parseInt(details.release_date.substring(0, 4), 10) : 0
      }

      let metascore: number | null = null
      let imdbRating: number | null = null
      let rottenTomatoes: number | null = null

      if (imdbId) {
        try {
          const omdbData = await getOmdbRatings(imdbId)
          const parsed = parseOmdbRatings(omdbData)
          metascore = parsed.metascore
          imdbRating = parsed.imdbRating
          rottenTomatoes = parsed.rottenTomatoes
        } catch {
          // OMDB is optional
        }
      }

      const payload: AddMoviePayload = {
        tmdb_id: result.id,
        imdb_id: imdbId,
        media_type: isTv ? 'tv' : 'movie',
        title,
        original_title: originalTitle,
        year: releaseYear,
        poster_path: posterPath,
        backdrop_path: backdropPath,
        overview,
        genres,
        director,
        runtime,
        metascore,
        imdb_rating: imdbRating,
        rotten_tomatoes: rottenTomatoes,
        personal_rating: null,
        notes: '',
      }

      await addMovie.mutateAsync(payload)
      setAdded(true)
    } catch (err) {
      console.error('Failed to add:', err)
    } finally {
      setAdding(false)
    }
  }

  return (
    <div
      onClick={() => {
        if (window.getSelection()?.toString()) return
        navigate(isTv ? `/tv/${result.id}` : `/movie/${result.id}`)
      }}
      className="search-result"
      tw="border-2 border-cpc-green-900 flex hover:border-cpc-cyan-500 transition-colors cursor-pointer"
    >
      {/* Poster */}
      <div tw="w-20 flex-shrink-0 bg-cpc-grey-900"
        css={{
          transition: 'width 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)',
          '.search-result:hover &': { width: '8rem' },
        }}
      >
        {posterUrl ? (
          <img src={posterUrl} alt={result.title} tw="w-full h-full object-cover" />
        ) : (
          <div tw="w-full h-28 flex items-center justify-center text-cpc-green-900 text-xs">
            N/A
          </div>
        )}
      </div>

      {/* Info */}
      <div tw="flex-1 p-3 flex flex-col justify-between min-w-0">
        <div>
          <div tw="text-cpc-cyan-500 font-bold text-sm truncate">
            {displayTitle}
            {isTv && <span tw="text-cpc-yellow-500 ml-1 text-xs font-normal">SÉRIE</span>}
          </div>
          {displayOriginalTitle !== displayTitle && (
            <div tw="text-cpc-green-900 text-xs truncate">{displayOriginalTitle}</div>
          )}
          <div tw="text-cpc-green-900 text-xs">{year || '—'}</div>
          <div tw="text-cpc-green-500 text-xs mt-1 line-clamp-2">{result.overview}</div>
        </div>

        <div tw="mt-2">
          <button
            onClick={handleAdd}
            disabled={added || adding}
            css={[
              tw`border-2 px-3 py-1 text-xs transition-colors`,
              added
                ? tw`border-cpc-green-500 text-cpc-green-500 cursor-default`
                : adding
                  ? tw`border-cpc-yellow-500 text-cpc-yellow-500 opacity-50 cursor-wait`
                  : tw`border-cpc-cyan-500 text-cpc-cyan-500 hover:bg-cpc-cyan-500 hover:text-black`,
            ]}
          >
            {added ? 'IN COLLECTION' : adding ? 'ADDING...' : 'ADD'}
          </button>
        </div>
      </div>
    </div>
  )
}
