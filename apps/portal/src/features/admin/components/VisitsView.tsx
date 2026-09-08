import { CpcButton } from '@vigooth/ui';
import { apps } from '@vigooth/config';
import { useVisitLog } from '../hooks/useVisitLog';
import { StatsPanel } from './StatsPanel';
import { VisitsTable } from './VisitsTable';

const selectClass =
  'border-2 border-cpc-green-900 bg-black px-2 py-1 font-mono text-xs text-cpc-green-500 ' +
  'outline-none focus:border-cpc-green-500';

export function VisitsView() {
  const { visits, stats, app, setApp, loading, error, hasMore, loadMore, refresh } = useVisitLog();

  const handleAppChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setApp(event.target.value);
  };

  return (
    <div className="flex flex-col gap-4">
      {stats && <StatsPanel stats={stats} />}

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-cpc-green-900">FILTRE</span>
          <select className={selectClass} value={app} onChange={handleAppChange}>
            <option value="">TOUTES LES APPS</option>
            {apps.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.name}
              </option>
            ))}
          </select>
          <CpcButton variant="outlined" color="cyan" size="xs" onClick={refresh} disabled={loading}>
            RAFRAICHIR
          </CpcButton>
        </div>

        {error && <p className="text-xs text-cpc-red-500">{error}</p>}

        <VisitsTable visits={visits} />

        <div className="flex items-center gap-3">
          {hasMore && (
            <CpcButton
              variant="outlined"
              color="green"
              size="sm"
              onClick={loadMore}
              disabled={loading}
            >
              CHARGER PLUS
            </CpcButton>
          )}
          {loading && <span className="text-xs text-cpc-green-900">CHARGEMENT...</span>}
        </div>
      </section>
    </div>
  );
}
