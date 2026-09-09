import { useEffect, useState } from 'react';
import { fetchVisits } from '../api/visits';
import type { Visit } from '../types/visit';
import { VisitsTable } from './VisitsTable';

interface VisitorHistoryProps {
  ip: string;
}

// Enough for any one address without paging inside an expanded row; the API
// caps a page at this anyway.
const HISTORY_LIMIT = 500;

/** Every visit from one address, loaded when its row is opened. */
export function VisitorHistory({ ip }: VisitorHistoryProps) {
  const [visits, setVisits] = useState<Visit[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchVisits({ ip, limit: HISTORY_LIMIT })
      .then((list) => {
        if (!cancelled) setVisits(list);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Chargement impossible');
      });
    return () => {
      cancelled = true;
    };
  }, [ip]);

  if (error) return <p className="text-xs text-cpc-red-500">{error}</p>;
  if (visits === null) return <p className="text-xs text-cpc-green-900">CHARGEMENT...</p>;
  return <VisitsTable visits={visits} compact />;
}
