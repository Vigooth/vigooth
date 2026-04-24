export interface AppDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: "green" | "red" | "cyan" | "yellow" | "magenta";
  devPort: number;
  prodPath: string;
  prodSubdomain?: string;
}

export const apps: AppDefinition[] = [
  {
    id: "portal",
    name: "PORTAL",
    description: "Main hub - Access all applications",
    icon: "🚪",
    color: "green",
    devPort: 5173,
    prodPath: "/",
  },
  {
    id: "vilock",
    name: "VILOCK",
    description: "Secure password vault with encryption",
    icon: "🔐",
    color: "red",
    devPort: 5174,
    prodPath: "/vilock",
    prodSubdomain: "app-vilock",
  },
  {
    id: "movies",
    name: "MOOVI",
    description: "Track your favorite movies",
    icon: "🎬",
    color: "cyan",
    devPort: 5176,
    prodPath: "/movies",
    prodSubdomain: "app-moovi",
  },
  {
    id: "steam",
    name: "STEAM",
    description: "Browse your Steam game library",
    icon: "🎮",
    color: "magenta",
    devPort: 5177,
    prodPath: "/steam",
    prodSubdomain: "app-steam",
  },
];

function isDev(): boolean {
  if (typeof window === "undefined") return true;
  return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
}

function getRootDomain(): string {
  if (typeof window === "undefined") return "";
  const hostname = window.location.hostname;
  // Extract root domain: "app-vilock.vigooth.com" → "vigooth.com"
  const parts = hostname.split(".");
  if (parts.length >= 2) {
    return parts.slice(-2).join(".");
  }
  return hostname;
}

export function getAppUrl(appId: string, baseUrl?: string): string {
  const app = apps.find((a) => a.id === appId);
  if (!app) return "/";

  if (isDev()) {
    return `http://localhost:${app.devPort}`;
  }

  // In production, use subdomain if defined
  if (app.prodSubdomain) {
    const domain = baseUrl || getRootDomain();
    return `https://${app.prodSubdomain}.${domain}`;
  }

  // Portal (root domain) or fallback to path-based
  if (baseUrl) {
    return `${baseUrl}${app.prodPath}`;
  }

  return `https://${getRootDomain()}${app.prodPath}`;
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
    }));
}

export function getPortalUrl(): string {
  return getAppUrl("portal");
}
