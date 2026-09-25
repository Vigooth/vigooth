import { useEffect, useState } from 'react';

/**
 * Resolve something to a blob URL and revoke it when it is no longer shown.
 *
 * Every image the garden stores is fetched rather than pointed at: the
 * endpoints need the auth cookie or a public garden id, which a cross-origin
 * `<img src>` cannot supply, and the response would taint the canvas the
 * tracers read off. A blob URL counts as same-origin, so both problems go.
 *
 * What it buys over an inline effect is the part that is easy to get wrong:
 * a URL that arrives after the component has moved on is revoked immediately
 * instead of leaking, and replacing the source revokes the one it replaces.
 *
 * `resolve` is called whenever it changes, so pass a stable function — one
 * from the store, or a `useCallback`. Returns null while in flight, when
 * there is nothing to show, or when the fetch failed.
 */
export function useBlobUrl(resolve: (() => Promise<string>) | null): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!resolve) {
      setUrl(null);
      return;
    }

    let done = false;
    let created: string | null = null;

    resolve()
      .then((blobUrl) => {
        // Unmounted or superseded while in flight: nothing will ever use this.
        if (done) {
          URL.revokeObjectURL(blobUrl);
          return;
        }
        created = blobUrl;
        setUrl(blobUrl);
      })
      .catch(() => {
        if (!done) setUrl(null);
      });

    return () => {
      done = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [resolve]);

  return url;
}

/**
 * The same lifetime, for a file already in hand — a photo just picked, which
 * needs no fetch. Kept apart from `useBlobUrl` because it resolves in the same
 * tick, so the image never flashes empty first.
 */
export function useObjectUrl(file: Blob | null): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  return url;
}
