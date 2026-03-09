import tw from 'twin.macro'
import { useNavigate, useLocation } from 'react-router-dom'
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
    <div tw="flex justify-between items-center p-3 border-b-2 border-cpc-green-500">
      <div tw="flex items-center gap-4">
        <span tw="text-cpc-cyan-500 font-bold">MOOVI</span>
        <nav tw="flex gap-2">
          <button
            onClick={() => navigate('/collection')}
            css={[
              tw`border-2 px-3 py-1 text-xs transition-colors`,
              isActive('/collection')
                ? tw`border-cpc-cyan-500 text-cpc-cyan-500`
                : tw`border-cpc-green-900 text-cpc-green-900 hover:border-cpc-green-500 hover:text-cpc-green-500`,
            ]}
          >
            COLLECTION
          </button>
          <button
            onClick={() => navigate('/search')}
            css={[
              tw`border-2 px-3 py-1 text-xs transition-colors`,
              isActive('/search')
                ? tw`border-cpc-cyan-500 text-cpc-cyan-500`
                : tw`border-cpc-green-900 text-cpc-green-900 hover:border-cpc-green-500 hover:text-cpc-green-500`,
            ]}
          >
            SEARCH
          </button>
        </nav>
      </div>
      <button
        onClick={handleLogout}
        tw="border-2 border-cpc-red-500 text-cpc-red-500 px-3 py-1 hover:bg-cpc-red-500 hover:text-cpc-grey-900 transition-colors text-xs"
      >
        LOGOUT
      </button>
    </div>
  )
}
