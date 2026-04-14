import { Link, useLocation } from 'react-router-dom'
import { cn } from '../utils/cn'

export function Navigation() {
  const location = useLocation()

  const isActive = (path: string) => location.pathname === path

  const baseLinkStyles = 'px-4 py-2 border-2 transition-colors'
  const activeLinkStyles = 'border-cpc-yellow-500 bg-cpc-yellow-500 text-cpc-grey-900'
  const inactiveLinkStyles =
    'border-cpc-green-500 text-cpc-green-500 hover:bg-cpc-green-500 hover:text-cpc-grey-900'

  return (
    <nav className="flex gap-4 p-4 border-b-2 border-cpc-green-500">
      <Link
        to="/"
        className={cn(baseLinkStyles, isActive('/') ? activeLinkStyles : inactiveLinkStyles)}
      >
        DEFAULT
      </Link>
      <Link
        to="/home"
        className={cn(baseLinkStyles, isActive('/home') ? activeLinkStyles : inactiveLinkStyles)}
      >
        HOME
      </Link>
      <Link
        to="/about"
        className={cn(baseLinkStyles, isActive('/about') ? activeLinkStyles : inactiveLinkStyles)}
      >
        ABOUT
      </Link>
    </nav>
  )
}
