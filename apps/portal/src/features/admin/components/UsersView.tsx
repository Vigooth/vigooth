import { useEffect, useState } from 'react';
import { fetchUsers } from '../api/users';
import type { AdminUser } from '../types/user';
import { formatVisitDate } from '../utils/format';

const headClass = 'px-2 py-1 text-left text-xs font-normal text-cpc-green-900';
const cellClass = 'px-2 py-1 align-top text-xs';

/** Every account on the API, newest first, with who among them is an admin. */
export function UsersView() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchUsers()
      .then((list) => {
        if (!cancelled) setUsers(list);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Chargement impossible');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <p className="text-xs text-cpc-green-900">CHARGEMENT...</p>;
  if (error) return <p className="text-xs text-cpc-red-500">{error}</p>;
  if (users.length === 0) return <p className="text-xs text-cpc-green-900">AUCUN UTILISATEUR</p>;

  return (
    <section className="flex flex-col gap-3">
      <span className="text-xs text-cpc-green-900">{users.length} COMPTES</span>
      <div className="overflow-x-auto border-2 border-cpc-green-900">
        <table className="w-full min-w-[40rem] border-collapse">
          <thead>
            <tr className="border-b-2 border-cpc-green-900">
              <th className={headClass}>EMAIL</th>
              <th className={headClass}>ROLE</th>
              <th className={headClass}>INSCRIT LE</th>
              <th className={headClass}>ID</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr
                key={user.id}
                className="border-b border-cpc-green-900/40 hover:bg-cpc-green-900/20"
              >
                <td className={`${cellClass} text-cpc-green-500`}>{user.email}</td>
                <td
                  className={`${cellClass} ${user.is_admin ? 'text-cpc-yellow-500' : 'text-cpc-green-900'}`}
                >
                  {user.is_admin ? 'ADMIN' : 'UTILISATEUR'}
                </td>
                <td className={`${cellClass} whitespace-nowrap text-cpc-green-500`}>
                  {formatVisitDate(user.created_at)}
                </td>
                <td className={`${cellClass} font-mono text-cpc-green-900`}>{user.id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
