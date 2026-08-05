import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  fetchPlantPhotoUrl,
  fetchPublicPlantPhotoUrl,
  getGarden,
  getPublicGarden,
} from '@/lib/api/garden';
import type { Bed, Conflict, Garden, Occupation, Plant } from '@/types/garden';

interface GardenStore {
  /**
   * The four lists, exposed directly rather than behind a nullable `garden`.
   * Consumers used to write `garden?.beds ?? []`, which allocates a fresh array
   * on every render and silently defeats every `useMemo` that depends on it.
   * These references are stable between reloads.
   */
  beds: Bed[];
  plants: Plant[];
  occupations: Occupation[];
  conflicts: Conflict[];
  loading: boolean;
  error: string | null;
  /**
   * True when showing someone else's garden to a visitor. Views use it to drop
   * every editing affordance — the API would refuse the write anyway, but a
   * button that always fails is worse than no button.
   */
  readOnly: boolean;
  /** Resolves a plant photo through whichever endpoint this view is entitled to. */
  photoUrlFor: (plantId: string) => Promise<string>;
  /** Re-read the whole garden. Every mutation ends with this. */
  reload: () => Promise<void>;
  plantName: (plantId: string) => string;
  bedName: (bedId: string) => string;
  /** Occupation ids the server flagged as overlapping something else. */
  conflictedOccupationIds: Set<string>;
  conflictsForBed: (bedId: string) => Conflict[];
  occupationsForBed: (bedId: string) => Occupation[];
}

const GardenContext = createContext<GardenStore | null>(null);

const EMPTY_GARDEN: Garden = { beds: [], plants: [], occupations: [], conflicts: [] };

interface GardenProviderProps {
  children: React.ReactNode;
  /**
   * Whose garden to show, when showing it publicly. Omitted for the signed-in
   * owner, who is identified by their session instead.
   */
  publicUserId?: string;
}

export function GardenProvider({ children, publicUserId }: GardenProviderProps) {
  const [garden, setGarden] = useState<Garden | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setGarden(publicUserId ? await getPublicGarden(publicUserId) : await getGarden());
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to load the garden');
    } finally {
      setLoading(false);
    }
  }, [publicUserId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const value = useMemo<GardenStore>(() => {
    const data = garden ?? EMPTY_GARDEN;
    const plantsById = new Map(data.plants.map((plant) => [plant.id, plant]));
    const bedsById = new Map(data.beds.map((bed) => [bed.id, bed]));

    // Both sides of every reported pair, so a bar can ask about itself alone.
    const conflicted = new Set<string>();
    for (const conflict of data.conflicts) {
      conflicted.add(conflict.occupation_a_id);
      conflicted.add(conflict.occupation_b_id);
    }

    return {
      beds: data.beds,
      plants: data.plants,
      occupations: data.occupations,
      conflicts: data.conflicts,
      loading,
      error,
      readOnly: publicUserId !== undefined,
      photoUrlFor: (plantId) =>
        publicUserId
          ? fetchPublicPlantPhotoUrl(publicUserId, plantId)
          : fetchPlantPhotoUrl(plantId),
      reload,
      plantName: (plantId) => plantsById.get(plantId)?.name ?? 'Plante inconnue',
      bedName: (bedId) => bedsById.get(bedId)?.name ?? 'Emplacement inconnu',
      conflictedOccupationIds: conflicted,
      conflictsForBed: (bedId) => data.conflicts.filter((c) => c.bed_id === bedId),
      occupationsForBed: (bedId) => data.occupations.filter((o) => o.bed_id === bedId),
    };
  }, [garden, loading, error, reload, publicUserId]);

  return <GardenContext.Provider value={value}>{children}</GardenContext.Provider>;
}

export function useGarden(): GardenStore {
  const store = useContext(GardenContext);
  if (!store) throw new Error('useGarden must be used inside a GardenProvider');
  return store;
}
