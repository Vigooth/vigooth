import { cn } from '../utils/cn';

export interface AppConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  url: string;
  color: 'green' | 'red' | 'cyan' | 'yellow' | 'magenta' | 'blue' | 'orange';
}

interface AppMenuProps {
  apps: AppConfig[];
  currentAppId?: string;
  portalUrl?: string;
}

const colorStyles: Record<AppConfig['color'], string> = {
  green: 'border-cpc-green-500 text-cpc-green-500 hover:bg-cpc-green-500 hover:text-cpc-grey-900',
  red: 'border-cpc-red-500 text-cpc-red-500 hover:bg-cpc-red-500 hover:text-cpc-grey-900',
  cyan: 'border-cpc-cyan-500 text-cpc-cyan-500 hover:bg-cpc-cyan-500 hover:text-cpc-grey-900',
  yellow:
    'border-cpc-yellow-500 text-cpc-yellow-500 hover:bg-cpc-yellow-500 hover:text-cpc-grey-900',
  magenta:
    'border-cpc-magenta-500 text-cpc-magenta-500 hover:bg-cpc-magenta-500 hover:text-cpc-grey-900',
  blue: 'border-cpc-blue-500 text-cpc-blue-500 hover:bg-cpc-blue-500 hover:text-cpc-grey-900',
  orange:
    'border-cpc-orange-500 text-cpc-orange-500 hover:bg-cpc-orange-500 hover:text-cpc-grey-900',
};

export function AppMenu({ apps, currentAppId, portalUrl }: AppMenuProps) {
  return (
    <div className="p-4">
      {currentAppId && portalUrl && (
        <a
          href={portalUrl}
          className="inline-block mb-6 border-2 border-cpc-green-500 text-cpc-green-500 px-4 py-2 hover:bg-cpc-green-500 hover:text-cpc-grey-900 transition-colors text-sm"
        >
          &lt; BACK TO PORTAL
        </a>
      )}

      <div className="text-cpc-yellow-500 text-xl mb-6">
        {currentAppId ? 'OTHER APPLICATIONS' : 'SELECT APPLICATION'}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {apps
          .filter((app) => app.id !== currentAppId)
          .map((app) => (
            <a
              key={app.id}
              href={app.url}
              className={cn(
                'block border-4 p-4 transition-all hover:scale-105',
                colorStyles[app.color],
              )}
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{app.icon}</span>
                <span className="text-lg font-bold">{app.name}</span>
              </div>
              <div className="text-sm opacity-80">{app.description}</div>
            </a>
          ))}
      </div>

      {!currentAppId && (
        <div className="text-cpc-cyan-500 text-xs mt-8 text-center animate-pulse-cpc">
          SELECT AN APPLICATION TO CONTINUE
        </div>
      )}
    </div>
  );
}
