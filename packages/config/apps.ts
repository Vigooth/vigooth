export interface AppDefinition {
  id: string
  name: string
  description: string
  icon: string
  color: 'green' | 'red' | 'cyan' | 'yellow' | 'magenta'
  devPort: number
  prodPath: string
}

export const apps: AppDefinition[] = [
  {
    id: 'portal',
    name: 'PORTAL',
    description: 'Main hub - Access all applications',
    icon: '🚪',
    color: 'green',
    devPort: 5173,
    prodPath: '/',
  },
  {
    id: 'crypt-lock',
    name: 'CRYPT-LOCK',
    description: 'Secure password vault with encryption',
    icon: '🔐',
    color: 'red',
    devPort: 5174,
    prodPath: '/crypt-lock',
  },
  // Future apps:
  // {
  //   id: 'movies',
  //   name: 'MOVIE-DB',
  //   description: 'Track your favorite movies',
  //   icon: '🎬',
  //   color: 'cyan',
  //   devPort: 5176,
  //   prodPath: '/movies',
  // },
]

function isDev(): boolean {
  if (typeof window === 'undefined') return true
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
}

export function getAppUrl(appId: string, baseUrl?: string): string {
  const app = apps.find((a) => a.id === appId)
  if (!app) return '/'

  if (isDev()) {
    return `http://localhost:${app.devPort}`
  }

  // In production, use the base URL + path
  const base = baseUrl || ''
  return `${base}${app.prodPath}`
}

export function getAppsConfig(currentAppId?: string) {
  return apps
    .filter((app) => app.id !== currentAppId)
    .map((app) => ({
      id: app.id,
      name: app.name,
      description: app.description,
      icon: app.icon,
      color: app.color,
      url: getAppUrl(app.id),
    }))
}

export function getPortalUrl(): string {
  return getAppUrl('portal')
}
