/**
 * Redirect Handler — Service Worker Level
 *
 * Uses chrome.webNavigation.onBeforeNavigate to block cross-domain
 * redirects at the browser API level. This is the same mechanism
 * the phishing handler uses — it fires BEFORE DNS resolution and
 * cannot be bypassed by page-level JavaScript.
 *
 * Strategy:
 * 1. Track each tab's current URL
 * 2. When onBeforeNavigate fires for a main-frame navigation to a
 *    different domain, redirect the tab back to its original URL
 * 3. This catches popunder/redirect ads that streaming sites trigger
 *    when you click the play button
 */

import { getSettings } from '@/shared/storage';
import { recordStat } from './stats-collector';

// ─── Tab URL tracking ──────────────────────────────────────────
const tabUrls = new Map<number, string>();

const SKIP_SCHEMES = ['chrome:', 'chrome-extension:', 'about:', 'moz-extension:', 'edge:', 'data:', 'blob:'];

function isInternalUrl(url: string): boolean {
  return SKIP_SCHEMES.some((s) => url.startsWith(s));
}

/**
 * Extract the root domain (eTLD+1 approximation).
 * e.g. "www.sub.example.com" → "example.com"
 *      "player.cinego.co" → "cinego.co"
 */
function getRootDomain(hostname: string): string {
  const parts = hostname.split('.');
  if (parts.length <= 2) return hostname;
  // Simple heuristic: take last 2 parts.
  // For co.uk style TLDs this isn't perfect, but good enough for our use case.
  return parts.slice(-2).join('.');
}

// Set of tabIds currently being redirected back (prevent infinite loops)
const redirectingTabs = new Set<number>();

async function handleRedirectCheck(
  details: chrome.webNavigation.WebNavigationParentedCallbackDetails,
): Promise<void> {
  // Only check main frame navigations
  if (details.frameId !== 0) return;

  const newUrl = details.url;
  if (isInternalUrl(newUrl)) return;

  // If we're currently redirecting this tab back, skip
  if (redirectingTabs.has(details.tabId)) {
    redirectingTabs.delete(details.tabId);
    return;
  }

  const settings = await getSettings();
  if (!settings.masterEnabled || !settings.redirectBlock.enabled) return;

  const currentUrl = tabUrls.get(details.tabId);
  // No tracked URL means this is a fresh navigation (new tab, typed URL) — allow it
  if (!currentUrl || isInternalUrl(currentUrl)) return;

  try {
    const currentHost = new URL(currentUrl).hostname;
    const newHost = new URL(newUrl).hostname;

    // Same hostname — always allow
    if (currentHost === newHost) return;

    // Same root domain — allow (subdomain navigation)
    const currentRoot = getRootDomain(currentHost);
    const newRoot = getRootDomain(newHost);
    if (currentRoot === newRoot) return;

    // Cross-domain navigation detected — block it!
    console.log(`[DecoyShield] Redirect BLOCKED at browser level: ${currentUrl} → ${newUrl}`);

    // Mark tab as "redirecting back" to prevent our own redirect from being blocked
    redirectingTabs.add(details.tabId);

    // Redirect the tab back to its original URL
    await chrome.tabs.update(details.tabId, { url: currentUrl });

    // Record as blocked ad
    await recordStat({ type: 'adsBlocked', timestamp: Date.now() });
  } catch {
    // URL parsing failed — allow the navigation
  }
}

export function registerRedirectHandler(): void {
  // Track tab URLs so we know where each tab "is"
  chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.url && !isInternalUrl(changeInfo.url)) {
      tabUrls.set(tabId, changeInfo.url);
    }
  });

  chrome.tabs.onRemoved.addListener((tabId) => {
    tabUrls.delete(tabId);
    redirectingTabs.delete(tabId);
  });

  // Initialize tracking for existing tabs
  chrome.tabs.query({}).then((tabs) => {
    for (const tab of tabs) {
      if (tab.id != null && tab.url && !isInternalUrl(tab.url)) {
        tabUrls.set(tab.id, tab.url);
      }
    }
  });

  // The key listener — same API the phishing handler uses
  chrome.webNavigation.onBeforeNavigate.addListener((details) => {
    handleRedirectCheck(details);
  });
}
