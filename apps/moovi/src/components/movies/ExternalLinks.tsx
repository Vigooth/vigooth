import tw, { css } from 'twin.macro'
import { CpcButton, CpcMenu, CpcMenuItem, CpcMenuSeparator, ChevronDownIcon } from '@vigooth/ui'
import { getAllocineSearchUrl, getAllocineFilmUrl } from '@/utils/allocine'
import { useYtsMovie } from '@/hooks/useYtsMovie'

interface ExternalLinksProps {
  imdbId: string | null
  tmdbId: number
  title: string
  year: number
  allocineId?: string | null
  mediaType?: string
}

export function ExternalLinks({ imdbId, tmdbId, title, year, allocineId, mediaType = 'movie' }: ExternalLinksProps) {
  const allocineUrl = allocineId ? getAllocineFilmUrl(allocineId) : getAllocineSearchUrl(title, year)
  const { data: yts } = useYtsMovie(mediaType === 'movie' ? imdbId : null)

  return (
    <div tw="flex flex-wrap gap-2 items-center">
      {imdbId && (
        <CpcButton
          variant="outlined"
          color="yellow"
          onClick={() => window.open(`https://www.imdb.com/title/${imdbId}`, '_blank')}
        >
          IMDb
        </CpcButton>
      )}
      <CpcButton
        variant="outlined"
        color="cyan"
        onClick={() => window.open(`https://www.themoviedb.org/movie/${tmdbId}`, '_blank')}
      >
        TMDB
      </CpcButton>
      <CpcButton
        variant="outlined"
        color="green"
        onClick={() => window.open(allocineUrl, '_blank')}
      >
        ALLOCINE
      </CpcButton>
      {mediaType === 'movie' && yts?.found && yts.torrents && yts.torrents.length > 0 && (
        <CpcMenu
          color="red"
          trigger={
            <CpcButton variant="outlined" color="red">
              YIFY
              <ChevronDownIcon size="sm" css={chevronStyles} />
            </CpcButton>
          }
        >
          {yts.url && (
            <>
              <CpcMenuItem onClick={() => window.open(yts.url, '_blank')}>
                Page YIFY
              </CpcMenuItem>
              <CpcMenuSeparator />
            </>
          )}
          {yts.torrents.map((torrent) => (
            <CpcMenuItem
              key={`${torrent.quality}-${torrent.type}`}
              onClick={() => { window.location.href = torrent.magnet }}
            >
              <span>{torrent.quality}</span>
              <span tw="opacity-60 ml-1">
                {torrent.type !== 'web' ? torrent.type : ''} — {torrent.size}
              </span>
            </CpcMenuItem>
          ))}
        </CpcMenu>
      )}
    </div>
  )
}

const chevronStyles = css`
  ${tw`ml-1 transition-transform duration-200`}
  [data-popup-open] & {
    ${tw`rotate-180`}
  }
`
