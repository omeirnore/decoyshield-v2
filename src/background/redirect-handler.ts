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
 *
 * IMPORTANT: The handler is kept synchronous up to the blocking
 * decision. An earlier version used `await getSettings()` which
 * introduced a race condition — during the async pause,
 * chrome.tabs.onUpdated would overwrite tabUrls with the redirect
 * URL, making the handler think it was a same-domain navigation.
 * Now settings are cached in memory and updated via storage listener.
 */

import { getSettings, onSettingsChanged } from '@/shared/storage';
import { recordStat } from './stats-collector';
import { pushLogEntry } from './block-log';

// ─── Cached settings (avoids async getSettings() in hot path) ──
let redirectEnabled = true; // default on until settings load

async function loadSettings(): Promise<void> {
  const settings = await getSettings();
  redirectEnabled = settings.masterEnabled && settings.redirectBlock.enabled;
}

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
  return parts.slice(-2).join('.');
}

// Set of tabIds currently being redirected back (prevent infinite loops)
const redirectingTabs = new Set<number>();

function handleRedirectCheck(
  details: chrome.webNavigation.WebNavigationParentedCallbackDetails,
): void {
  // Only check main frame navigations
  if (details.frameId !== 0) return;

  const newUrl = details.url;
  if (isInternalUrl(newUrl)) return;

  // If we're currently redirecting this tab back, skip
  if (redirectingTabs.has(details.tabId)) {
    redirectingTabs.delete(details.tabId);
    return;
  }

  // ── All checks below are SYNCHRONOUS — no race window ──

  // Check cached settings (updated via storage listener, no await)
  if (!redirectEnabled) return;

  // Capture the tab's current URL SYNCHRONOUSLY before anything can change it
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

    // Redirect the tab back to its original URL (async is fine HERE — decision already made)
    chrome.tabs.update(details.tabId, { url: currentUrl });

    // Record stat and log for activity feed
    recordStat({ type: 'adsBlocked', timestamp: Date.now() });
    pushLogEntry({
      domain: newHost,
      type: 'redirect',
      url: newUrl,
      reason: `Redirected from ${currentHost}`,
      timestamp: Date.now(),
    });
  } catch {
    // URL parsing failed — allow the navigation
  }
}

export function registerRedirectHandler(): void {
  // Load initial settings
  loadSettings();

  // Keep cached settings in sync — fires whenever user toggles
  onSettingsChanged(() => { loadSettings(); });

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
  // Handler is SYNCHRONOUS — no async gaps where tabUrls can be overwritten
  chrome.webNavigation.onBeforeNavigate.addListener((details) => {
    handleRedirectCheck(details);
  });

  // ─── Catch page-opened popups (new tabs/windows) ────────────
  // When a page opens a new tab (via window.open, <a target="_blank">,
  // or any other mechanism), onCreatedNavigationTarget fires with
  // the source tab ID. If redirect blocker is enabled, close the
  // new tab immediately — streaming sites use this for popunder ads.
  chrome.webNavigation.onCreatedNavigationTarget.addListener((details) => {
    if (!redirectEnabled) return;

    // Only block if the source tab is a real page (not a new tab page)
    const sourceUrl = tabUrls.get(details.sourceTabId);
    if (!sourceUrl || isInternalUrl(sourceUrl)) return;

    console.log(`[DecoyShield] Popup tab BLOCKED: tab ${details.tabId} opened by tab ${details.sourceTabId} (${sourceUrl})`);

    // Close the popup tab
    chrome.tabs.remove(details.tabId);

    // Make sure the source tab stays focused
    chrome.tabs.update(details.sourceTabId, { active: true });

    // Record stat and log for activity feed
    recordStat({ type: 'adsBlocked', timestamp: Date.now() });
    try {
      const popupHost = new URL(details.url).hostname;
      pushLogEntry({
        domain: popupHost || 'popup',
        type: 'redirect',
        url: details.url,
        reason: `Popup opened by ${new URL(sourceUrl).hostname}`,
        timestamp: Date.now(),
      });
    } catch {
      pushLogEntry({
        domain: 'popup',
        type: 'redirect',
        url: details.url,
        reason: 'Popup tab blocked',
        timestamp: Date.now(),
      });
    }
  });
}
