import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CpcButton } from '@vigooth/ui';
import { AdminDashboard } from '@/features/admin/components/AdminDashboard';
import { AdminLogin } from '@/features/admin/components/AdminLogin';
import { logout, me, type User } from '@/lib/api/auth';

type Session =
  | { status: 'checking' }
  | { status: 'anonymous' }
  | { status: 'signed-in'; user: User };

/**
 * The admin space, at /admin.
 *
 * Nothing is stored locally: the session is the domain-wide auth cookie, and
 * the API says on every load whether it is there and whether it is an admin's.
 * That keeps the page honest about access, at the cost of one round trip.
 */
export function AdminPage() {
  const [session, setSession] = useState<Session>({ status: 'checking' });

  useEffect(() => {
    let cancelled = false;
    me()
      .then((user) => {
        if (!cancelled) setSession({ status: 'signed-in', user });
      })
      .catch(() => {
        if (!cancelled) setSession({ status: 'anonymous' });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSignedIn = useCallback((user: User) => {
    setSession({ status: 'signed-in', user });
  }, []);

  const handleSignOut = useCallback(() => {
    void logout().catch(() => {
      // The cookie may already be gone; the local state still has to go.
    });
    setSession({ status: 'anonymous' });
  }, []);

  return (
    <div className="cpc-screen h-full overflow-auto bg-black font-mono text-cpc-green-500">
      {session.status === 'checking' && (
        <div className="grid min-h-full place-items-center text-xs text-cpc-green-900">
          VERIFICATION DE LA SESSION...
        </div>
      )}
      {session.status === 'anonymous' && <AdminLogin onSignedIn={handleSignedIn} />}
      {session.status === 'signed-in' && !session.user.is_admin && (
        <div className="grid min-h-full place-items-center p-4">
          <div className="flex flex-col items-center gap-4 border-2 border-cpc-red-500 p-6">
            <span className="text-cpc-red-500">ACCES REFUSE</span>
            <span className="text-xs text-cpc-green-900">
              {session.user.email} n&apos;est pas administrateur
            </span>
            <div className="flex gap-3">
              <CpcButton variant="text" color="red" size="xs" onClick={handleSignOut}>
                DECONNEXION
              </CpcButton>
              <Link to="/" className="text-xs text-cpc-cyan-500 hover:underline">
                &lt; RETOUR
              </Link>
            </div>
          </div>
        </div>
      )}
      {session.status === 'signed-in' && session.user.is_admin && (
        <AdminDashboard user={session.user} onSignOut={handleSignOut} />
      )}
    </div>
  );
}
