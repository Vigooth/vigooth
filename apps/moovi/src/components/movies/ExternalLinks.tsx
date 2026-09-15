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
import { useTpbTorrents } from '@/hooks/useTpbTorrents';
import { downloadSubtitle } from '@/lib/api/subtitles';
import { bestSubtitleFor, matchSubtitlesToTorrents } from '@/utils/subtitleMatch';
import type { Subtitle, TpbTorrent } from '@/types/movie';
import type { TorrentRelease } from '@/utils/subtitleMatch';

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
  const ytsEmpty = yts !== undefined && !(yts.found && yts.torrents && yts.torrents.length > 0);
  const { data: tpb } = useTpbTorrents(imdbId, title, year, mediaType === 'movie' && ytsEmpty);

  const subtitles = subs?.subtitles ?? [];
  const torrents: TorrentRelease[] = yts?.torrents ?? tpb?.torrents ?? [];
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

  function handleTorrentWithSubtitleClick(
    torrent: TorrentRelease & { magnet: string },
    subtitle: Subtitle,
  ) {
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
      {ytsEmpty && tpb?.found && (
        <CpcMenu
          color="orange"
          trigger={
            <CpcButton variant="outlined" color="orange">
              TPB
              <ChevronDownIcon size="sm" className="cpc-chevron-flip" />
            </CpcButton>
          }
        >
          {tpb.torrents.map((torrent) => (
            <Fragment key={torrent.magnet}>
              <CpcMenuItem onClick={() => openMagnet(torrent)}>
                <span className="flex flex-col">
                  <span className="flex items-baseline gap-1">
                    <span>{torrent.quality || '?'}</span>
                    <span className="opacity-60">
                      {tpbTypeLabel(torrent)} — {torrent.size} — {torrent.seeders} seeds
                    </span>
                  </span>
                  <span className="text-xs opacity-50 truncate max-w-72">{torrent.name}</span>
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
                      {matchedQualityByFileId.has(subtitle.file_id) && (
                        <span className="shrink-0" title="Correspond au torrent YIFY">
                          ★ {matchedQualityByFileId.get(subtitle.file_id)}
                        </span>
                      )}
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

function tpbTypeLabel(torrent: TpbTorrent): string {
  if (torrent.cam) return 'CAM';
  if (torrent.type === 'bluray') return 'BluRay';
  if (torrent.type === 'web') return 'WEB';
  return '';
}

function openMagnet(torrent: { magnet: string }) {
  window.location.href = torrent.magnet;
}

function formatCount(count: number): string {
  return new Intl.NumberFormat('fr-FR', { notation: 'compact' }).format(count);
}
