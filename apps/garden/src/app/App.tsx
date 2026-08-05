import { useState } from 'react';
import { CpcButton } from '@vigooth/ui';
import { getPortalUrl } from '@vigooth/config';
import { TimelineView } from '@/features/calendar/components/TimelineView';
import { PlanView } from '@/features/plan/components/PlanView';
import { PlantsView } from '@/features/plants/components/PlantsView';
import { AuthProvider, useAuth } from '@/stores/AuthStore';
import { GardenProvider } from '@/stores/GardenStore';
import { LoginScreen } from './pages/LoginScreen';

type Tab = 'plants' | 'calendar' | 'plan';

const TABS: { id: Tab; label: string }[] = [
  { id: 'plants', label: 'PLANTES' },
  { id: 'calendar', label: 'CALENDRIER' },
  { id: 'plan', label: 'PLAN' },
];

export function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}

/**
 * Every garden endpoint requires a session, so there is nothing to render before
 * one exists. Mounting `GardenProvider` only past this point also means its
 * initial load never fires an unauthenticated request.
 */
function AuthGate() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <LoginScreen />;
  return (
    <GardenProvider>
      <GardenShell />
    </GardenProvider>
  );
}

function GardenShell() {
  const { user, signOut } = useAuth();
  const [tab, setTab] = useState<Tab>('plants');

  return (
    <div className="min-h-screen bg-black p-4 font-mono text-cpc-green-500">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b-2 border-cpc-green-500 pb-3">
        <div className="flex items-baseline gap-3">
          <span className="text-cpc-orange-500">🌱 GARDEN</span>
          <span className="text-xs text-cpc-green-900">Amstrad CPC 6128 — POTAGER v1</span>
        </div>
        <div className="flex items-center gap-3">
          {user && <span className="text-xs text-cpc-green-900">{user.email}</span>}
          <CpcButton variant="text" color="red" size="xs" onClick={signOut}>
            DECONNEXION
          </CpcButton>
          <a
            href={getPortalUrl()}
            className="border-2 border-cpc-green-500 px-3 py-1 text-xs text-cpc-green-500 transition-colors hover:bg-cpc-green-500 hover:text-cpc-grey-900"
          >
            &lt; PORTAL
          </a>
        </div>
      </header>

      <nav className="mb-4 flex flex-wrap gap-2">
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
        {/* Mounted one at a time on purpose: the plant list holds a canvas tracer
            per card, and keeping the hidden tabs alive would keep those alive too. */}
        {tab === 'plants' && <PlantsView />}
        {tab === 'calendar' && <TimelineView />}
        {tab === 'plan' && <PlanView />}
      </main>
    </div>
  );
}
