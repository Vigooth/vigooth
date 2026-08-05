import { useEffect, useState } from 'react';
import { useGarden } from '@/stores/GardenStore';

/**
 * Resolve a plant's photo to a blob URL, revoking it on unmount.
 *
 * The photo endpoint needs either the auth cookie or a public garden id, which
 * an `<img src>` pointing at another origin cannot supply — and even if it
 * could, the response would taint the canvas the tracer reads. So the bytes are
 * fetched here and wrapped in a blob URL, which counts as same-origin.
 *
 * Which endpoint to use is the store's business, not this hook's: the same plant
 * card serves the signed-in owner and an anonymous visitor.
 */
export function usePlantPhoto(plantId: string, hasPhoto: boolean): string | null {
  const { photoUrlFor } = useGarden();
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!hasPhoto) {
      setUrl(null);
      return;
    }

    let revoked = false;
    let created: string | null = null;

    photoUrlFor(plantId)
      .then((blobUrl) => {
        // Unmounted while in flight: revoke immediately, nothing will use it.
        if (revoked) {
          URL.revokeObjectURL(blobUrl);
          return;
        }
        created = blobUrl;
        setUrl(blobUrl);
      })
      .catch(() => setUrl(null));

    return () => {
      revoked = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [plantId, hasPhoto, photoUrlFor]);

  return url;
}
