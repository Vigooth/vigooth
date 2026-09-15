import type { Subtitle } from '@/types/movie';

/** The release facts shared by YTS and TPB torrents. */
export interface TorrentRelease {
  quality: string;
  type: string;
}

/** Minimum score for a subtitle to be considered a match for a torrent. */
const MATCH_THRESHOLD = 3;

/**
 * Scores how well a subtitle release fits a YTS torrent.
 * YIFY tag +3, same quality +2, same source (BluRay/WEB) +1.
 */
export function scoreSubtitle(subtitle: Subtitle, torrent: TorrentRelease): number {
  let score = 0;
  if (subtitle.yify) score += 3;
  if (subtitle.quality && subtitle.quality === torrent.quality.toLowerCase()) score += 2;
  if (subtitle.source && subtitle.source === torrentSource(torrent)) score += 1;
  return score;
}

function torrentSource(torrent: TorrentRelease): string {
  const type = torrent.type.toLowerCase();
  if (type.includes('web')) return 'web';
  if (type.includes('bluray')) return 'bluray';
  return '';
}

/** Best subtitle for a torrent in a given language, or null when nothing fits well enough. */
export function bestSubtitleFor(
  subtitles: Subtitle[],
  torrent: TorrentRelease,
  language: string,
): Subtitle | null {
  let best: Subtitle | null = null;
  let bestScore = MATCH_THRESHOLD - 1;
  for (const subtitle of subtitles) {
    if (subtitle.language !== language) continue;
    const score = scoreSubtitle(subtitle, torrent);
    // Ties keep the first one: the API already sorts by download count.
    if (score > bestScore) {
      best = subtitle;
      bestScore = score;
    }
  }
  return best;
}

/** Maps a subtitle file id to the torrent quality it best matches, across all torrents and languages. */
export function matchSubtitlesToTorrents(
  subtitles: Subtitle[],
  torrents: TorrentRelease[],
): Map<number, string> {
  const matches = new Map<number, string>();
  const languages = [...new Set(subtitles.map((subtitle) => subtitle.language))];
  for (const torrent of torrents) {
    for (const language of languages) {
      const best = bestSubtitleFor(subtitles, torrent, language);
      if (best && !matches.has(best.file_id)) {
        matches.set(best.file_id, torrent.quality);
      }
    }
  }
  return matches;
}
