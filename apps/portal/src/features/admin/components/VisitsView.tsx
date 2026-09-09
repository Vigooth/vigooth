import { useState } from 'react';
import { CpcButton } from '@vigooth/ui';
import { apps } from '@vigooth/config';
import { useVisitLog } from '../hooks/useVisitLog';
import { useVisitors } from '../hooks/useVisitors';
import { StatsPanel } from './StatsPanel';
import { VisitorsTable } from './VisitorsTable';
import { VisitsTable } from './VisitsTable';

type Mode = 'visitors' | 'log';

const selectClass =
  'border-2 border-cpc-green-900 bg-black px-2 py-1 font-mono text-xs text-cpc-green-500 ' +
  'outline-none focus:border-cpc-green-500';

/** Stats on top, then the traffic either grouped by address or as a flat log. */
export function VisitsView() {
  const [mode, setMode] = useState<Mode>('visitors');
  const log = useVisitLog();

  return (
    <div className="flex flex-col gap-4">
      {log.stats && <StatsPanel stats={log.stats} />}

      <div className="flex flex-wrap items-center gap-2">
        <CpcButton
          variant={mode === 'visitors' ? 'filled' : 'outlined'}
          color={mode === 'visitors' ? 'green' : 'cyan'}
          size="xs"
          onClick={() => setMode('visitors')}
        >
          PAR IP
        </CpcButton>
        <CpcButton
          variant={mode === 'log' ? 'filled' : 'outlined'}
          color={mode === 'log' ? 'green' : 'cyan'}
          size="xs"
          onClick={() => setMode('log')}
        >
          JOURNAL
        </CpcButton>
      </div>

      {mode === 'visitors' && <VisitorsSection />}
      {mode === 'log' && <LogSection log={log} />}
    </div>
  );
}

function VisitorsSection() {
  const { visitors, loading, error, hasMore, loadMore, refresh } = useVisitors();

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs text-cpc-green-900">
          UNE LIGNE PAR ADRESSE, CLIQUER POUR L&apos;HISTORIQUE
        </span>
        <CpcButton variant="outlined" color="cyan" size="xs" onClick={refresh} disabled={loading}>
          RAFRAICHIR
        </CpcButton>
      </div>

      {error && <p className="text-xs text-cpc-red-500">{error}</p>}

      <VisitorsTable visitors={visitors} />

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
  );
}

function LogSection({ log }: { log: ReturnType<typeof useVisitLog> }) {
  const { visits, app, setApp, loading, error, hasMore, loadMore, refresh } = log;

  const handleAppChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setApp(event.target.value);
  };

  return (
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
  );
}
