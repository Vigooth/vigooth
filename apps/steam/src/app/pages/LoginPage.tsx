import { CpcButton, CpcLayout } from '@vigooth/ui'

function handleLogin() {
  window.location.href = '/auth/steam/login'
}

export function LoginPage() {
  const error = new URLSearchParams(window.location.search).get('error')

  return (
    <CpcLayout>
      <div className="h-full flex flex-col items-center justify-center p-6">
        <div className="border-2 border-cpc-magenta-500 p-8 max-w-sm w-full text-center">
          <h1 className="text-cpc-magenta-500 text-2xl font-bold mb-2">STEAM LIBRARY</h1>
          <p className="text-cpc-green-500 text-sm mb-8">
            Sign in with your Steam account to view your game library and friends.
          </p>

          {error && (
            <div className="border border-cpc-red-500 text-cpc-red-500 text-xs p-3 mb-4">
              LOGIN FAILED: {error.replace(/_/g, ' ').toUpperCase()}
            </div>
          )}

          <CpcButton variant="filled" color="green" onClick={handleLogin}>
            LOGIN WITH STEAM
          </CpcButton>
        </div>
      </div>
    </CpcLayout>
  )
}
