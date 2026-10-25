/**
 * Redirect Blocker — Main World Script
 *
 * Intercepts popup/redirect tricks used by streaming & piracy sites:
 * 1. Hijacks window.open() to block ALL popups not triggered by user intent
 * 2. Removes invisible overlay <a> tags that hijack clicks
 * 3. Intercepts location changes triggered by overlay clicks
 * 4. Blocks dynamically injected ad iframes and scripts
 */

// ─── Helpers ────────────────────────────────────────────────────

/** Check whether a click target is a legitimate interactive element */
function isLegitimateTarget(el: HTMLElement): boolean {
  const tag = el.tagName;
  // Video controls, buttons, inputs, nav links inside menus etc.
  if (['VIDEO', 'INPUT', 'SELECT', 'TEXTAREA'].includes(tag)) return true;
  // Buttons with visible text
  if (tag === 'BUTTON' && el.offsetWidth > 0 && el.offsetHeight > 0) return true;
  // Anchors that are part of actual site navigation (small, visible, with text)
  if (tag === 'A') {
    const rect = el.getBoundingClientRect();
    // A real nav link is smaller than half the viewport
    if (rect.width < window.innerWidth * 0.4 && rect.height < window.innerHeight * 0.4) {
      return true;
    }
  }
  return false;
}

/** Check if an element is an invisible/transparent overlay */
function isOverlayElement(el: HTMLElement): boolean {
  const style = getComputedStyle(el);
  const rect = el.getBoundingClientRect();

  // Large element covering most of the viewport
  const coversViewport =
    rect.width > window.innerWidth * 0.5 && rect.height > window.innerHeight * 0.5;

  // Transparent or nearly transparent
  const isTransparent =
    style.opacity === '0' ||
    parseFloat(style.opacity) < 0.1 ||
    style.background === 'transparent' ||
    style.backgroundColor === 'transparent' ||
    style.backgroundColor === 'rgba(0, 0, 0, 0)';

  // High z-index overlay
  const isHighZ = parseInt(style.zIndex) > 999;

  // Fixed/absolute positioned covering the page
  const isPositioned = style.position === 'fixed' || style.position === 'absolute';

  if (coversViewport && isPositioned) return true;
  if (coversViewport && isTransparent) return true;
  if (isPositioned && isHighZ && isTransparent) return true;

  return false;
}

// ─── 1. Block window.open() popups ─────────────────────────────

let userClickedRecently = false;
let userClickTarget: EventTarget | null = null;

// Track genuine user clicks (capture phase, earliest)
document.addEventListener('pointerdown', (e) => {
  userClickedRecently = true;
  userClickTarget = e.target;
  setTimeout(() => {
    userClickedRecently = false;
    userClickTarget = null;
  }, 300);
}, true);

const originalOpen = window.open;
window.open = function (url?: string | URL, target?: string, features?: string): Window | null {
  const urlStr = url?.toString() ?? '';

  // Only allow window.open if user genuinely clicked a real element
  if (!userClickedRecently || (userClickTarget && isOverlayElement(userClickTarget as HTMLElement))) {
    console.log(`[DecoyShield] Blocked popup: ${urlStr}`);
    window.postMessage({ type: 'ds-popup-blocked', url: urlStr }, '*');
    return null;
  }

  return originalOpen.call(window, url, target, features);
};

// ─── 2. Remove overlay links and divs ──────────────────────────

function removeOverlays() {
  // Find all links
  const links = document.querySelectorAll('a');
  for (const link of links) {
    const el = link as HTMLAnchorElement;
    if (!el.href || el.href === '#' || el.href === location.href) continue;

    if (isOverlayElement(el)) {
      console.log(`[DecoyShield] Removed overlay link: ${el.href}`);
      el.removeAttribute('href');
      el.removeAttribute('onclick');
      el.style.pointerEvents = 'none';
      el.style.display = 'none';
    }
  }

  // Find divs/spans with high z-index overlays that have click handlers
  const allElements = document.querySelectorAll('div, span, section');
  for (const elem of allElements) {
    const el = elem as HTMLElement;
    if (isOverlayElement(el) && !el.querySelector('video, iframe[src*="player"]')) {
      // Don't remove the element if it contains the actual video player
      const hasPlayer =
        el.querySelector('video') !== null ||
        el.querySelector('[class*="player"]') !== null ||
        el.querySelector('[id*="player"]') !== null;

      if (!hasPlayer) {
        el.style.pointerEvents = 'none';
        el.removeAttribute('onclick');
      }
    }
  }
}

// ─── 3. Block click-through on overlays ────────────────────────

document.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;

  // Don't interfere with video elements or real buttons
  if (isLegitimateTarget(target)) return;

  // Walk up the DOM to check if any parent is an overlay
  let el: HTMLElement | null = target;
  while (el && el !== document.body) {
    if (isOverlayElement(el)) {
      // Check if this overlay links somewhere (via parent <a> or onclick)
      const parentLink = el.closest('a');
      if (parentLink && parentLink.href && parentLink.href !== '#' && parentLink.href !== location.href) {
        console.log(`[DecoyShield] Blocked overlay click → ${parentLink.href}`);
        e.stopImmediatePropagation();
        e.preventDefault();
        window.postMessage({ type: 'ds-popup-blocked', url: parentLink.href }, '*');
        return;
      }
      // If the overlay itself has an onclick, block it
      if (el.getAttribute('onclick')) {
        console.log('[DecoyShield] Blocked overlay onclick');
        e.stopImmediatePropagation();
        e.preventDefault();
        return;
      }
    }
    el = el.parentElement;
  }
}, true); // capture phase

// ─── 4. Intercept location.href hijacking ──────────────────────

// Protect against scripts that do: location.href = "http://ad-site.com"
// by monitoring and blocking rapid navigation away from the current page
let lastUserNavTime = 0;

document.addEventListener('click', () => {
  lastUserNavTime = Date.now();
}, true);

// Watch for programmatic navigation
const originalAssign = location.assign;
const originalReplace = location.replace;

location.assign = function (url: string) {
  // If no real user interaction in the last 500ms, block it
  if (Date.now() - lastUserNavTime > 500) {
    console.log(`[DecoyShield] Blocked location.assign: ${url}`);
    window.postMessage({ type: 'ds-popup-blocked', url }, '*');
    return;
  }
  return originalAssign.call(location, url);
};

location.replace = function (url: string) {
  if (Date.now() - lastUserNavTime > 500) {
    console.log(`[DecoyShield] Blocked location.replace: ${url}`);
    window.postMessage({ type: 'ds-popup-blocked', url }, '*');
    return;
  }
  return originalReplace.call(location, url);
};

// ─── 5. Block ad iframes injected dynamically ──────────────────

const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (!(node instanceof HTMLElement)) continue;

      // Remove dynamically added iframes that look like ads
      if (node.tagName === 'IFRAME') {
        const src = node.getAttribute('src') ?? '';
        const style = node.getAttribute('style') ?? '';
        // Zero-size or hidden iframes are tracking/ad related
        if (
          style.includes('display:none') ||
          style.includes('display: none') ||
          style.includes('width:0') ||
          style.includes('height:0') ||
          style.includes('visibility:hidden') ||
          node.offsetWidth === 0 ||
          node.offsetHeight === 0
        ) {
          console.log(`[DecoyShield] Removed hidden iframe: ${src}`);
          node.remove();
        }
      }

      // Remove overlay elements as they get added
      if (['A', 'DIV', 'SPAN'].includes(node.tagName) && isOverlayElement(node)) {
        const hasPlayer =
          node.querySelector('video') !== null ||
          node.querySelector('[class*="player"]') !== null;
        if (!hasPlayer) {
          node.style.pointerEvents = 'none';
          if (node.tagName === 'A') {
            (node as HTMLAnchorElement).removeAttribute('href');
            node.style.display = 'none';
          }
          console.log(`[DecoyShield] Neutralized dynamic overlay: <${node.tagName}>`);
        }
      }
    }
  }
});

// ─── Start everything ──────────────────────────────────────────

function init() {
  removeOverlays();
  observer.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Re-scan periodically since streaming sites inject overlays constantly
setInterval(removeOverlays, 2000);
