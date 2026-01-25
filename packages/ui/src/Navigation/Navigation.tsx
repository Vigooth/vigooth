import { Link, useLocation } from 'react-router-dom'
import tw from 'twin.macro'

export function Navigation() {
  const location = useLocation()

  const isActive = (path: string) => {
    return location.pathname === path
  }

  const baseLinkStyles = tw`px-4 py-2 border-2 transition-colors`
  const activeLinkStyles = tw`border-cpc-yellow-500 bg-cpc-yellow-500 text-cpc-grey-900`
  const inactiveLinkStyles = tw`border-cpc-green-500 text-cpc-green-500 hover:bg-cpc-green-500 hover:text-cpc-grey-900`

  return (
    <nav tw="flex gap-4 p-4 border-b-2 border-cpc-green-500">
      <Link
        to="/"
        css={[baseLinkStyles, isActive('/') ? activeLinkStyles : inactiveLinkStyles]}
      >
        DEFAULT
      </Link>
        <Link
        to="/home"
        css={[baseLinkStyles, isActive('/home') ? activeLinkStyles : inactiveLinkStyles]}
      >
        HOME
      </Link>
      <Link
        to="/about"
        css={[baseLinkStyles, isActive('/about') ? activeLinkStyles : inactiveLinkStyles]}
      >
        ABOUT
      </Link>
    </nav>
  )
}
