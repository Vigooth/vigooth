import { useNavigate, useLocation } from 'react-router-dom'
import { CpcButton, CpcMenu, CpcMenuItem } from '@vigooth/ui'
import { getAppsConfig } from '@vigooth/config'
import { useAuth } from '@/stores/auth'

const otherApps = getAppsConfig('movies')

export function Header() {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isActive = (path: string) => location.pathname === path

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
          <CpcMenuItem key={app.id} onClick={() => { window.location.href = app.url }}>
            {app.name}
          </CpcMenuItem>
        ))}
      </CpcMenu>
      <nav
        className="flex gap-2 overflow-x-auto min-w-0 flex-1 scrollbar-none"
      >
          <CpcButton
            variant="text"
            color={isActive('/collection') ? 'cyan' : 'green'}
            onClick={() => navigate('/collection')}
          >
            COLLECTION
          </CpcButton>
          <CpcButton
            variant="text"
            color={isActive('/search') ? 'cyan' : 'green'}
            onClick={() => navigate('/search')}
          >
            SEARCH
          </CpcButton>
          <CpcButton
            variant="text"
            color={isActive('/wishlist') ? 'cyan' : 'yellow'}
            onClick={() => navigate('/wishlist')}
          >
            WISHLIST
          </CpcButton>
          <CpcButton
            variant="text"
            color={isActive('/recommendations') ? 'cyan' : 'magenta'}
            onClick={() => navigate('/recommendations')}
          >
            RECO
          </CpcButton>
          <CpcButton
            variant="text"
            color={isActive('/status') ? 'cyan' : 'green'}
            onClick={() => navigate('/status')}
          >
            STATUS
          </CpcButton>
      </nav>
      <CpcButton
        variant="outlined"
        color="red"
        onClick={handleLogout}
      >
        LOGOUT
      </CpcButton>
    </div>
  )
}
