/**
 * Redirect Blocker — Main World Script
 *
 * Intercepts popup/redirect tricks used by streaming & piracy sites:
 * 1. Hijacks window.open() to block popups to ad/scam domains
 * 2. Removes invisible overlay <a> tags that hijack clicks
 * 3. Blocks onclick handlers that navigate away from the current page
 */

// Domains commonly used for popup redirects on streaming sites
const BLOCKED_POPUP_PATTERNS = [
  // Generic popup/redirect ad networks
  'popads.net', 'popcash.net', 'popunder.net', 'popmyads.com',
  'propellerads.com', 'propellerclick.com', 'propu.sh',
  'pushance.com', 'pushno.com', 'pushnot.com',
  'onclickads.net', 'onclicka.com', 'onclickmax.com',
  'clickadu.com', 'clickaine.com', 'clickandgo.com',
  'hilltopads.net', 'hilltopads.com',
  'ad-maven.com', 'ad-maven.net', 'admaven.co',
  'exoclick.com', 'exosrv.com',
  'juicyads.com', 'trafficjunky.com',
  'betterads.io', 'adblocker-update.com',
  // Fake streaming / "you won" scam pages
  'notification-ede.xyz', 'push-notification.top',
  'redirect.', 'redir.', 'click.',
  // Common TLDs used by scam redirects
];

const BLOCKED_TLDS = new Set([
  'tk', 'ml', 'cf', 'ga', 'gq', 'buzz', 'top', 'club',
  'work', 'date', 'racing', 'win', 'bid', 'stream', 'download',
]);

function isSuspiciousUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    // Check against blocked patterns
    for (const pattern of BLOCKED_POPUP_PATTERNS) {
      if (hostname.includes(pattern)) return true;
    }

    // Check suspicious TLDs
    const tld = hostname.split('.').pop() ?? '';
    if (BLOCKED_TLDS.has(tld)) return true;

    // Block IP-address URLs in popups (almost always malicious)
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;

    return false;
  } catch {
    return true; // malformed URL = suspicious
  }
}

// --- 1. Intercept window.open() ---
const originalOpen = window.open;
window.open = function (url?: string | URL, target?: string, features?: string): Window | null {
  const urlStr = url?.toString() ?? '';

  if (urlStr && isSuspiciousUrl(urlStr)) {
    console.log(`[DecoyShield] Blocked popup redirect to: ${urlStr}`);
    // Notify the extension
    window.postMessage({ type: 'ds-popup-blocked', url: urlStr }, '*');
    return null;
  }

  return originalOpen.call(window, url, target, features);
};

// --- 2. Remove invisible overlay links ---
function removeOverlayLinks() {
  const links = document.querySelectorAll('a[target="_blank"]');
  for (const link of links) {
    const el = link as HTMLAnchorElement;
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();

    // Detect full-page overlays or transparent links
    const isOverlay =
      (rect.width > window.innerWidth * 0.5 && rect.height > window.innerHeight * 0.5) ||
      (style.position === 'fixed' && (style.opacity === '0' || style.zIndex > '9000'));

    if (isOverlay && el.href && isSuspiciousUrl(el.href)) {
      console.log(`[DecoyShield] Removed overlay redirect link: ${el.href}`);
      el.removeAttribute('href');
      el.style.pointerEvents = 'none';
    }
  }
}

// --- 3. Block suspicious click event listeners on the document body ---
document.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;

  // Check if clicked element is a transparent overlay div
  if (target.tagName !== 'VIDEO' && target.tagName !== 'BUTTON') {
    const style = getComputedStyle(target);
    const rect = target.getBoundingClientRect();
    if (
      style.position === 'fixed' &&
      rect.width > window.innerWidth * 0.8 &&
      rect.height > window.innerHeight * 0.8 &&
      (style.opacity === '0' || parseInt(style.zIndex) > 9000)
    ) {
      console.log('[DecoyShield] Blocked click on invisible overlay');
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  }
}, true); // capture phase to run before site's handlers

// Run overlay removal after DOM is ready and periodically
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', removeOverlayLinks);
} else {
  removeOverlayLinks();
}

// Re-check every 3 seconds (streaming sites inject overlays dynamically)
setInterval(removeOverlayLinks, 3000);
