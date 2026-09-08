/**
 * Reduce a User-Agent string to "browser / OS" for the visit table.
 *
 * Deliberately coarse: the point is telling a phone from a desktop and Safari
 * from Chrome at a glance, not fingerprinting. Order matters below because most
 * agents claim to be several things at once (every Chrome says "Safari").
 */
export function summarizeUserAgent(userAgent: string): string {
  if (!userAgent) return '?';
  const browser = detectBrowser(userAgent);
  const os = detectOS(userAgent);
  return os ? `${browser} / ${os}` : browser;
}

function detectBrowser(ua: string): string {
  if (/bot|crawl|spider|slurp|curl|wget|python-requests/i.test(ua)) return 'Bot';
  if (/Edg\//.test(ua)) return 'Edge';
  if (/OPR\/|Opera/.test(ua)) return 'Opera';
  if (/Firefox\//.test(ua)) return 'Firefox';
  if (/Chrome\/|CriOS\//.test(ua)) return 'Chrome';
  if (/Safari\//.test(ua)) return 'Safari';
  return 'Autre';
}

function detectOS(ua: string): string {
  if (/iPhone|iPad|iPod/.test(ua)) return 'iOS';
  if (/Android/.test(ua)) return 'Android';
  if (/Windows/.test(ua)) return 'Windows';
  if (/Mac OS X/.test(ua)) return 'macOS';
  if (/Linux/.test(ua)) return 'Linux';
  return '';
}
