/**
 * Redirect Blocker — Main World Script
 *
 * Aggressively blocks popunder/redirect ads on streaming sites.
 * These sites use several tricks:
 * 1. First-click popunder: any click on the page opens an ad tab first
 * 2. Hidden <a target="_blank"> overlays on top of video players
 * 3. window.open() called from click handlers on the document
 * 4. location.href reassignment from injected scripts
 *
 * Strategy: block ALL new-tab/new-window navigations that go to a
 * different domain, and neutralize overlay elements.
 */

(function DecoyShieldRedirectBlocker() {
  'use strict';

  // Start enabled by default — disable only when config says off.
  // This avoids a race where site scripts fire before the config arrives.
  let enabled = true;
  const currentHost = location.hostname;

  // Listen for config from the isolated-world config-bridge
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (event.data?.type === 'ds-redirect-config') {
      enabled = event.data.enabled;
      console.log(`[DecoyShield] Redirect Blocker: ${enabled ? 'ON' : 'OFF'}`);
    }
  });

  // ─── 1. Kill window.open() completely ──────────────────────────
  // Streaming sites have no legitimate reason to open new windows.
  // This is the #1 popunder vector.
  const originalOpen = window.open;
  window.open = function (_url?: string | URL, _target?: string, _features?: string): Window | null {
    if (!enabled) return originalOpen.call(window, _url, _target, _features);
    const urlStr = _url?.toString() ?? '';
    console.log(`[DecoyShield] Blocked window.open(): ${urlStr}`);
    window.postMessage({ type: 'ds-popup-blocked', url: urlStr }, '*');
    return null;
  };

  // ─── 2. Block ALL clicks on <a> links to external domains ──────
  // Streaming sites use both target="_blank" AND regular links
  // positioned over the video player to redirect users.
  document.addEventListener('click', function (e: MouseEvent) {
    if (!enabled) return;
    // Walk up from the click target to find any <a> element
    let el = e.target as HTMLElement | null;
    while (el && el !== document.documentElement) {
      if (el.tagName === 'A') {
        const anchor = el as HTMLAnchorElement;
        if (!anchor.href || anchor.href === '#' || anchor.href.startsWith('javascript:')) break;
        try {
          const linkUrl = new URL(anchor.href, location.href);
          const linkHost = linkUrl.hostname;
          // Block ANY link to a different domain
          if (linkHost !== currentHost) {
            console.log(`[DecoyShield] Blocked external redirect: ${anchor.href}`);
            e.preventDefault();
            e.stopImmediatePropagation();
            window.postMessage({ type: 'ds-popup-blocked', url: anchor.href }, '*');
            return;
          }
        } catch { /* invalid URL, let it pass */ }
      }
      el = el.parentElement;
    }
  }, true); // capture phase — runs BEFORE the site's own handlers

  // ─── 3. Neuter onclick attributes on body and major containers ──
  function stripRedirectHandlers() {
    // Remove onclick from body and common wrapper elements
    const targets = [
      document.body,
      document.getElementById('app'),
      document.getElementById('root'),
      document.getElementById('wrapper'),
      document.getElementById('container'),
      document.getElementById('main'),
      document.querySelector('main'),
      document.querySelector('.wrapper'),
      document.querySelector('.container'),
    ];

    for (const el of targets) {
      if (el && el.getAttribute('onclick')) {
        console.log(`[DecoyShield] Removed onclick from <${el.tagName}#${el.id}>`);
        el.removeAttribute('onclick');
      }
    }
  }

  // ─── 4. Remove overlay <a> tags ───────────────────────────────
  function removeOverlayLinks() {
    const links = document.querySelectorAll('a[href]');
    for (const link of links) {
      const el = link as HTMLAnchorElement;
      if (!el.href || el.href === '#') continue;

      // Check if link is to an external domain
      try {
        const linkHost = new URL(el.href, location.href).hostname;
        if (linkHost === currentHost) continue;
      } catch { continue; }

      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);

      // Detect overlays: large elements, or positioned/absolute with high z-index
      const isLarge = rect.width > 100 && rect.height > 100;
      const isPositioned = style.position === 'absolute' || style.position === 'fixed';
      const isTransparent =
        style.opacity === '0' ||
        parseFloat(style.opacity) < 0.15 ||
        style.backgroundColor === 'transparent' ||
        style.backgroundColor === 'rgba(0, 0, 0, 0)' ||
        (!style.backgroundImage || style.backgroundImage === 'none') &&
        (!style.backgroundColor || style.backgroundColor === 'rgba(0, 0, 0, 0)');
      const hasNoText = (el.textContent?.trim() ?? '').length === 0 && el.querySelectorAll('img').length === 0;

      // It's an overlay if: large + positioned, or transparent + no text, or covering video area
      if ((isLarge && isPositioned) || (isTransparent && hasNoText) || (isLarge && hasNoText)) {
        console.log(`[DecoyShield] Removed overlay link: ${el.href}`);
        el.removeAttribute('href');
        el.removeAttribute('onclick');
        el.style.pointerEvents = 'none';
        el.style.display = 'none';
      }
    }
  }

  // ─── 5. Block dynamically added ad elements ───────────────────
  function handleNewNodes(nodes: NodeList) {
    for (const node of nodes) {
      if (!(node instanceof HTMLElement)) continue;

      // Kill any new <a> to external domains
      if (node.tagName === 'A') {
        const anchor = node as HTMLAnchorElement;
        if (anchor.href && anchor.href !== '#') {
          try {
            const linkHost = new URL(anchor.href, location.href).hostname;
            if (linkHost !== currentHost) {
              anchor.removeAttribute('href');
              anchor.style.pointerEvents = 'none';
              anchor.style.display = 'none';
              console.log(`[DecoyShield] Killed injected external link`);
            }
          } catch {}
        }
      }

      // Kill hidden/tiny iframes (tracking pixels, ad loaders)
      if (node.tagName === 'IFRAME') {
        const rect = node.getBoundingClientRect();
        const style = node.getAttribute('style') ?? '';
        if (
          rect.width <= 1 || rect.height <= 1 ||
          style.includes('display:none') || style.includes('display: none') ||
          style.includes('visibility:hidden') || style.includes('width:0') ||
          style.includes('height:0') || style.includes('width: 0') ||
          style.includes('height: 0')
        ) {
          console.log(`[DecoyShield] Removed hidden iframe`);
          node.remove();
          continue;
        }
      }

      // Also check children of added elements
      const externalLinks = node.querySelectorAll?.('a[href]');
      if (externalLinks) {
        for (const link of externalLinks) {
          const anchor = link as HTMLAnchorElement;
          try {
            const linkHost = new URL(anchor.href, location.href).hostname;
            if (linkHost !== currentHost) {
              anchor.removeAttribute('href');
              anchor.style.pointerEvents = 'none';
              anchor.style.display = 'none';
            }
          } catch {}
        }
      }
    }
  }

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        handleNewNodes(mutation.addedNodes);
      }
    }
  });

  // ─── 6. Block location hijacking ─────────────────────────────

  // Prevent scripts from navigating via location.assign/replace
  const origAssign = location.assign.bind(location);
  const origReplace = location.replace.bind(location);

  location.assign = function (url: string) {
    if (!enabled) return origAssign(url);
    try {
      const dest = new URL(url, location.href).hostname;
      if (dest !== currentHost) {
        console.log(`[DecoyShield] Blocked location.assign to: ${url}`);
        window.postMessage({ type: 'ds-popup-blocked', url }, '*');
        return;
      }
    } catch {}
    return origAssign(url);
  };

  location.replace = function (url: string) {
    if (!enabled) return origReplace(url);
    try {
      const dest = new URL(url, location.href).hostname;
      if (dest !== currentHost) {
        console.log(`[DecoyShield] Blocked location.replace to: ${url}`);
        window.postMessage({ type: 'ds-popup-blocked', url }, '*');
        return;
      }
    } catch {}
    return origReplace(url);
  };

  // ─── Start ────────────────────────────────────────────────────

  function init() {
    stripRedirectHandlers();
    removeOverlayLinks();
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Re-scan periodically — streaming sites inject overlays dynamically
  setInterval(() => {
    stripRedirectHandlers();
    removeOverlayLinks();
  }, 2000);
})();
