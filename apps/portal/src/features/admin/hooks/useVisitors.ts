import { useCallback, useEffect, useState } from 'react';
import { fetchVisitors, PAGE_SIZE } from '../api/visits';
import type { Visitor } from '../types/visit';

interface VisitorList {
  visitors: Visitor[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  refresh: () => void;
}

/** Addresses most recently seen first, paged like the visit log. */
export function useVisitors(): VisitorList {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [generation, setGeneration] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchVisitors()
      .then((page) => {
        if (cancelled) return;
        setVisitors(page);
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
  }, [generation]);

  const loadMore = useCallback(() => {
    setLoading(true);
    fetchVisitors(visitors.length)
      .then((page) => {
        setVisitors((previous) => [...previous, ...page]);
        setHasMore(page.length === PAGE_SIZE);
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : 'Chargement impossible');
      })
      .finally(() => setLoading(false));
  }, [visitors.length]);

  const refresh = useCallback(() => setGeneration((n) => n + 1), []);

  return { visitors, loading, error, hasMore, loadMore, refresh };
}
