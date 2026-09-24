import { useCallback, useEffect, useRef, useState } from 'react';
import { checkPlantModelGeneration, startPlantModelGeneration } from '@/lib/api/garden';

/** How often to ask the server where the task stands. Meshy takes 1–3 minutes. */
const POLL_MS = 4000;

export interface ModelGeneration {
  /** Null when idle; otherwise what the button should show. */
  phase: 'starting' | 'running' | 'failed' | null;
  progress: number;
  error: string | null;
  start: () => void;
}

/**
 * Drive one plant's photo-to-3D generation: start the task, poll until it lands,
 * then hand back to the caller to reload the garden. The polling timer is
 * cleared on unmount, and a task already storing its model server-side is not
 * lost by that — the next visit simply shows the model.
 */
export function useModelGeneration(plantId: string, onDone: () => void): ModelGeneration {
  const [phase, setPhase] = useState<ModelGeneration['phase']>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const start = useCallback(() => {
    setPhase('starting');
    setProgress(0);
    setError(null);

    const poll = async (taskId: string) => {
      try {
        const status = await checkPlantModelGeneration(plantId, taskId);
        setProgress(status.progress);
        switch (status.status) {
          case 'succeeded':
            setPhase(null);
            onDone();
            return;
          case 'failed':
            setPhase('failed');
            setError(status.error ?? 'La génération a échoué');
            return;
          default:
            setPhase('running');
            timer.current = setTimeout(() => void poll(taskId), POLL_MS);
        }
      } catch (cause) {
        setPhase('failed');
        setError(cause instanceof Error ? cause.message : 'Suivi impossible');
      }
    };

    startPlantModelGeneration(plantId)
      .then(({ task_id }) => {
        setPhase('running');
        timer.current = setTimeout(() => void poll(task_id), POLL_MS);
      })
      .catch((cause: unknown) => {
        setPhase('failed');
        setError(cause instanceof Error ? cause.message : 'Démarrage impossible');
      });
  }, [plantId, onDone]);

  return { phase, progress, error, start };
}
