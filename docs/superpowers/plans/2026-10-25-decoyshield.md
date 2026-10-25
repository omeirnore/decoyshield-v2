# DecoyShield Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build DecoyShield, a Manifest V3 Chrome extension providing browser fingerprint protection, ad/tracker blocking, phishing/malicious URL detection, and cookie management with a professional Preact-based UI.

**Architecture:** Modular TypeScript extension built with Vite (dual build: Preact UI pages + IIFE content scripts). Four independent protection modules share a typed storage layer and message-passing system. Fingerprint protection uses programmatically registered MAIN-world content scripts with per-site deterministic profiles derived from a session salt. Ad/tracker blocking uses `declarativeNetRequest` with filter lists converted at build time. Phishing detection combines local URL heuristics with optional Google Safe Browsing v4 hash-prefix lookup. Cookie management wraps the `chrome.cookies` API.

**Tech Stack:** TypeScript 5.x, Preact 10.x, Vite 6.x, Vitest, Chrome MV3 APIs (minimum Chrome 120)

**Spec:** User-provided specification (conversation context, 2026-10-25)

## Global Constraints

- Chrome Manifest V3 only; minimum Chrome 120
- `declarativeNetRequest`: 30,000 guaranteed static rules per extension, up to ~330,000 from the global shared pool; 5,000 dynamic + session rules combined; 1,000 regex rules; max 50 rulesets declared, 10 enabled simultaneously
- MAIN-world content scripts via `chrome.scripting.registerContentScripts` (programmatic registration is more reliable than static manifest `world: "MAIN"`)
- No remote code execution, no `eval()`, no `unsafe-inline` in CSP
- All browsing data local by default; Safe Browsing is opt-in with explicit disclosure
- Least-privilege permissions; every permission justified
- Filter lists: EasyList + EasyPrivacy + Peter Lowe's, converted at build time
- Session salt stored in `chrome.storage.session` (in-memory, cleared on browser close)
- Dual Vite build: HTML pages (ESM, Preact) + scripts (IIFE, no module system) via two configs
- `build.modulePreload: false` on the UI build to avoid Chrome Web Store inline-script rejections

## Review Focus

1. **MAIN-world script timing race:** A page script that queries fingerprint APIs before the session salt arrives from `storage.session` via the config bridge gets a fallback salt derived from `performance.timeOrigin + hostname` — verify the lazy-proxy approach never returns inconsistent values for the same API within a single page load.
2. **DNR rule overflow:** If converted filter lists exceed the 30,000 guaranteed static limit and the global pool has no room, excess rules are silently not loaded — verify `getAvailableStaticRuleCount()` is checked at startup and the user sees a capacity warning in the options page.
3. **Phishing false positives on IDN domains:** Legitimate single-script internationalized domains (e.g., `münchen.de`, `भारत.भारत`) must not trigger high-risk warnings — verify the homograph detector flags only mixed-script domains, not single-script IDN.
4. **Cookie deletion consequences:** Deleting an httpOnly session cookie signs the user out without undo — verify the cookie manager shows a confirmation with "this may sign you out" before deleting session or httpOnly cookies.
5. **CSP-blocked injection:** Sites with strict Content Security Policy may block the injected `<script>` element in the MAIN world — verify fingerprint protection degrades gracefully (logs the failure, does not break the page) when CSP prevents injection.

---

## Manifest Permissions

| Permission | Purpose |
|---|---|
| `declarativeNetRequest` | Rule-based ad and tracker blocking via static and dynamic rulesets |
| `storage` | Persistent settings, statistics; session salt via `storage.session` |
| `cookies` | Cookie inspection, listing, and deletion across domains |
| `tabs` | Read current tab URL to show per-site status in popup |
| `webNavigation` | Navigation events to trigger phishing URL analysis before page loads |
| `scripting` | Programmatic registration of MAIN-world and isolated content scripts |
| `host_permissions: ["<all_urls>"]` | Required for: content script injection on all pages, cross-domain cookie access, `scripting.registerContentScripts` with `<all_urls>` match pattern |

Additional manifest entries:
- `declarative_net_request.rule_resources`: three static rulesets (ads, trackers, supplementary)
- `web_accessible_resources`: MAIN-world script file accessible to all URLs (required for script-tag injection from isolated world)

---

## File Structure

```
src/
├── background/
│   ├── service-worker.ts            # Lifecycle, message router, salt generation
│   ├── dnr-manager.ts               # DNR ruleset enable/disable, blocked counts
│   ├── safe-browsing.ts             # Safe Browsing v4 hash-prefix client
│   ├── fingerprint-registrar.ts     # Registers MAIN-world + isolated scripts
│   ├── phishing-handler.ts          # Navigation listener, risk evaluation, redirect
│   ├── cookie-service.ts            # chrome.cookies wrapper
│   └── stats-collector.ts           # Event aggregation and storage
├── content/
│   ├── isolated/
│   │   ├── config-bridge.ts         # Reads session salt + settings, posts to page
│   │   └── dom-inspector.ts         # Phishing DOM analysis (login forms, links)
│   └── main-world/
│       ├── fingerprint-injector.ts   # Entry point: lazy-proxy API overrides (IIFE)
│       └── protections/
│           ├── webgl.ts             # WebGL getParameter override
│           ├── navigator.ts         # Navigator property overrides
│           ├── screen.ts            # Screen dimension overrides
│           ├── audio-context.ts     # AudioContext processing noise
│           ├── canvas.ts            # Canvas serialization noise
│           └── client-rects.ts      # BoundingClientRect sub-pixel offset
├── phishing/
│   ├── url-analyzer.ts              # URL heuristic checks (pure functions)
│   ├── homograph-detector.ts        # IDN / mixed-script detection
│   └── risk-scorer.ts              # Weighted risk classification
├── blocking/
│   └── list-manager.ts             # Runtime list status, capacity reporting
├── shared/
│   ├── storage.ts                   # Typed chrome.storage.local + session wrapper
│   ├── messaging.ts                 # Typed message passing (sendMessage/onMessage)
│   ├── types.ts                     # All shared interfaces and enums
│   ├── constants.ts                 # Default settings, storage keys
│   └── i18n.ts                      # chrome.i18n.getMessage wrapper
├── popup/
│   ├── index.html
│   ├── main.tsx
│   ├── App.tsx
│   └── components/
│       ├── ProtectionStatus.tsx     # Master toggle + shield status
│       ├── ModuleCard.tsx           # Per-module toggle + stat counters
│       └── StatsBar.tsx             # Summary counts bar
├── options/
│   ├── index.html
│   ├── main.tsx
│   ├── App.tsx
│   └── pages/
│       ├── FingerprintSettings.tsx  # Per-technique toggles, profile info
│       ├── BlockingSettings.tsx     # Ruleset toggles, capacity, attribution
│       ├── PhishingSettings.tsx     # Safe Browsing opt-in, API key, thresholds
│       ├── CookieManager.tsx        # Cookie table, delete controls
│       ├── StatisticsPage.tsx       # Daily/weekly charts, metric definitions
│       └── ThreatLog.tsx            # Chronological warning log, clear control
└── warning/
    ├── index.html                   # Phishing interstitial page
    └── main.ts                      # Reads URL params, renders warning + controls

_locales/
├── en/messages.json
├── hi/messages.json
└── ml/messages.json

rules/
├── ads.json                         # Converted EasyList DNR rules
├── trackers.json                    # Converted EasyPrivacy DNR rules
└── supplementary.json               # Converted Peter Lowe's list DNR rules

scripts/
└── convert-filters.ts               # Build-time ABP filter → DNR JSON converter

tests/
├── unit/
│   ├── shared/storage.test.ts
│   ├── shared/messaging.test.ts
│   ├── fingerprint/profile-generator.test.ts
│   ├── phishing/url-analyzer.test.ts
│   ├── phishing/homograph-detector.test.ts
│   ├── phishing/risk-scorer.test.ts
│   ├── blocking/dnr-manager.test.ts
│   ├── cookies/cookie-service.test.ts
│   └── stats/stats-collector.test.ts
└── test-pages/
    ├── fingerprint-test.html        # Reads and displays fingerprint API values
    ├── tracking-test.html           # Loads resources from known ad/tracker domains
    └── phishing-test.html           # Links to suspicious and safe test URLs
```

---

### Task 1: Project Scaffolding + Build Pipeline

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `vite.config.scripts.ts`, `vitest.config.ts`, `manifest.json`
- Create: `src/popup/index.html`, `src/popup/main.tsx`, `src/popup/App.tsx`
- Create: `src/options/index.html`, `src/options/main.tsx`, `src/options/App.tsx`
- Create: `src/background/service-worker.ts`
- Create: `src/warning/index.html`, `src/warning/main.ts`
- Create: `_locales/en/messages.json`

**Interfaces:**
- Produces: working dual-Vite build outputting a Chrome-loadable `dist/` directory; `npm run build` runs both configs

- [ ] Step 1: Initialize npm, install deps: `typescript`, `preact`, `@preact/preset-vite`, `vite`, `vitest`, `@anthropic-ai/sdk` is NOT needed. Dev deps: `@types/chrome`.

- [ ] Step 2: Create `tsconfig.json` — target ES2022, `jsxImportSource: "preact"`, strict, paths `@/*` → `src/*`

- [ ] Step 3: Create `manifest.json` — MV3, name "DecoyShield", version "0.1.0", `default_locale: "en"`, action popup `popup/index.html`, options page `options/index.html`, background service worker `service-worker.js` (type module), permissions `["storage"]` (minimal for now)

- [ ] Step 4: Create `vite.config.ts` — Preact preset, `build.modulePreload: false`, `rollupOptions.input`: popup, options, warning HTML pages, `outDir: dist`, `emptyOutDir: true`

- [ ] Step 5: Create `vite.config.scripts.ts` — no Preact preset, `rollupOptions.input`: service-worker.ts, `output.format: 'es'` for service worker; separate entry for content scripts as IIFE (fingerprint-injector.ts, config-bridge.ts, dom-inspector.ts), `outDir: dist`, `emptyOutDir: false` (appends to existing dist)

- [ ] Step 6: Add `package.json` scripts: `"build": "vite build && vite build --config vite.config.scripts.ts"`, `"dev": "vite build --watch"`, `"test": "vitest"`

- [ ] Step 7: Create stub entry points — popup renders "DecoyShield", options renders "Settings", warning renders "Warning", service worker logs startup, `_locales/en/messages.json` has `extensionName` and `extensionDescription`

- [ ] Step 8: Create `vitest.config.ts` — environment jsdom, include `tests/**/*.test.ts`, `setupFiles` for chrome API mocks

- [ ] Step 9: Run `npm run build`, verify `dist/` is loadable as unpacked Chrome extension — no manifest errors, popup opens, options opens

- [ ] Step 10: Commit
```
git add -A && git commit -m "feat: scaffold MV3 extension with Vite + Preact dual-build pipeline"
```

---

### Task 2: Shared Infrastructure

**Files:**
- Create: `src/shared/types.ts`, `src/shared/constants.ts`, `src/shared/storage.ts`, `src/shared/messaging.ts`
- Test: `tests/unit/shared/storage.test.ts`, `tests/unit/shared/messaging.test.ts`

**Interfaces:**
- Produces:
  - `DecoyShieldSettings` with nested `FingerprintSettings`, `BlockingSettings`, `PhishingSettings`, `CookieSettings`
  - `getSettings(): Promise<DecoyShieldSettings>`
  - `updateSettings(partial: DeepPartial<DecoyShieldSettings>): Promise<void>`
  - `onSettingsChanged(cb: (settings: DecoyShieldSettings) => void): () => void`
  - `sendMessage<R>(msg: ExtensionMessage): Promise<R>`
  - `onMessage<T extends ExtensionMessage>(type: T['type'], handler: (msg: T) => Promise<unknown>): void`
  - `MessageType` discriminated union enum
  - `RiskLevel = 'low' | 'medium' | 'high'`
  - `RiskIndicator = { type: string; description: string; weight: number }`
  - `StatsEvent = { type: StatType; timestamp: number }`
  - `StatType = 'adsBlocked' | 'trackersBlocked' | 'fingerprintProtections' | 'phishingWarnings' | 'cookiesDeleted'`

- [ ] Step 1: Write failing tests — `storage.test.ts`
```typescript
test('getSettings returns defaults when storage is empty', async () => {
  const settings = await getSettings();
  expect(settings.masterEnabled).toBe(true);
  expect(settings.fingerprint.enabled).toBe(true);
  expect(settings.blocking.adsEnabled).toBe(true);
  expect(settings.phishing.enabled).toBe(true);
});
test('updateSettings deep-merges partial updates', async () => {
  await updateSettings({ fingerprint: { webgl: false } });
  const settings = await getSettings();
  expect(settings.fingerprint.webgl).toBe(false);
  expect(settings.fingerprint.canvas).toBe(true);
});
```

- [ ] Step 2: Run tests — verify they fail with "not defined"

- [ ] Step 3: Implement `types.ts` — all shared interfaces, enums, type aliases listed above

- [ ] Step 4: Implement `constants.ts` — `DEFAULT_SETTINGS` frozen object, storage key constants

- [ ] Step 5: Implement `storage.ts` — typed wrapper over `chrome.storage.local`; `getSettings` returns deep-merged defaults + stored; `updateSettings` deep-merges partial into stored; `onSettingsChanged` wraps `chrome.storage.onChanged`, returns unsubscribe function

- [ ] Step 6: Implement `messaging.ts` — typed wrapper over `chrome.runtime.sendMessage`/`onMessage`; request-response with discriminated union on `type` field

- [ ] Step 7: Run tests — verify pass

- [ ] Step 8: Commit

---

### Task 3: Fingerprint Profile Generator

**Files:**
- Create: `src/content/main-world/protections/profiles.ts`
- Test: `tests/unit/fingerprint/profile-generator.test.ts`

**Interfaces:**
- Consumes: `FingerprintSettings` from Task 2
- Produces:
  - `generateProfile(domain: string, salt: string): FingerprintProfile`
  - `FingerprintProfile` — `{ webgl: { renderer, vendor }, navigator: { hardwareConcurrency, deviceMemory, platform, language, languages }, screen: { width, height, colorDepth, pixelDepth }, audio: { noiseOffset }, canvas: { noiseSeed }, clientRects: { offsetX, offsetY } }`
  - `GPU_PROFILES: Array<{ renderer: string; vendor: string }>` — 10+ plausible combinations
  - `SCREEN_PROFILES: Array<{ width, height, colorDepth }>` — 8+ standard resolutions
  - `NAVIGATOR_PROFILES: Array<{ hardwareConcurrency, deviceMemory, platform }>` — 6+ plausible combos

- [ ] Step 1: Write failing tests
```typescript
test('deterministic: same domain+salt → same profile', () => {
  const a = generateProfile('example.com', 'salt1');
  const b = generateProfile('example.com', 'salt1');
  expect(a).toEqual(b);
});
test('per-site: different domains → different profiles', () => {
  const a = generateProfile('example.com', 'salt1');
  const b = generateProfile('other.com', 'salt1');
  expect(a.navigator.hardwareConcurrency).not.toBe(b.navigator.hardwareConcurrency);
});
test('per-session: different salts → different profiles', () => {
  const a = generateProfile('example.com', 'salt1');
  const b = generateProfile('example.com', 'salt2');
  expect(a).not.toEqual(b);
});
test('values are plausible', () => {
  const p = generateProfile('example.com', 'salt1');
  expect([2, 4, 8, 16]).toContain(p.navigator.hardwareConcurrency);
  expect([2, 4, 8]).toContain(p.navigator.deviceMemory);
  expect(p.screen.width).toBeGreaterThan(0);
  expect(p.webgl.renderer).toBeTruthy();
});
test('related values are coherent', () => {
  const p = generateProfile('example.com', 'salt1');
  expect(p.screen.colorDepth).toBe(p.screen.pixelDepth);
  expect(p.clientRects.offsetX).toBeLessThan(0.5);
  expect(p.clientRects.offsetX).toBeGreaterThan(-0.5);
});
```

- [ ] Step 2: Run tests — verify failure

- [ ] Step 3: Implement `profiles.ts` — seeded PRNG from `hash(domain + salt)` (simple 32-bit hash, no crypto dep needed in MAIN world). Select from plausible profile arrays using the seed. Canvas `noiseSeed` and audio `noiseOffset` are small deterministic values. ClientRects offsets are sub-pixel (±0.3px max).

- [ ] Step 4: Run tests — verify pass

- [ ] Step 5: Commit

---

### Task 4: Fingerprint MAIN-World Injection

**Files:**
- Create: `src/content/main-world/fingerprint-injector.ts` (IIFE entry)
- Create: `src/content/main-world/protections/webgl.ts`, `navigator.ts`, `screen.ts`, `audio-context.ts`, `canvas.ts`, `client-rects.ts`
- Create: `src/content/isolated/config-bridge.ts`
- Create: `src/background/fingerprint-registrar.ts`
- Modify: `src/background/service-worker.ts` — add salt generation + script registration calls
- Modify: `manifest.json` — add `scripting` permission, `web_accessible_resources`
- Test: `tests/test-pages/fingerprint-test.html`

**Interfaces:**
- Consumes: `generateProfile()`, `FingerprintProfile` from Task 3; `getSettings()`, `FingerprintSettings` from Task 2
- Produces:
  - `registerFingerprintScripts(): Promise<void>` — registers both isolated and MAIN-world content scripts
  - `unregisterFingerprintScripts(): Promise<void>`
  - Config bridge: reads salt + settings from `chrome.storage.session`, dispatches `window.postMessage({ type: 'ds-fp-config', salt, settings })`
  - MAIN-world injector: on load, installs lazy getter/proxy overrides on all 6 API surfaces; on first access, resolves the profile (from config bridge message or fallback salt), caches it, returns spoofed values for the page lifetime

**Injection strategy:**
1. Service worker `onStartup`/`onInstalled`: generate `crypto.randomUUID()` salt → `chrome.storage.session.set()`; call `setAccessLevel('TRUSTED_AND_UNTRUSTED_CONTEXTS')` for content-script read access; call `registerFingerprintScripts()`
2. `fingerprint-registrar.ts`: uses `chrome.scripting.registerContentScripts` to register `config-bridge.ts` (isolated, `document_start`) and `fingerprint-injector.ts` (MAIN, `document_start`) for `<all_urls>`
3. Config bridge (isolated, `document_start`): reads salt + fingerprint settings from `storage.session`, posts to page via `window.postMessage`
4. Fingerprint injector (MAIN, `document_start`): immediately installs lazy overrides. Each override computes its spoofed value on first call. If `ds-fp-config` message has arrived, uses session salt. Otherwise, generates deterministic fallback from `performance.timeOrigin.toString() + location.hostname`.

- [ ] Step 1: Implement `fingerprint-registrar.ts` — `registerFingerprintScripts` and `unregisterFingerprintScripts` using `chrome.scripting.registerContentScripts`/`unregisterContentScripts`

- [ ] Step 2: Modify `service-worker.ts` — in `onStartup` and `onInstalled`: generate salt, store in `storage.session`, set access level, call registrar. On settings change (`onSettingsChanged`): re-register scripts.

- [ ] Step 3: Implement `config-bridge.ts` — at `document_start`, async read from `chrome.storage.session.get(['sessionSalt', 'fingerprintSettings'])`, then `window.postMessage({ type: 'ds-fp-config', ... }, '*')`

- [ ] Step 4: Implement `fingerprint-injector.ts` — IIFE entry. Listens for `ds-fp-config` message. Defines `getOrCreateProfile(domain)` that lazy-initializes the profile. Calls each enabled protection module's `apply(profile)`.

- [ ] Step 5: Implement the six protection modules. Each exports `apply(profile: FingerprintProfile): void`:
  - **webgl.ts**: Override `WebGLRenderingContext.prototype.getParameter` and `WebGL2RenderingContext.prototype.getParameter`. When param is `UNMASKED_RENDERER_WEBGL` or `UNMASKED_VENDOR_WEBGL` (from `WEBGL_debug_renderer_info`), return profile values. Pass through all other params.
  - **navigator.ts**: Define property descriptors on `Navigator.prototype` for `hardwareConcurrency`, `deviceMemory`, `platform`, `language`, `languages` returning profile values.
  - **screen.ts**: Define property descriptors on `Screen.prototype` for `width`, `height`, `colorDepth`, `pixelDepth`.
  - **audio-context.ts**: Wrap `AudioContext.prototype.createOscillator`. After the original oscillator is created, chain a `GainNode` with a deterministic micro-offset (`1.0 + profile.audio.noiseOffset` where offset is ±0.0001). Document in a code comment: simple frequency changes don't defeat waveform-based fingerprinting because audio fingerprinting hashes the full processed waveform, not just the frequency.
  - **canvas.ts**: Wrap `HTMLCanvasElement.prototype.toDataURL`, `toBlob`, and `CanvasRenderingContext2D.prototype.getImageData`. Before serialization, apply deterministic per-pixel noise using the canvas noise seed (XOR low bits of a small number of pixel values with seed-derived bytes).
  - **client-rects.ts**: Wrap `Element.prototype.getBoundingClientRect` and `getClientRects`. Add `profile.clientRects.offsetX/offsetY` (< 0.5px) to all coordinate values. Preserve `width`/`height` unchanged to avoid layout breakage.

- [ ] Step 6: Modify `manifest.json` — add `scripting` to permissions; add `web_accessible_resources: [{ resources: ["content/main-world/*"], matches: ["<all_urls>"] }]`

- [ ] Step 7: Create `tests/test-pages/fingerprint-test.html` — page JS reads and displays: `navigator.hardwareConcurrency`, `navigator.deviceMemory`, `navigator.platform`, `screen.width`, `screen.height`, `canvas.toDataURL()` hash, `WebGLRenderingContext.getParameter(RENDERER)`, `element.getBoundingClientRect()` values. Shows real vs. expected-spoofed comparison.

- [ ] Step 8: Build, load extension, open `fingerprint-test.html`. Verify: values differ from real hardware, are plausible, are consistent on reload (same session), differ after browser restart (new salt).

- [ ] Step 9: Create `tests/test-pages/fingerprint-csp-test.html` — same as fingerprint-test.html but with a strict CSP header (`Content-Security-Policy: script-src 'self'`) served via a local test server. Verify: fingerprint protection degrades gracefully (page still works, console logs the injection failure, no page crash).

- [ ] Step 10: Commit

---

### Task 5: Ad/Tracker Blocking

**Files:**
- Create: `scripts/convert-filters.ts`
- Create: `rules/ads.json`, `rules/trackers.json`, `rules/supplementary.json`
- Create: `src/background/dnr-manager.ts`
- Create: `src/blocking/list-manager.ts`
- Modify: `manifest.json` — add `declarativeNetRequest`, `declarative_net_request.rule_resources`
- Modify: `package.json` — add `convert-filters` script
- Test: `tests/unit/blocking/dnr-manager.test.ts`, `tests/test-pages/tracking-test.html`

**Interfaces:**
- Consumes: `getSettings()`, `updateSettings()`, `onSettingsChanged()` from Task 2
- Produces:
  - `enableRuleset(id: 'ads' | 'trackers' | 'supplementary'): Promise<void>`
  - `disableRuleset(id: string): Promise<void>`
  - `getBlockedCount(since?: number): Promise<number>`
  - `getRulesetStatus(): Promise<Array<{ id: string; enabled: boolean; ruleCount: number }>>`
  - `getAvailableRuleCapacity(): Promise<number>` — wraps `getAvailableStaticRuleCount()`
  - `checkRuleCapacity(): Promise<{ available: number; warning: boolean }>` — warns if below 5,000

**Filter list conversion strategy:**
- `@nicedoc/abp2dnr` or `nicedoc/AdsBlockerParsers` for ABP→DNR conversion (verify npm availability; fallback: custom converter for the subset of ABP syntax we need: domain blocking rules, third-party resource rules). NOTE: if `@eyeo/abp2dnr` requires native RE2 dep that fails on Windows, use a pure-JS alternative or pre-convert on CI.
- Each list gets its own static ruleset JSON with unique rule IDs (ads: 1–100000, trackers: 100001–200000, supplementary: 200001–300000)
- If a converted list exceeds 30,000 rules, the script warns, sorts by rule type priority (domain blocks > resource type blocks > regex rules), and truncates

- [ ] Step 1: Implement `scripts/convert-filters.ts` — Node script: download EasyList, EasyPrivacy, Peter Lowe's from canonical URLs; convert each to DNR JSON; assign non-overlapping rule ID ranges; write to `rules/*.json`; log rule counts and any truncation warnings. Add `"convert-filters": "tsx scripts/convert-filters.ts"` to package.json.

- [ ] Step 2: Run conversion, verify rule files exist with valid DNR JSON structure. Check rule counts are within limits.

- [ ] Step 3: Modify `manifest.json` — add `declarativeNetRequest` to permissions. Add:
```json
"declarative_net_request": {
  "rule_resources": [
    { "id": "ads", "enabled": true, "path": "rules/ads.json" },
    { "id": "trackers", "enabled": true, "path": "rules/trackers.json" },
    { "id": "supplementary", "enabled": true, "path": "rules/supplementary.json" }
  ]
}
```

- [ ] Step 4: Write failing tests for `dnr-manager.ts`
```typescript
test('enableRuleset calls updateEnabledRulesets', async () => {
  await enableRuleset('ads');
  expect(chrome.declarativeNetRequest.updateEnabledRulesets)
    .toHaveBeenCalledWith({ enableRulesetIds: ['ads'] });
});
test('getBlockedCount returns matched rule count', async () => {
  chrome.declarativeNetRequest.getMatchedRules
    .mockResolvedValue({ rulesMatchedInfo: [{ rule: {} }, { rule: {} }] });
  expect(await getBlockedCount()).toBe(2);
});
test('getAvailableRuleCapacity wraps getAvailableStaticRuleCount', async () => {
  chrome.declarativeNetRequest.getAvailableStaticRuleCount.mockResolvedValue(25000);
  expect(await getAvailableRuleCapacity()).toBe(25000);
});
test('warns when available capacity is below threshold', async () => {
  chrome.declarativeNetRequest.getAvailableStaticRuleCount.mockResolvedValue(2000);
  const status = await checkRuleCapacity();
  expect(status.warning).toBe(true);
  expect(status.available).toBe(2000);
});
```

- [ ] Step 5: Run tests — verify failure

- [ ] Step 6: Implement `dnr-manager.ts` — wraps `chrome.declarativeNetRequest`. On settings change: enable/disable rulesets. `getBlockedCount` uses `getMatchedRules` with optional `minTimeStamp` filter. Checks capacity on startup, logs warning if < 5000 rules available.

- [ ] Step 7: Implement `list-manager.ts` — exposes list metadata: name, source URL, rule count, last-converted date, enabled status. Reads from a build-generated `rules/metadata.json`.

- [ ] Step 8: Run tests — verify pass

- [ ] Step 9: Create `tests/test-pages/tracking-test.html` — page loads `<img>` and `<script>` from known tracker domains (e.g., `google-analytics.com/analytics.js`, `connect.facebook.net/en_US/fbevents.js`, `pagead2.googlesyndication.com/tag/js/gpt.js`). Displays load success/failure for each resource.

- [ ] Step 10: Build, load extension, open tracking test page. Verify in DevTools Network tab: requests to tracker domains are blocked (status: `(blocked:other)`); page's own resources load normally.

- [ ] Step 11: Commit

---

### Task 6: Phishing URL Analysis Engine

**Files:**
- Create: `src/phishing/url-analyzer.ts`, `src/phishing/homograph-detector.ts`, `src/phishing/risk-scorer.ts`
- Test: `tests/unit/phishing/url-analyzer.test.ts`, `tests/unit/phishing/homograph-detector.test.ts`, `tests/unit/phishing/risk-scorer.test.ts`

**Interfaces:**
- Consumes: `RiskIndicator`, `RiskLevel` from Task 2 types
- Produces:
  - `analyzeUrl(url: string): UrlAnalysis` — `{ indicators: RiskIndicator[]; domain: string; isSuspicious: boolean }`
  - `detectHomograph(domain: string): HomographResult` — `{ isSuspicious: boolean; reason?: string; mixedScripts: string[] }`
  - `scoreRisk(indicators: RiskIndicator[]): RiskScore` — `{ level: RiskLevel; score: number; reasons: string[] }`

- [ ] Step 1: Write failing tests for `url-analyzer.ts`
```typescript
test('detects suspicious TLD', () => {
  const r = analyzeUrl('https://login-bankofamerica.tk/signin');
  expect(r.indicators.some(i => i.type === 'suspicious-tld')).toBe(true);
});
test('detects brand in subdomain', () => {
  const r = analyzeUrl('https://paypal.com.evil-site.com/login');
  expect(r.indicators.some(i => i.type === 'misleading-subdomain')).toBe(true);
});
test('detects IP address URL', () => {
  const r = analyzeUrl('http://192.168.1.1/login');
  expect(r.indicators.some(i => i.type === 'ip-address')).toBe(true);
});
test('detects excessive encoding', () => {
  const r = analyzeUrl('https://example.com/%2F%2Flogin%2F%2Fbank');
  expect(r.indicators.some(i => i.type === 'suspicious-encoding')).toBe(true);
});
test('safe URL has no high-weight indicators', () => {
  const r = analyzeUrl('https://www.google.com');
  expect(r.indicators.filter(i => i.weight > 0.5)).toHaveLength(0);
});
```

- [ ] Step 2: Write failing tests for `homograph-detector.ts`
```typescript
test('flags Cyrillic-Latin mixed script', () => {
  const r = detectHomograph('аpple.com'); // Cyrillic а + Latin pple
  expect(r.isSuspicious).toBe(true);
  expect(r.mixedScripts).toContain('Cyrillic');
});
test('allows single-script IDN', () => {
  expect(detectHomograph('münchen.de').isSuspicious).toBe(false);
});
test('flags digit-letter confusables', () => {
  expect(detectHomograph('g00gle.com').isSuspicious).toBe(true);
});
test('allows plain ASCII domains', () => {
  expect(detectHomograph('example.com').isSuspicious).toBe(false);
});
```

- [ ] Step 3: Write failing tests for `risk-scorer.ts`
```typescript
test('no indicators → low', () => {
  expect(scoreRisk([]).level).toBe('low');
});
test('single low-weight → low', () => {
  expect(scoreRisk([{ type: 'x', description: 'x', weight: 0.2 }]).level).toBe('low');
});
test('multiple high-weight → high', () => {
  const indicators = [
    { type: 'homograph', description: 'Mixed scripts', weight: 0.8 },
    { type: 'subdomain', description: 'Brand in subdomain', weight: 0.7 },
  ];
  expect(scoreRisk(indicators).level).toBe('high');
});
test('single indicator never exceeds medium', () => {
  expect(scoreRisk([{ type: 'x', description: 'x', weight: 1.0 }]).level).not.toBe('high');
});
```

- [ ] Step 4: Run all tests — verify all fail

- [ ] Step 5: Implement `url-analyzer.ts` — checks: suspicious TLDs (.tk, .ml, .cf, .ga, .gq), brand names in non-registrable subdomain position, IP-address hosts, unusual ports (not 80/443), excessive path depth (> 5 segments), suspicious URL encoding (> 3 encoded slashes), `data:` URLs, redirect URLs in query params. Each returns a `RiskIndicator` with calibrated weight (0.0–1.0).

- [ ] Step 6: Implement `homograph-detector.ts` — classify each character's Unicode script (Latin, Cyrillic, Greek, Common, etc.) via codepoint ranges. Flag mixed Latin+Cyrillic or Latin+Greek. Maintain confusable-character map (0↔O, 1↔l, rn↔m, etc.). Allow single-script IDN (all-Cyrillic, all-Devanagari, etc.) and ASCII+Common (hyphens, digits) without flag.

- [ ] Step 7: Implement `risk-scorer.ts` — weighted sum of indicator weights. Normalize to 0.0–1.0. Thresholds: low < 0.4, medium 0.4–0.7, high > 0.7. Clamp: a single indicator's contribution maxes at 0.6 (never reaches `high` alone — multiple corroborating signals required). Return sorted `reasons` array.

- [ ] Step 8: Run all tests — verify pass

- [ ] Step 9: Commit

---

### Task 7: Phishing Detection Integration

**Files:**
- Create: `src/background/phishing-handler.ts`, `src/background/safe-browsing.ts`
- Create: `src/content/isolated/dom-inspector.ts`
- Modify: `src/warning/main.ts` — replace stub with full warning page
- Modify: `src/background/service-worker.ts` — register phishing navigation listener
- Modify: `manifest.json` — add `webNavigation` permission
- Test: `tests/unit/phishing/safe-browsing.test.ts`, `tests/test-pages/phishing-test.html`

**Interfaces:**
- Consumes: `analyzeUrl()`, `detectHomograph()`, `scoreRisk()` from Task 6; `getSettings()` from Task 2
- Produces:
  - `handleNavigation(details: chrome.webNavigation.OnCommittedDetails): Promise<void>`
  - `checkSafeBrowsing(url: string): Promise<{ matched: boolean; threatType?: string }>`
  - `inspectDom(): DomInspectionResult` — `{ indicators: RiskIndicator[] }` (suspicious forms, misleading links)
  - Warning page reads `?url=...&reasons=...&level=...` query params

- [ ] Step 1: Implement `safe-browsing.ts` — v4 Update API client. `initSafeBrowsing(apiKey)`: downloads threat-list hash prefixes via `threatListUpdates:fetch`. `checkSafeBrowsing(url)`: compute SHA-256 of canonicalized URL, check 4-byte prefix against local set, on match call `fullHashes:find` for confirmation. Respect `minimumWaitDuration`. Store prefix database in `chrome.storage.local` (key: `sb-prefixes`).

- [ ] Step 2: Write failing test
```typescript
test('computeUrlHash returns 32-byte SHA-256', async () => {
  const hash = await computeUrlHash('https://example.com/');
  expect(hash.byteLength).toBe(32);
});
test('checkPrefix returns false for empty prefix set', () => {
  expect(checkPrefix(new Uint8Array(32), new Set())).toBe(false);
});
```

- [ ] Step 3: Run tests — verify fail, implement, verify pass

- [ ] Step 4: Implement `phishing-handler.ts` — listens on `chrome.webNavigation.onCommitted`. Skips chrome://, chrome-extension://, about:, and extension-own URLs. Runs `analyzeUrl(url)` + `detectHomograph(hostname)`. If Safe Browsing enabled and API key configured, runs `checkSafeBrowsing(url)` in parallel (adds high-weight indicator if matched). Combines all indicators via `scoreRisk()`. If `high`: redirect tab to `warning/index.html?url=...&reasons=...&level=high`. If `medium`: message content script to run DOM inspection; re-evaluate with DOM indicators.

- [ ] Step 5: Implement `dom-inspector.ts` — content script (isolated, `document_idle`). On message from background: checks for password fields on non-HTTPS, forms posting to cross-origin, anchor tags with display text not matching href domain, excessive hidden inputs. Returns `DomInspectionResult` via `chrome.runtime.sendMessage`.

- [ ] Step 6: Implement `warning/main.ts` — reads URL query params. Renders: risk level badge (color-coded), bulleted reasons list in plain language, "Go back to safety" button (`history.back()`), "I understand the risks, proceed" link (navigates to original URL; stores URL in session allowlist so the handler skips it). Uses `chrome.i18n` for all strings.

- [ ] Step 7: Wire into service worker — call phishing handler registration on startup. Add `webNavigation` to manifest permissions.

- [ ] Step 8: Create `tests/test-pages/phishing-test.html` — links to: a safe URL (google.com), a homograph test (Cyrillic-а apple.com equivalent), a brand-subdomain test (paypal.com.evil.com), a clean IDN (münchen.de)

- [ ] Step 9: Build, load, test manually — navigate to suspicious test URL → warning page appears with reasons; "Go back" works; "Proceed" navigates through; safe URLs and clean IDN pass without warning

- [ ] Step 10: Commit

---

### Task 8: Cookie Management

**Files:**
- Create: `src/background/cookie-service.ts`
- Modify: `manifest.json` — add `cookies` permission
- Test: `tests/unit/cookies/cookie-service.test.ts`

**Interfaces:**
- Consumes: `sendMessage()` from Task 2
- Produces:
  - `getCookiesForDomain(domain: string): Promise<CookieInfo[]>`
  - `deleteCookie(details: { url: string; name: string; storeId?: string }): Promise<void>`
  - `deleteAllCookiesForDomain(domain: string): Promise<number>` — returns count deleted
  - `CookieInfo` — `{ name, domain, path, secure, httpOnly, sameSite, expirationDate, session, partitionKey? }` (note: `value` is passed to chrome.cookies.remove but NEVER included in `CookieInfo` — not exposed in UI or logs)

- [ ] Step 1: Write failing tests
```typescript
test('getCookiesForDomain returns mapped cookie info without values', async () => {
  chrome.cookies.getAll.mockResolvedValue([{
    name: 'sid', value: 'secret', domain: '.example.com', path: '/',
    secure: true, httpOnly: true, sameSite: 'lax',
    expirationDate: 1730000000, session: false, storeId: '0',
  }]);
  const cookies = await getCookiesForDomain('example.com');
  expect(cookies).toHaveLength(1);
  expect(cookies[0].name).toBe('sid');
  expect(cookies[0]).not.toHaveProperty('value');
});
test('deleteCookie calls chrome.cookies.remove', async () => {
  await deleteCookie({ url: 'https://example.com', name: 'sid' });
  expect(chrome.cookies.remove).toHaveBeenCalledWith({
    url: 'https://example.com', name: 'sid',
  });
});
test('deleteAllCookiesForDomain returns deleted count', async () => {
  chrome.cookies.getAll.mockResolvedValue([
    { name: 'a', domain: '.example.com', secure: true, path: '/' },
    { name: 'b', domain: '.example.com', secure: false, path: '/' },
  ]);
  chrome.cookies.remove.mockResolvedValue({});
  const count = await deleteAllCookiesForDomain('example.com');
  expect(count).toBe(2);
});
```

- [ ] Step 2: Run tests — verify failure

- [ ] Step 3: Implement `cookie-service.ts` — wraps `chrome.cookies`. `getCookiesForDomain`: calls `getAll({ domain })`, maps to `CookieInfo` excluding `value`. `deleteCookie`: constructs the correct URL (https for secure cookies, http otherwise) and calls `remove`. `deleteAllCookiesForDomain`: gets all, deletes each, returns count. Handles errors for httpOnly cookies that can't be deleted in certain contexts.

- [ ] Step 4: Run tests — verify pass

- [ ] Step 5: Commit

---

### Task 9: Popup UI

**Files:**
- Modify: `src/popup/App.tsx` — replace stub with full dashboard
- Create: `src/popup/components/ProtectionStatus.tsx`, `ModuleCard.tsx`, `StatsBar.tsx`
- Create: `src/popup/styles/popup.css`

**Interfaces:**
- Consumes: `getSettings()`, `updateSettings()`, `onSettingsChanged()` from Task 2; `getBlockedCount()`, `getRulesetStatus()` from Task 5; `sendMessage()` from Task 2

- [ ] Step 1: Implement `ProtectionStatus.tsx` — master toggle reading `masterEnabled`. Shield icon with three states: green (all enabled), yellow (partial — some modules off), red (master off). `updateSettings({ masterEnabled })` on toggle.

- [ ] Step 2: Implement `ModuleCard.tsx` — props: `title: string`, `icon: string`, `enabled: boolean`, `onToggle: () => void`, `stats: Array<{ label: string; count: number }>`. Renders: module name, toggle switch, inline stat counters.

- [ ] Step 3: Implement `StatsBar.tsx` — horizontal summary: total requests blocked, fingerprint protections, phishing warnings. Reads from stats (uses 0 as default until Task 11 provides real data).

- [ ] Step 4: Compose `App.tsx` — `ProtectionStatus` at top; four `ModuleCard` instances (Fingerprint Protection, Ad Blocking, Tracker Blocking, Phishing Protection); `StatsBar` at bottom; "Open Settings" link calling `chrome.runtime.openOptionsPage()`.

- [ ] Step 5: Style `popup.css` — dark theme with CSS custom properties (`--ds-bg`, `--ds-text`, `--ds-accent`, `--ds-danger`, `--ds-success`). 380px width. Smooth toggle transitions.

- [ ] Step 6: Build, load, open popup. Verify: toggles work and persist, shield color updates, stats show (zeros), settings link opens options page.

- [ ] Step 7: Commit

---

### Task 10: Options Page

**Files:**
- Modify: `src/options/App.tsx` — replace stub with tabbed settings
- Create: `src/options/pages/FingerprintSettings.tsx`, `BlockingSettings.tsx`, `PhishingSettings.tsx`, `CookieManager.tsx`, `StatisticsPage.tsx`, `ThreatLog.tsx`
- Create: `src/options/styles/options.css`

**Interfaces:**
- Consumes: all module APIs from Tasks 2–8

- [ ] Step 1: Implement `App.tsx` — tab navigation with URL-hash routing: Fingerprint, Blocking, Phishing, Cookies, Statistics, Threat Log. Active tab highlighted.

- [ ] Step 2: Implement `FingerprintSettings.tsx` — six individual technique toggles (WebGL, Navigator, Screen, AudioContext, Canvas, ClientRects). Each toggle has a one-sentence description. Shows "Active profile" summary for the current tab's domain (if available). Note explaining that protection applies to new page loads.

- [ ] Step 3: Implement `BlockingSettings.tsx` — three ruleset toggles (Ads, Trackers, Supplementary). Per-list info: rule count, source, last-converted date. Available capacity bar via `getAvailableRuleCapacity()`. Attribution section with links to list sources and licenses.

- [ ] Step 4: Implement `PhishingSettings.tsx` — phishing toggle. Safe Browsing section: opt-in toggle, API key input, explanation paragraph ("When enabled, partial URL hashes may be sent to Google's Safe Browsing service. Full URLs are never transmitted."). Risk threshold selector (low/medium/high, default medium). Caveat text: "No detection system is perfect. DecoyShield may not catch all threats."

- [ ] Step 5: Implement `CookieManager.tsx` — domain input (with current-tab autofill button via `chrome.tabs.query`). Cookie table: name, domain, expiration (formatted), secure badge, httpOnly badge, sameSite. Delete button per row. "Delete all for domain" button. Confirmation dialog for deletes: "Deleting cookies may sign you out of this site."

- [ ] Step 6: Implement `StatisticsPage.tsx` — time range selector (day/week/month). CSS-only bar charts for each metric. Metric tooltip with definition on hover. "Clear all statistics" button with confirmation.

- [ ] Step 7: Implement `ThreatLog.tsx` — table: timestamp, URL (truncated to 60 chars), risk level (badge), action taken, top reason. Sorted newest-first. Max 500 entries. "Clear log" button with confirmation. Privacy note: "This log is stored locally and never transmitted."

- [ ] Step 8: Style `options.css` — matches popup dark theme. Full-width layout. Tab bar at top. Responsive table styling.

- [ ] Step 9: Build, load, open options. Verify: all tabs work, settings persist, cookie manager lists real cookies (test on a site you're logged into), threat log empty initially, stats show zeros.

- [ ] Step 10: Commit

---

### Task 11: Statistics Collection

**Files:**
- Create: `src/background/stats-collector.ts`
- Modify: `src/background/service-worker.ts` — wire stats recording
- Modify: `src/background/dnr-manager.ts` — emit stats events
- Modify: `src/background/phishing-handler.ts` — emit stats events
- Modify: `src/background/fingerprint-registrar.ts` — emit stats events
- Test: `tests/unit/stats/stats-collector.test.ts`

**Interfaces:**
- Consumes: `StatsEvent`, `StatType` from Task 2
- Produces:
  - `recordStat(event: StatsEvent): Promise<void>`
  - `getStats(range: 'day' | 'week' | 'month'): Promise<StatsData>`
  - `clearStats(): Promise<void>`
  - `StatsData = { adsBlocked: number; trackersBlocked: number; fingerprintProtections: number; phishingWarnings: number; cookiesDeleted: number; byDay: Record<string, DailyStats> }`

**Metric definitions** (each counted once per distinct event):
- `adsBlocked` — a DNR rule from the `ads` ruleset blocked a request (via periodic `getMatchedRules` poll)
- `trackersBlocked` — a DNR rule from `trackers` or `supplementary` rulesets blocked a request
- `fingerprintProtections` — a page loaded with fingerprint protection active (counted once per tab navigation, not per API call)
- `phishingWarnings` — the warning interstitial was shown (once per blocked navigation)
- `cookiesDeleted` — a cookie was deleted via the cookie manager UI

- [ ] Step 1: Write failing tests
```typescript
test('recordStat increments daily counter', async () => {
  await recordStat({ type: 'adsBlocked', timestamp: Date.now() });
  await recordStat({ type: 'adsBlocked', timestamp: Date.now() });
  const stats = await getStats('day');
  expect(stats.adsBlocked).toBe(2);
});
test('getStats aggregates across days for week range', async () => {
  // seed two different days
  const day1 = new Date('2026-10-20').getTime();
  const day2 = new Date('2026-10-21').getTime();
  await recordStat({ type: 'adsBlocked', timestamp: day1 });
  await recordStat({ type: 'adsBlocked', timestamp: day2 });
  const stats = await getStats('week');
  expect(stats.adsBlocked).toBe(2);
});
test('clearStats resets all counters', async () => {
  await recordStat({ type: 'adsBlocked', timestamp: Date.now() });
  await clearStats();
  expect((await getStats('day')).adsBlocked).toBe(0);
});
```

- [ ] Step 2: Run tests — verify failure

- [ ] Step 3: Implement `stats-collector.ts` — stores daily stats in `chrome.storage.local` keyed by `stats-YYYY-MM-DD`. `recordStat` increments the correct counter for today's key. `getStats` reads and sums over the date range. Auto-prunes entries older than 90 days on each write.

- [ ] Step 4: Wire into existing modules:
  - `dnr-manager`: poll `getMatchedRules` every 60 seconds, diff with previous count, record new matches
  - `phishing-handler`: `recordStat({ type: 'phishingWarnings' })` when redirecting to warning page
  - `fingerprint-registrar`: record `fingerprintProtections` via `webNavigation.onCompleted` when fingerprint scripts are registered

- [ ] Step 5: Run tests — verify pass

- [ ] Step 6: Verify popup and options stats display now shows real numbers after browsing with the extension active

- [ ] Step 7: Commit

---

### Task 12: Internationalization

**Files:**
- Create: `src/shared/i18n.ts`
- Modify: `_locales/en/messages.json` — all ~80 user-facing strings
- Create: `_locales/hi/messages.json` — Hindi translations
- Create: `_locales/ml/messages.json` — Malayalam translations
- Modify: all popup and options components — replace hardcoded strings with `t('key')` calls

**Interfaces:**
- Produces: `t(key: string, substitutions?: string[]): string` — returns `chrome.i18n.getMessage(key, substitutions)`, falls back to key name if empty

- [ ] Step 1: Implement `src/shared/i18n.ts` — `t(key, substitutions?)` wrapper

- [ ] Step 2: Audit popup components, replace all hardcoded English strings with `t()` calls. Estimated ~20 message keys for popup.

- [ ] Step 3: Audit options page components, replace strings with `t()`. Estimated ~50 keys. Warning page: ~10 keys. Total: ~80 keys.

- [ ] Step 4: Complete `_locales/en/messages.json` — all 80 keys with English strings and `description` fields for translator context

- [ ] Step 5: Create `_locales/hi/messages.json` — Hindi translations for all keys

- [ ] Step 6: Create `_locales/ml/messages.json` — Malayalam translations for all keys

- [ ] Step 7: Build, test with Chrome language set to Hindi. Verify: popup, options, and warning page render Hindi text correctly, no untranslated keys visible.

- [ ] Step 8: Commit

---

## Acceptance Criteria

1. Chrome loads the extension without manifest errors or console warnings
2. All six fingerprint protections are observable by page JavaScript on the fingerprint test page
3. Fingerprint values are deterministic per-site within a session, differ across sites, differ across sessions
4. DNR rules demonstrably block requests from EasyList/EasyPrivacy/Peter Lowe's-covered domains
5. Blocking can be toggled per-list (ads, trackers, supplementary) without restart
6. Phishing detection warns on homograph domains, brand-impersonation subdomains, suspicious URL patterns
7. Phishing detection does NOT warn on legitimate single-script IDN domains or common safe URLs
8. Safe Browsing is disabled by default; enabling it shows a clear disclosure of what data is transmitted
9. Cookie manager lists, inspects, and deletes cookies; cookie values are never displayed in the UI
10. Warning page shows risk reasons, allows going back, and allows proceeding with acknowledgment
11. Settings persist across popup close/reopen and browser restart
12. Statistics match metric definitions — no double-counting, clear distinction between detection and prevention
13. Popup shows master toggle + four module toggles, all functional
14. Options page provides advanced settings for all modules, threat log, and statistics
15. Extension renders correctly in English, Hindi, and Malayalam
16. All Vitest unit tests pass
17. No permissions beyond what the Manifest Permissions table documents
18. No cookie values, passwords, form contents, or browsing history exposed in UI, logs, or transmitted externally
19. Errors and unsupported scenarios (CSP-blocked injection, API unavailable) handled gracefully without crashing

## Technical Limitations to Document

- Fingerprint protection cannot guarantee undetectability; sophisticated fingerprinting may detect override patterns
- MAIN-world script timing: rare race condition where fallback salt is used if `storage.session` read takes longer than first API access
- DNR rule limits may cause some filter rules to be dropped when the global pool is exhausted by other extensions
- Safe Browsing v4 hash-prefix database adds ~20MB to extension storage when enabled
- Canvas noise protection may cause minor visual differences on canvas-heavy applications
- ClientRects offset is deterministic per-site, which means the offset itself could theoretically become a fingerprint if an adversary knows the extension is installed
- Audio fingerprint protection adds negligible processing overhead but may be detectable by code that specifically checks for gain-node injection
- Cookie deletion is permanent and cannot be undone

---

## Dependency Summary

**Runtime (bundled):**
- `preact` — UI framework
- No other runtime dependencies

**Development:**
- `typescript` — type checking
- `vite` — build tool
- `@preact/preset-vite` — Preact JSX transform for Vite
- `vitest` — test runner
- `@types/chrome` — Chrome extension API types
- `tsx` — TypeScript execution for build scripts
- `jsdom` — DOM environment for Vitest (dev only)

**Build-time (scripts only, not bundled):**
- ABP→DNR converter package (evaluate `@nicedoc/AdsBlockerParsers` or write minimal custom converter for the ABP syntax subset used by EasyList/EasyPrivacy)
