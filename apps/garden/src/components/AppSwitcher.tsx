import { CpcButton, CpcMenu, CpcMenuItem } from '@vigooth/ui';
import { getAppsConfig } from '@vigooth/config';

// Static: the app list never changes at runtime, and the URLs are resolved from
// the current hostname the module is loaded on.
const otherApps = getAppsConfig('garden');

const handleSelect = (url: string) => () => {
  window.location.href = url;
};

/** The app name, top-left, doubling as the jump-to-another-app menu. */
export function AppSwitcher() {
  return (
    <CpcMenu
      color="orange"
      trigger={
        <CpcButton variant="text" color="orange" size="lg">
          🌱 GARDEN
        </CpcButton>
      }
    >
      {otherApps.map((app) => (
        <CpcMenuItem key={app.id} onClick={handleSelect(app.url)}>
          {app.icon} {app.name}
        </CpcMenuItem>
      ))}
    </CpcMenu>
  );
}
