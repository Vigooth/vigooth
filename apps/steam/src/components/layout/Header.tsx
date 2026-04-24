import { useLocation, useNavigate } from 'react-router-dom';
import { CpcButton, CpcMenu, CpcMenuItem } from '@vigooth/ui';
import { getAppsConfig } from '@vigooth/config';
import { useAuth } from '@/app/providers';

const otherApps = getAppsConfig('steam');

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const isActive = (path: string) => location.pathname.startsWith(path);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex items-center p-3 border-b-2 border-cpc-green-500 gap-4 min-w-0">
      <CpcMenu
        color="magenta"
        trigger={
          <CpcButton variant="text" color="magenta" size="lg">
            STEAM
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
        <CpcButton
          variant="text"
          color={isActive('/library') ? 'magenta' : 'green'}
          onClick={() => navigate('/library')}
        >
          LIBRARY
        </CpcButton>
      </nav>
      {user && (
        <div className="flex items-center gap-2 shrink-0">
          <img
            src={user.avatar}
            alt={user.personaname}
            className="w-6 h-6 border border-cpc-green-900"
          />
          <span className="text-cpc-green-500 text-xs hidden sm:inline">{user.personaname}</span>
          <CpcButton variant="text" color="red" onClick={handleLogout}>
            LOGOUT
          </CpcButton>
        </div>
      )}
    </div>
  );
}
