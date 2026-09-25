import { useCallback } from 'react';
import { useBlobUrl } from '@/hooks/useBlobUrl';
import { useGarden } from '@/stores/GardenStore';

/**
 * Resolve a plant's photo to a blob URL.
 *
 * Which endpoint answers is the store's business, not this hook's: the same
 * plant card serves the signed-in owner and an anonymous visitor.
 */
export function usePlantPhoto(plantId: string, hasPhoto: boolean): string | null {
  const { photoUrlFor } = useGarden();
  const resolve = useCallback(() => photoUrlFor(plantId), [photoUrlFor, plantId]);
  return useBlobUrl(hasPhoto ? resolve : null);
}
