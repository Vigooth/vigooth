import { useNavigate, useLocation } from 'react-router-dom'
import { cn } from '@vigooth/ui'
import { useAuth } from '@/stores/auth'

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
      <span className="text-cpc-cyan-500 font-bold shrink-0">MOOVI</span>
      <nav
        className="flex gap-2 overflow-x-auto min-w-0 flex-1 scrollbar-none"
      >
          <button
            onClick={() => navigate('/collection')}
            className={cn(
              "border-2 px-3 py-1 text-xs transition-colors shrink-0",
              isActive('/collection')
                ? "border-cpc-cyan-500 text-cpc-cyan-500"
                : "border-cpc-green-900 text-cpc-green-900 hover:border-cpc-green-500 hover:text-cpc-green-500",
            )}
          >
            COLLECTION
          </button>
          <button
            onClick={() => navigate('/search')}
            className={cn(
              "border-2 px-3 py-1 text-xs transition-colors shrink-0",
              isActive('/search')
                ? "border-cpc-cyan-500 text-cpc-cyan-500"
                : "border-cpc-green-900 text-cpc-green-900 hover:border-cpc-green-500 hover:text-cpc-green-500",
            )}
          >
            SEARCH
          </button>
          <button
            onClick={() => navigate('/wishlist')}
            className={cn(
              "border-2 px-3 py-1 text-xs transition-colors shrink-0",
              isActive('/wishlist')
                ? "border-cpc-cyan-500 text-cpc-cyan-500"
                : "border-cpc-yellow-900 text-cpc-yellow-900 hover:border-cpc-yellow-500 hover:text-cpc-yellow-500",
            )}
          >
            WISHLIST
          </button>
          <button
            onClick={() => navigate('/recommendations')}
            className={cn(
              "border-2 px-3 py-1 text-xs transition-colors shrink-0",
              isActive('/recommendations')
                ? "border-cpc-cyan-500 text-cpc-cyan-500"
                : "border-cpc-magenta-900 text-cpc-magenta-900 hover:border-cpc-magenta-500 hover:text-cpc-magenta-500",
            )}
          >
            RECO
          </button>
          <button
            onClick={() => navigate('/status')}
            className={cn(
              "border-2 px-3 py-1 text-xs transition-colors shrink-0",
              isActive('/status')
                ? "border-cpc-cyan-500 text-cpc-cyan-500"
                : "border-cpc-green-900 text-cpc-green-900 hover:border-cpc-green-500 hover:text-cpc-green-500",
            )}
          >
            STATUS
          </button>
      </nav>
      <button
        onClick={handleLogout}
        className="border-2 border-cpc-red-500 text-cpc-red-500 px-3 py-1 hover:bg-cpc-red-500 hover:text-cpc-grey-900 transition-colors text-xs shrink-0"
      >
        LOGOUT
      </button>
    </div>
  )
}
