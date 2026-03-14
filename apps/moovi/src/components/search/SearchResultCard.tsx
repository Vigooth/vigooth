import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import tw from 'twin.macro'
import type { TmdbSearchResult } from '@/types/movie'
import { getPosterUrl } from '@/utils/tmdbImage'
import { getMovieDetails, getMovieCredits } from '@/lib/api/tmdb'
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
  const year = result.release_date ? parseInt(result.release_date.substring(0, 4), 10) : 0

  const handleAdd = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (added || adding) return
    setAdding(true)

    try {
      const [details, credits] = await Promise.all([
        getMovieDetails(result.id),
        getMovieCredits(result.id),
      ])

      const director = credits.crew.find((c) => c.job === 'Director')?.name || ''
      const genres = JSON.stringify(details.genres.map((g) => g.name))

      let metascore: number | null = null
      let imdbRating: number | null = null
      let rottenTomatoes: number | null = null

      if (details.imdb_id) {
        try {
          const omdbData = await getOmdbRatings(details.imdb_id)
          const parsed = parseOmdbRatings(omdbData)
          metascore = parsed.metascore
          imdbRating = parsed.imdbRating
          rottenTomatoes = parsed.rottenTomatoes
        } catch {
          // OMDB is optional
        }
      }

      const payload: AddMoviePayload = {
        tmdb_id: details.id,
        imdb_id: details.imdb_id || '',
        title: details.title,
        original_title: details.original_title,
        year: details.release_date ? parseInt(details.release_date.substring(0, 4), 10) : 0,
        poster_path: details.poster_path || '',
        backdrop_path: details.backdrop_path || '',
        overview: details.overview,
        genres,
        director,
        runtime: details.runtime || 0,
        metascore,
        imdb_rating: imdbRating,
        rotten_tomatoes: rottenTomatoes,
        personal_rating: null,
        notes: '',
      }

      await addMovie.mutateAsync(payload)
      setAdded(true)
    } catch (err) {
      console.error('Failed to add movie:', err)
    } finally {
      setAdding(false)
    }
  }

  return (
    <div
      onClick={() => {
        if (window.getSelection()?.toString()) return
        navigate(`/movie/${result.id}`)
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
          <div tw="text-cpc-cyan-500 font-bold text-sm truncate">{result.title}</div>
          {result.original_title !== result.title && (
            <div tw="text-cpc-green-900 text-xs truncate">{result.original_title}</div>
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
