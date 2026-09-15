import { Fragment } from 'react';
import {
  CpcButton,
  CpcMenu,
  CpcMenuItem,
  CpcMenuSeparator,
  CpcMenuGroup,
  ChevronDownIcon,
} from '@vigooth/ui';
import { getAllocineSearchUrl, getAllocineFilmUrl } from '@/utils/allocine';
import { useYtsMovie } from '@/hooks/useYtsMovie';
import { useSubtitles } from '@/hooks/useSubtitles';
import { getSubtitleDownloadLink } from '@/lib/api/subtitles';
import type { Subtitle } from '@/types/movie';

interface ExternalLinksProps {
  imdbId: string | null;
  tmdbId: number;
  title: string;
  year: number;
  allocineId?: string | null;
  mediaType?: string;
}

export function ExternalLinks({
  imdbId,
  tmdbId,
  title,
  year,
  allocineId,
  mediaType = 'movie',
}: ExternalLinksProps) {
  const allocineUrl = allocineId
    ? getAllocineFilmUrl(allocineId)
    : getAllocineSearchUrl(title, year);
  const { data: yts } = useYtsMovie(mediaType === 'movie' ? imdbId : null);
  const { data: subs } = useSubtitles(mediaType === 'movie' ? imdbId : null);

  const subtitlesByLanguage = groupByLanguage(subs?.subtitles ?? []);

  async function handleSubtitleClick(subtitle: Subtitle) {
    // Open the tab synchronously so the click gesture is preserved, then point it to the file.
    const tab = window.open('', '_blank');
    if (!subs?.downloadable) {
      navigate(tab, subtitle.url);
      return;
    }
    try {
      const { link } = await getSubtitleDownloadLink(subtitle.file_id);
      navigate(tab, link);
    } catch {
      // Quota exhausted or login failed: fall back to the OpenSubtitles page.
      navigate(tab, subtitle.url);
    }
  }

  return (
    <div className="flex flex-wrap gap-2 items-center">
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
              <ChevronDownIcon size="sm" className="cpc-chevron-flip" />
            </CpcButton>
          }
        >
          {yts.url && (
            <>
              <CpcMenuItem onClick={() => window.open(yts.url, '_blank')}>Page YIFY</CpcMenuItem>
              <CpcMenuSeparator />
            </>
          )}
          {yts.torrents.map((torrent) => (
            <CpcMenuItem
              key={`${torrent.quality}-${torrent.type}`}
              onClick={() => {
                window.location.href = torrent.magnet;
              }}
            >
              <span>{torrent.quality}</span>
              <span className="opacity-60 ml-1">
                {torrent.type !== 'web' ? torrent.type : ''} — {torrent.size}
              </span>
            </CpcMenuItem>
          ))}
        </CpcMenu>
      )}
      {subtitlesByLanguage.length > 0 && (
        <CpcMenu
          color="magenta"
          trigger={
            <CpcButton variant="outlined" color="magenta">
              SUBS
              <ChevronDownIcon size="sm" className="cpc-chevron-flip" />
            </CpcButton>
          }
        >
          {subtitlesByLanguage.map(([language, items], index) => (
            <Fragment key={language}>
              {index > 0 && <CpcMenuSeparator />}
              <CpcMenuGroup label={language.toUpperCase()}>
                {items.map((subtitle) => (
                  <CpcMenuItem key={subtitle.file_id} onClick={() => handleSubtitleClick(subtitle)}>
                    <span className="flex items-baseline gap-1">
                      <span className="truncate max-w-64">{subtitle.release}</span>
                      <span className="opacity-60 shrink-0">
                        {subtitle.hearing_impaired ? 'SDH — ' : ''}
                        {formatCount(subtitle.download_count)}
                      </span>
                    </span>
                  </CpcMenuItem>
                ))}
              </CpcMenuGroup>
            </Fragment>
          ))}
        </CpcMenu>
      )}
    </div>
  );
}

function groupByLanguage(subtitles: Subtitle[]): [string, Subtitle[]][] {
  const groups = new Map<string, Subtitle[]>();
  for (const subtitle of subtitles) {
    const items = groups.get(subtitle.language) ?? [];
    items.push(subtitle);
    groups.set(subtitle.language, items);
  }
  return [...groups.entries()];
}

function navigate(tab: Window | null, url: string) {
  if (tab) {
    tab.location.href = url;
  } else {
    window.open(url, '_blank');
  }
}

function formatCount(count: number): string {
  return new Intl.NumberFormat('fr-FR', { notation: 'compact' }).format(count);
}
