import { useLocation, useNavigate } from 'react-router-dom'
import { CpcButton, CpcMenu, CpcMenuItem } from '@vigooth/ui'
import { getAppsConfig } from '@vigooth/config'

const otherApps = getAppsConfig('steam')

export function Header() {
  const navigate = useNavigate()
  const location = useLocation()

  const isActive = (path: string) => location.pathname.startsWith(path)

  return (
    <div className="flex items-center p-3 border-b-2 border-cpc-green-500 gap-4 min-w-0">
      <CpcMenu
        color="magenta"
        trigger={
          <button className="text-cpc-magenta-500 font-bold shrink-0 cursor-pointer hover:text-cpc-yellow-500 transition-colors">
            STEAM
          </button>
        }
      >
        {otherApps.map((app) => (
          <CpcMenuItem key={app.id} onClick={() => { window.location.href = app.url }}>
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
    </div>
  )
}
