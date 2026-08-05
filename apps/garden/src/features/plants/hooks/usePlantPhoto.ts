import { useEffect, useState } from 'react';
import { fetchPlantPhotoUrl } from '@/lib/api/garden';

/**
 * Resolve a plant's photo to a blob URL, revoking it on unmount.
 *
 * The photo endpoint needs the auth cookie, which an `<img src>` pointing at
 * another origin cannot send — and even if it could, the response would taint
 * the canvas the tracer reads. So the bytes are fetched here and wrapped in a
 * blob URL, which counts as same-origin.
 */
export function usePlantPhoto(plantId: string, hasPhoto: boolean): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!hasPhoto) {
      setUrl(null);
      return;
    }

    let revoked = false;
    let created: string | null = null;

    fetchPlantPhotoUrl(plantId)
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
  }, [plantId, hasPhoto]);

  return url;
}
