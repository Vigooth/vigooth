import type { CountBucket, VisitStats } from '../types/visit';

interface StatsPanelProps {
  stats: VisitStats;
}

function Tile({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1 border-2 border-cpc-green-900 p-3">
      <span className="text-xs text-cpc-green-900">{label}</span>
      <span className="text-2xl text-cpc-yellow-500">{value}</span>
    </div>
  );
}

function Breakdown({
  title,
  buckets,
  emptyKey,
}: {
  title: string;
  buckets: CountBucket[];
  emptyKey: string;
}) {
  const max = buckets.reduce((acc, b) => Math.max(acc, b.count), 0);
  return (
    <div className="flex flex-col gap-2 border-2 border-cpc-green-900 p-3">
      <span className="text-xs text-cpc-green-900">{title}</span>
      {buckets.length === 0 && <span className="text-xs text-cpc-green-900">—</span>}
      <ul className="flex flex-col gap-1">
        {buckets.map((bucket) => (
          <li key={bucket.key || emptyKey} className="flex items-center gap-2 text-xs">
            <span className="w-32 shrink-0 truncate text-cpc-green-500">
              {bucket.key || emptyKey}
            </span>
            <span className="h-2 grow bg-black">
              <span
                className="block h-full bg-cpc-cyan-500"
                style={{ width: `${max > 0 ? (bucket.count / max) * 100 : 0}%` }}
              />
            </span>
            <span className="w-10 shrink-0 text-right text-cpc-yellow-500">{bucket.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function StatsPanel({ stats }: StatsPanelProps) {
  return (
    <section className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label="AUJOURD'HUI" value={stats.today} />
        <Tile label="7 JOURS" value={stats.last_7_days} />
        <Tile label="IP UNIQUES 7J" value={stats.unique_ips_7d} />
        <Tile label="TOTAL" value={stats.total} />
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Breakdown title="PAYS (30 JOURS)" buckets={stats.by_country_30d} emptyKey="Inconnu" />
        <Breakdown title="APPS (30 JOURS)" buckets={stats.by_app_30d} emptyKey="?" />
      </div>
    </section>
  );
}
