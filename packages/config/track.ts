import { getApiUrl } from './apps';

/**
 * Report one page load to the API, for the admin visit log.
 *
 * Sent in no-cors mode with a plain-text body: that makes it a "simple" request
 * the browser fires without a preflight and without needing the origin on the
 * API's CORS list, which is what lets every app report with one line. The
 * response is opaque and unread, which is fine: nothing here waits on it.
 * `keepalive` lets the request outlive a tab closed straight after landing.
 * Credentials are included so the API can attribute the hit to the signed-in
 * account: the auth cookie is same-site with the API, so it is sent even in
 * no-cors mode, and a missing or stale cookie just means an anonymous visit.
 *
 * Never throws: a lost beacon must never take the app down with it.
 */
export function trackVisit(appId: string): void {
  if (typeof window === 'undefined' || typeof fetch !== 'function') return;

  const payload = JSON.stringify({
    app: appId,
    path: window.location.pathname,
    referrer: document.referrer,
  });

  try {
    void fetch(`${getApiUrl()}/track`, {
      method: 'POST',
      mode: 'no-cors',
      credentials: 'include',
      keepalive: true,
      body: payload,
    }).catch(() => {
      // Offline, blocked, or the API is down: the visit is simply not counted.
    });
  } catch {
    // Same as above, for a fetch that rejects synchronously.
  }
}
