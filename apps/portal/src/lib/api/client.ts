import { getApiUrl } from '@vigooth/config';

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

async function toError(response: Response): Promise<RequestError> {
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
  const response = await fetch(`${getApiUrl()}${endpoint}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
    credentials: 'include',
  });

  if (!response.ok) throw await toError(response);
  return response.json();
}

/** Same as `request`, for endpoints that answer with a message we ignore. */
export async function requestVoid(endpoint: string, options: RequestInit = {}): Promise<void> {
  const response = await fetch(`${getApiUrl()}${endpoint}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
    credentials: 'include',
  });

  if (!response.ok) throw await toError(response);
}
