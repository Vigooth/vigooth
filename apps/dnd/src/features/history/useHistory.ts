import { useCallback, useState } from 'react';

interface UseHistoryOptions {
  maxSize?: number;
}

export interface History<T> {
  canUndo: boolean;
  canRedo: boolean;
  commit: (snapshot: T) => void;
  undo: (current: T) => T | null;
  redo: (current: T) => T | null;
  clear: () => void;
}

export function useHistory<T>(opts: UseHistoryOptions = {}): History<T> {
  const maxSize = opts.maxSize ?? 100;
  const [past, setPast] = useState<T[]>([]);
  const [future, setFuture] = useState<T[]>([]);

  const commit = useCallback(
    (snapshot: T) => {
      setPast((p) => {
        const next = [...p, snapshot];
        if (next.length > maxSize) next.shift();
        return next;
      });
      setFuture([]);
    },
    [maxSize],
  );

  const undo = useCallback(
    (current: T): T | null => {
      if (past.length === 0) return null;
      const prev = past[past.length - 1];
      setPast((p) => p.slice(0, -1));
      setFuture((f) => [...f, current]);
      return prev;
    },
    [past],
  );

  const redo = useCallback(
    (current: T): T | null => {
      if (future.length === 0) return null;
      const next = future[future.length - 1];
      setFuture((f) => f.slice(0, -1));
      setPast((p) => [...p, current]);
      return next;
    },
    [future],
  );

  const clear = useCallback(() => {
    setPast([]);
    setFuture([]);
  }, []);

  return { canUndo: past.length > 0, canRedo: future.length > 0, commit, undo, redo, clear };
}
