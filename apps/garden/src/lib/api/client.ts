const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8090';

interface ApiError {
  error: string;
}

/** Thrown for any non-2xx response, carrying the status so callers can branch. */
export class RequestError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'RequestError';
    this.status = status;
  }
}

/**
 * Broadcast when the API rejects a request as unauthenticated.
 *
 * An event rather than a direct call into the auth store: the API layer has no
 * business importing React state, and every caller would otherwise need to
 * handle 401 itself and remember to do it the same way.
 */
export const UNAUTHORIZED_EVENT = 'garden:unauthorized';

async function toError(response: Response): Promise<RequestError> {
  if (response.status === 401) {
    globalThis.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  }
  const fallback = `HTTP ${response.status}`;
  try {
    const body: ApiError = await response.json();
    return new RequestError(response.status, body.error || fallback);
  } catch {
    return new RequestError(response.status, fallback);
  }
}

/** JSON request/response. Cookies ride along, which is how auth works here. */
export async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
    credentials: 'include',
  });

  if (!response.ok) throw await toError(response);
  return response.json();
}

/** Same as `request`, for endpoints that answer with a message we ignore. */
export async function requestVoid(endpoint: string, options: RequestInit = {}): Promise<void> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
    credentials: 'include',
  });

  if (!response.ok) throw await toError(response);
}

/**
 * PUT raw bytes, with the blob's own type as Content-Type.
 *
 * Deliberately not multipart: the caller already holds a Blob straight off a
 * canvas, and the server reads the body as-is.
 */
export async function putBinary(endpoint: string, blob: Blob): Promise<void> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'PUT',
    headers: { 'Content-Type': blob.type },
    credentials: 'include',
    body: blob,
  });

  if (!response.ok) throw await toError(response);
}

/** POST raw bytes and read a JSON answer back. Same rationale as `putBinary`. */
export async function postBinary<T>(endpoint: string, blob: Blob): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': blob.type },
    credentials: 'include',
    body: blob,
  });

  if (!response.ok) throw await toError(response);
  return response.json();
}

/**
 * Fetch an image and hand back a blob URL.
 *
 * This exists because of the tracer: a cross-origin `<img src>` pointing at the
 * API would taint the canvas, making the pixels unreadable, and it could not
 * send the auth cookie either. Fetching here keeps credentials and turns the
 * bytes into a same-origin blob URL the canvas can read freely.
 *
 * Callers own the returned URL and must revoke it.
 */
export async function fetchBlobUrl(endpoint: string): Promise<string> {
  const response = await fetch(`${API_URL}${endpoint}`, { credentials: 'include' });
  if (!response.ok) throw await toError(response);
  return URL.createObjectURL(await response.blob());
}
