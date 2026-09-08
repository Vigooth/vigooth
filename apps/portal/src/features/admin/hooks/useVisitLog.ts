import { useCallback, useEffect, useState } from 'react';
import { fetchVisits, fetchVisitStats, PAGE_SIZE } from '../api/visits';
import type { Visit, VisitStats } from '../types/visit';

interface VisitLog {
  visits: Visit[];
  stats: VisitStats | null;
  app: string;
  setApp: (app: string) => void;
  loading: boolean;
  error: string | null;
  /** False once a page came back shorter than the page size. */
  hasMore: boolean;
  loadMore: () => void;
  refresh: () => void;
}

/**
 * The dashboard's data: stats plus a paged, filterable visit list.
 *
 * Changing the app filter restarts the list from the top; "load more" appends
 * the next page. Stats ignore the filter on purpose, they describe the whole
 * site so the header stays a fixed point of reference while the list moves.
 */
export function useVisitLog(): VisitLog {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [stats, setStats] = useState<VisitStats | null>(null);
  const [app, setApp] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  // Bumped by `refresh` to re-run the first-page effect with unchanged inputs.
  const [generation, setGeneration] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([fetchVisits({ app }), fetchVisitStats()])
      .then(([page, nextStats]) => {
        if (cancelled) return;
        setVisits(page);
        setStats(nextStats);
        setHasMore(page.length === PAGE_SIZE);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : 'Chargement impossible');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [app, generation]);

  const loadMore = useCallback(() => {
    setLoading(true);
    fetchVisits({ app, offset: visits.length })
      .then((page) => {
        setVisits((previous) => [...previous, ...page]);
        setHasMore(page.length === PAGE_SIZE);
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : 'Chargement impossible');
      })
      .finally(() => setLoading(false));
  }, [app, visits.length]);

  const refresh = useCallback(() => setGeneration((n) => n + 1), []);

  return { visits, stats, app, setApp, loading, error, hasMore, loadMore, refresh };
}
