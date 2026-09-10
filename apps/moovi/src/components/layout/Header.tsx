import { useNavigate, useLocation } from 'react-router-dom';
import { CpcButton, CpcMenu, CpcMenuItem } from '@vigooth/ui';
import { getAppsConfig } from '@vigooth/config';
import { useAuth } from '@/stores/auth';

const otherApps = getAppsConfig('movies');

interface Tab {
  path: string;
  label: string;
  color: 'green' | 'yellow' | 'magenta';
}

// Search comes first: it is the landing page after login.
const tabs: Tab[] = [
  { path: '/search', label: 'SEARCH', color: 'green' },
  { path: '/collection', label: 'COLLECTION', color: 'green' },
  { path: '/wishlist', label: 'WISHLIST', color: 'yellow' },
  { path: '/recommendations', label: 'RECO', color: 'magenta' },
  { path: '/status', label: 'STATUS', color: 'green' },
];

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="flex items-center p-3 border-b-2 border-cpc-green-500 gap-4 min-w-0">
      <CpcMenu
        color="cyan"
        trigger={
          <CpcButton variant="text" color="cyan" size="lg">
            MOOVI
          </CpcButton>
        }
      >
        {otherApps.map((app) => (
          <CpcMenuItem
            key={app.id}
            onClick={() => {
              window.location.href = app.url;
            }}
          >
            {app.name}
          </CpcMenuItem>
        ))}
      </CpcMenu>
      <nav className="flex gap-2 overflow-x-auto min-w-0 flex-1 scrollbar-none">
        {tabs.map((tab) => {
          const active = isActive(tab.path);
          return (
            <CpcButton
              key={tab.path}
              variant={active ? 'filled' : 'text'}
              color={tab.color}
              aria-current={active ? 'page' : undefined}
              onClick={() => navigate(tab.path)}
            >
              {tab.label}
            </CpcButton>
          );
        })}
      </nav>
      <CpcButton variant="outlined" color="red" onClick={handleLogout}>
        LOGOUT
      </CpcButton>
    </div>
  );
}
