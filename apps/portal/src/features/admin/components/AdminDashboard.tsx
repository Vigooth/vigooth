import { useState } from 'react';
import { CpcButton } from '@vigooth/ui';
import type { User } from '@/lib/api/auth';
import { UsersView } from './UsersView';
import { VisitsView } from './VisitsView';

interface AdminDashboardProps {
  user: User;
  onSignOut: () => void;
}

type Tab = 'visits' | 'users';

const TABS: { id: Tab; label: string }[] = [
  { id: 'visits', label: 'VISITES' },
  { id: 'users', label: 'UTILISATEURS' },
];

export function AdminDashboard({ user, onSignOut }: AdminDashboardProps) {
  const [tab, setTab] = useState<Tab>('visits');

  return (
    <div className="flex flex-col gap-4 p-4">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-cpc-green-500 pb-3">
        <span className="text-cpc-yellow-500">ADMIN</span>
        <div className="flex items-center gap-3">
          <span className="text-xs text-cpc-green-900">{user.email}</span>
          <CpcButton variant="text" color="red" size="xs" onClick={onSignOut}>
            DECONNEXION
          </CpcButton>
        </div>
      </header>

      <nav className="flex flex-wrap gap-2">
        {TABS.map((candidate) => (
          <CpcButton
            key={candidate.id}
            variant={tab === candidate.id ? 'filled' : 'outlined'}
            color={tab === candidate.id ? 'green' : 'cyan'}
            size="sm"
            onClick={() => setTab(candidate.id)}
          >
            {candidate.label}
          </CpcButton>
        ))}
      </nav>

      <main>
        {/* One at a time: each view owns its own fetch, and a hidden tab should
            not keep polling nothing. */}
        {tab === 'visits' && <VisitsView />}
        {tab === 'users' && <UsersView />}
      </main>
    </div>
  );
}
