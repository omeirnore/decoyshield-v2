/**
 * Cookie Handler — Auto-delete third-party tracking cookies
 *
 * Strategy:
 * 1. Maintain a list of known tracking domains (from tracker rules)
 * 2. On tab close or periodic cleanup, scan cookies
 * 3. Delete cookies from tracking domains unless whitelisted
 * 4. Also delete third-party cookies (domains not matching any open tab)
 *    when triggered by "Clean Now"
 *
 * Settings-cached approach (same pattern as redirect-handler):
 * cookieEnabled boolean stays in sync via onSettingsChanged listener,
 * avoiding async getSettings() in hot paths.
 */

import { getSettings, onSettingsChanged } from '@/shared/storage';
import { recordStat } from './stats-collector';
import { pushLogEntry } from './block-log';

// ─── Cached settings ──────────────────────────────────────────
let cookieEnabled = true;
let cookieWhitelist: string[] = [];

async function loadSettings(): Promise<void> {
  const settings = await getSettings();
  cookieEnabled = settings.masterEnabled && settings.cookies.enabled;
  cookieWhitelist = settings.cookies.whitelist ?? [];
}

// ─── Known tracking cookie domains ────────────────────────────
// Extracted from rules/trackers.json — domains that set tracking cookies
const TRACKING_DOMAINS: ReadonlySet<string> = new Set([
  'google-analytics.com',
  'facebook.com',
  'facebook.net',
  'connect.facebook.net',
  'pixel.facebook.com',
  'bat.bing.com',
  'analytics.tiktok.com',
  'hotjar.com',
  'googletagmanager.com',
  'googletagservices.com',
  'analytics.google.com',
  'mixpanel.com',
  'segment.io',
  'segment.com',
  'amplitude.com',
  'fullstory.com',
  'mouseflow.com',
  'clarity.ms',
  'crazyegg.com',
  'luckyorange.com',
  'heap.io',
  'heapanalytics.com',
  'newrelic.com',
  'nr-data.net',
  'sentry.io',
  'bugsnag.com',
  'scorecardresearch.com',
  'quantserve.com',
  'tapad.com',
  'demdex.net',
  'omtrdc.net',
  'krxd.net',
  'bluekai.com',
  'rlcdn.com',
  'mathtag.com',
  'chartbeat.com',
  'chartbeat.net',
  'optimizely.com',
  'branch.io',
  'appsflyer.com',
  'adjust.com',
  'kochava.com',
  'doubleclick.net',
  'adnxs.com',
  'adsrvr.org',
  'criteo.com',
  'criteo.net',
  'casalemedia.com',
  'pubmatic.com',
  'rubiconproject.com',
  'openx.net',
  'indexexchange.com',
  'contextweb.com',
  'outbrain.com',
  'taboola.com',
  'addthis.com',
  'sharethis.com',
]);

/**
 * Extract root domain from a cookie domain.
 * Cookie domains often start with a dot: ".facebook.com" → "facebook.com"
 */
function cleanDomain(domain: string): string {
  return domain.replace(/^\./, '');
}

/**
 * Get the root domain (eTLD+1 approximation).
 */
function getRootDomain(hostname: string): string {
  const parts = hostname.split('.');
  if (parts.length <= 2) return hostname;
  return parts.slice(-2).join('.');
}

/**
 * Check if a cookie domain matches a known tracking domain.
 */
function isTrackingDomain(cookieDomain: string): boolean {
  const clean = cleanDomain(cookieDomain).toLowerCase();
  const root = getRootDomain(clean);
  return TRACKING_DOMAINS.has(clean) || TRACKING_DOMAINS.has(root);
}

/**
 * Check if a domain is in the user's whitelist.
 */
function isWhitelisted(cookieDomain: string): boolean {
  const clean = cleanDomain(cookieDomain).toLowerCase();
  const root = getRootDomain(clean);
  return cookieWhitelist.some((w) => {
    const wLower = w.toLowerCase();
    return clean === wLower || root === wLower || clean.endsWith('.' + wLower);
  });
}

/**
 * Delete a single cookie by constructing its URL.
 */
async function removeCookie(cookie: chrome.cookies.Cookie): Promise<boolean> {
  const protocol = cookie.secure ? 'https' : 'http';
  const url = `${protocol}://${cleanDomain(cookie.domain)}${cookie.path}`;
  try {
    await chrome.cookies.remove({ url, name: cookie.name });
    return true;
  } catch {
    return false;
  }
}

/**
 * Scan and delete all tracking cookies (respecting whitelist).
 * Returns the number of cookies deleted.
 */
export async function cleanTrackingCookies(): Promise<number> {
  const allCookies = await chrome.cookies.getAll({});
  let deleted = 0;

  for (const cookie of allCookies) {
    if (isWhitelisted(cookie.domain)) continue;
    if (!isTrackingDomain(cookie.domain)) continue;

    const success = await removeCookie(cookie);
    if (success) {
      deleted++;
      pushLogEntry({
        domain: cleanDomain(cookie.domain),
        type: 'tracker',
        reason: `Tracking cookie "${cookie.name}" auto-deleted`,
        timestamp: Date.now(),
      });
    }
  }

  if (deleted > 0) {
    // Record all deletions as a batch
    for (let i = 0; i < deleted; i++) {
      recordStat({ type: 'cookiesDeleted', timestamp: Date.now() });
    }
    console.log(`[DecoyShield] Auto-deleted ${deleted} tracking cookies`);
  }

  return deleted;
}

/**
 * Delete ALL third-party cookies (not matching any open tab domain),
 * plus all tracking cookies. Respects whitelist. Used by "Clean Now".
 */
export async function deepCleanCookies(): Promise<number> {
  // Get domains of all open tabs
  const tabs = await chrome.tabs.query({});
  const openDomains = new Set<string>();
  for (const tab of tabs) {
    if (tab.url) {
      try {
        const host = new URL(tab.url).hostname;
        openDomains.add(host.toLowerCase());
        openDomains.add(getRootDomain(host.toLowerCase()));
      } catch { /* ignore */ }
    }
  }

  const allCookies = await chrome.cookies.getAll({});
  let deleted = 0;

  for (const cookie of allCookies) {
    if (isWhitelisted(cookie.domain)) continue;

    const clean = cleanDomain(cookie.domain).toLowerCase();
    const root = getRootDomain(clean);
    const isFirstParty = openDomains.has(clean) || openDomains.has(root);
    const isTracker = isTrackingDomain(cookie.domain);

    // Delete if it's a tracker OR if it's a third-party cookie
    if (!isTracker && isFirstParty) continue;

    const success = await removeCookie(cookie);
    if (success) {
      deleted++;
      pushLogEntry({
        domain: clean,
        type: 'tracker',
        reason: isTracker
          ? `Tracking cookie "${cookie.name}" deleted`
          : `Third-party cookie "${cookie.name}" cleaned`,
        timestamp: Date.now(),
      });
    }
  }

  if (deleted > 0) {
    for (let i = 0; i < deleted; i++) {
      recordStat({ type: 'cookiesDeleted', timestamp: Date.now() });
    }
    console.log(`[DecoyShield] Deep-cleaned ${deleted} cookies`);
  }

  return deleted;
}

export function registerCookieHandler(): void {
  // Load initial settings
  loadSettings();

  // Keep settings in sync
  onSettingsChanged(() => { loadSettings(); });

  // Auto-clean tracking cookies when a tab is closed
  chrome.tabs.onRemoved.addListener(() => {
    if (!cookieEnabled) return;
    // Small delay so the tab's cookies aren't needed anymore
    setTimeout(() => { cleanTrackingCookies(); }, 1000);
  });

  // Periodic cleanup every 5 minutes
  setInterval(() => {
    if (!cookieEnabled) return;
    cleanTrackingCookies();
  }, 5 * 60 * 1000);

  // Initial cleanup on startup
  setTimeout(() => {
    if (cookieEnabled) cleanTrackingCookies();
  }, 5000);
}
