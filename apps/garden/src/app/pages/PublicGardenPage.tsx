import { useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { CpcButton } from '@vigooth/ui';
import { getPortalUrl } from '@vigooth/config';
import { AppSwitcher } from '@/components/AppSwitcher';
import { TimelineView } from '@/features/calendar/components/TimelineView';
import { PlanView } from '@/features/plan/components/PlanView';
import { PlantsView } from '@/features/plants/components/PlantsView';
import { TourView } from '@/features/tour/components/TourView';
import { GardenProvider } from '@/stores/GardenStore';

type Tab = 'plants' | 'calendar' | 'plan' | 'tour';

const TABS: { id: Tab; label: string }[] = [
  { id: 'plants', label: 'PLANTES' },
  { id: 'calendar', label: 'CALENDRIER' },
  { id: 'plan', label: 'PLAN' },
  { id: 'tour', label: 'VISITE 360' },
];

/**
 * Someone's garden, shown to a visitor with no account.
 *
 * The three views are the same components the owner sees; the store's `readOnly`
 * flag is what strips every editing affordance. Duplicating them read-only would
 * have meant two versions of the timeline drifting apart.
 */
export function PublicGardenPage() {
  const { userId } = useParams<{ userId: string }>();
  const [tab, setTab] = useState<Tab>('plants');

  if (!userId) return <Navigate to="/" replace />;

  return (
    <GardenProvider publicUserId={userId}>
      <div className="cpc-screen min-h-screen bg-black p-4 font-mono text-cpc-green-500">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b-2 border-cpc-green-500 pb-3">
          <div className="flex items-center gap-3">
            <AppSwitcher />
            <span className="text-xs text-cpc-green-900">CONSULTATION — LECTURE SEULE</span>
          </div>
          <a
            href={getPortalUrl()}
            className="border-2 border-cpc-green-500 px-3 py-1 text-xs text-cpc-green-500 transition-colors hover:bg-cpc-green-500 hover:text-cpc-grey-900"
          >
            &lt; PORTAL
          </a>
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
          {tab === 'plants' && <PlantsView />}
          {tab === 'calendar' && <TimelineView />}
          {tab === 'plan' && <PlanView />}
          {tab === 'tour' && <TourView />}
        </main>
      </div>
    </GardenProvider>
  );
}
