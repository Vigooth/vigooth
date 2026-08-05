import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { logout as apiLogout, me, type User } from '@/lib/api/auth';
import { UNAUTHORIZED_EVENT } from '@/lib/api/client';

const STORAGE_KEY = 'garden:user';

interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  /**
   * True while the first session probe is in flight and nothing local says who
   * the user is. Rendering the login form during this window would flash it in
   * front of anyone arriving with a valid cookie from a sibling app.
   */
  checking: boolean;
  signIn: (user: User) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthStore | null>(null);

/**
 * The session itself is an HttpOnly cookie the browser holds; this is only a
 * local note of who that cookie belongs to, so the app can render the right
 * screen without a round trip on boot. It is not proof of anything — the API
 * still decides, and a 401 clears it.
 */
function readStoredUser(): User | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed: User = JSON.parse(raw);
    return parsed?.id ? parsed : null;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(readStoredUser);
  // A stored note is enough to render straight away; the probe below then either
  // confirms it or clears it. Only a first-time visitor waits.
  const [checking, setChecking] = useState(() => readStoredUser() === null);

  const signIn = useCallback((next: User) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setUser(next);
  }, []);

  const clear = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, []);

  const signOut = useCallback(() => {
    void apiLogout().catch(() => {
      // The cookie may already be gone; the local state still has to go.
    });
    clear();
  }, [clear]);

  // An expired or missing cookie surfaces as a 401 on the first real request.
  // Dropping the local note here is what sends the user back to the login form
  // instead of leaving them staring at an error they cannot act on.
  useEffect(() => {
    globalThis.addEventListener(UNAUTHORIZED_EVENT, clear);
    return () => globalThis.removeEventListener(UNAUTHORIZED_EVENT, clear);
  }, [clear]);

  /**
   * Adopt an existing session on boot.
   *
   * The auth cookie covers every app on the domain, so signing in on moovi
   * already authenticates this one — but localStorage is per-origin, so only the
   * server can say so. A 401 here simply means no session; the listener above has
   * already cleared any stale note by the time this settles.
   */
  useEffect(() => {
    let cancelled = false;

    me()
      .then((found) => {
        if (cancelled) return;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(found));
        setUser(found);
      })
      .catch(() => {
        // No session, or a token for an account that no longer exists.
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AuthStore>(
    () => ({ user, isAuthenticated: user !== null, checking, signIn, signOut }),
    [user, checking, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthStore {
  const store = useContext(AuthContext);
  if (!store) throw new Error('useAuth must be used inside an AuthProvider');
  return store;
}
