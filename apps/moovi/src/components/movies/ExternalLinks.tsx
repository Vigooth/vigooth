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
import { TpbMenu } from '@/components/movies/TpbMenu';
import { useYtsMovie } from '@/hooks/useYtsMovie';
import { useSubtitles } from '@/hooks/useSubtitles';
import { downloadSubtitle } from '@/lib/api/subtitles';
import { bestSubtitleFor, matchSubtitlesToTorrents } from '@/utils/subtitleMatch';
import type { Subtitle, YtsTorrent } from '@/types/movie';

interface ExternalLinksProps {
  imdbId: string | null;
  tmdbId: number;
  title: string;
  /** Original-language title, which torrent names use. */
  originalTitle?: string;
  year: number;
  /** Number of seasons of a TV show. */
  seasons?: number;
  allocineId?: string | null;
  mediaType?: string;
}

export function ExternalLinks({
  imdbId,
  tmdbId,
  title,
  originalTitle,
  year,
  seasons = 0,
  allocineId,
  mediaType = 'movie',
}: ExternalLinksProps) {
  const allocineUrl = allocineId
    ? getAllocineFilmUrl(allocineId)
    : getAllocineSearchUrl(title, year);
  const { data: yts } = useYtsMovie(mediaType === 'movie' ? imdbId : null);
  const { data: subs } = useSubtitles(mediaType === 'movie' ? imdbId : null);

  const subtitles = subs?.subtitles ?? [];
  const torrents = yts?.torrents ?? [];
  const subtitleLanguages = [...new Set(subtitles.map((subtitle) => subtitle.language))];
  const matchedQualityByFileId = matchSubtitlesToTorrents(subtitles, torrents);
  const subtitlesByLanguage = groupByLanguage(subtitles, matchedQualityByFileId);

  async function openSubtitle(subtitle: Subtitle) {
    if (!subs?.downloadable) {
      window.open(subtitle.url, '_blank');
      return;
    }
    try {
      await downloadSubtitle(subtitle.file_id, `${subtitle.release}.srt`);
    } catch {
      // Quota exhausted or login failed: fall back to the OpenSubtitles page.
      window.open(subtitle.url, '_blank');
    }
  }

  function handleSubtitleClick(subtitle: Subtitle) {
    void openSubtitle(subtitle);
  }

  function handleTorrentWithSubtitleClick(torrent: YtsTorrent, subtitle: Subtitle) {
    void openSubtitle(subtitle);
    openMagnet(torrent);
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
            <Fragment key={`${torrent.quality}-${torrent.type}`}>
              <CpcMenuItem onClick={() => openMagnet(torrent)}>
                <span>{torrent.quality}</span>
                <span className="opacity-60 ml-1">
                  {torrent.type !== 'web' ? torrent.type : ''} — {torrent.size}
                </span>
              </CpcMenuItem>
              {subtitleLanguages.map((language) => {
                const subtitle = bestSubtitleFor(subtitles, torrent, language);
                if (!subtitle) return null;
                return (
                  <CpcMenuItem
                    key={language}
                    onClick={() => handleTorrentWithSubtitleClick(torrent, subtitle)}
                  >
                    <span className="pl-4 text-xs opacity-80">
                      + sous-titres {language.toUpperCase()}
                    </span>
                  </CpcMenuItem>
                );
              })}
            </Fragment>
          ))}
        </CpcMenu>
      )}
      {mediaType === 'tv' && seasons > 0 && (
        <TpbMenu title={originalTitle || title} seasons={seasons} />
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
                    <span className="flex flex-col gap-0.5 max-w-[min(28rem,calc(100vw-3rem))]">
                      <span className="flex items-baseline gap-1">
                        {matchedQualityByFileId.has(subtitle.file_id) && (
                          <span className="shrink-0" title="Correspond au torrent YIFY">
                            ★ {matchedQualityByFileId.get(subtitle.file_id)}
                          </span>
                        )}
                        <span className="opacity-60">
                          {subtitle.hearing_impaired ? 'SDH — ' : ''}
                          {formatCount(subtitle.download_count)} téléchargements
                        </span>
                      </span>
                      <span className="text-xs whitespace-normal break-all">
                        {subtitle.release}
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

/** Groups by language, with the subtitles matching a YIFY torrent listed first. */
function groupByLanguage(
  subtitles: Subtitle[],
  matched: Map<number, string>,
): [string, Subtitle[]][] {
  const groups = new Map<string, Subtitle[]>();
  for (const subtitle of subtitles) {
    const items = groups.get(subtitle.language) ?? [];
    items.push(subtitle);
    groups.set(subtitle.language, items);
  }
  for (const items of groups.values()) {
    items.sort((a, b) => Number(matched.has(b.file_id)) - Number(matched.has(a.file_id)));
  }
  return [...groups.entries()];
}

function openMagnet(torrent: YtsTorrent) {
  window.location.href = torrent.magnet;
}

function formatCount(count: number): string {
  return new Intl.NumberFormat('fr-FR', { notation: 'compact' }).format(count);
}
