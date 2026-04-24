import type { SteamGame } from '@/types/game';

interface LibraryStatsProps {
  games: SteamGame[];
}

function formatPlaytime(minutes: number): string {
  const totalHours = Math.floor(minutes / 60);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  if (days > 0) return `${days}d ${hours}h`;
  return `${totalHours}h`;
}

export function LibraryStats({ games }: LibraryStatsProps) {
  const totalPlaytime = games.reduce((sum, g) => sum + g.playtime_forever, 0);
  const recentPlaytime = games.reduce((sum, g) => sum + (g.playtime_2weeks ?? 0), 0);
  const played = games.filter((g) => g.playtime_forever > 0).length;
  const neverPlayed = games.length - played;
  const topGames = [...games].sort((a, b) => b.playtime_forever - a.playtime_forever).slice(0, 3);

  return (
    <div className="flex items-center gap-4 p-3 border-b border-cpc-green-900 overflow-x-auto scrollbar-none">
      <Stat label="TOTAL" value={formatPlaytime(totalPlaytime)} color="magenta" />
      <Stat label="2 WEEKS" value={formatPlaytime(recentPlaytime)} color="cyan" />
      <Stat label="PLAYED" value={String(played)} color="green" />
      <Stat label="UNPLAYED" value={String(neverPlayed)} color="yellow" />
      <div className="h-6 w-px bg-cpc-green-900 shrink-0" />
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-cpc-green-900 text-xs">TOP:</span>
        {topGames.map((g, i) => (
          <span key={g.appid} className="text-xs">
            <span className="text-cpc-magenta-500">{i + 1}.</span>{' '}
            <span className="text-cpc-green-500">{g.name}</span>{' '}
            <span className="text-cpc-green-900">({formatPlaytime(g.playtime_forever)})</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex flex-col items-center shrink-0">
      <span className={`text-sm font-bold text-cpc-${color}-500`}>{value}</span>
      <span className="text-[10px] text-cpc-green-900">{label}</span>
    </div>
  );
}
