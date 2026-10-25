const SCRIPT_IDS = ['ds-config-bridge', 'ds-fingerprint-injector', 'ds-redirect-blocker'];

export async function registerFingerprintScripts(): Promise<void> {
  await unregisterFingerprintScripts();

  await chrome.scripting.registerContentScripts([
    {
      id: 'ds-config-bridge',
      matches: ['<all_urls>'],
      js: ['content/isolated/config-bridge.js'],
      runAt: 'document_start',
      world: 'ISOLATED',
      allFrames: true,
    },
    {
      id: 'ds-fingerprint-injector',
      matches: ['<all_urls>'],
      js: ['content/main-world/fingerprint-injector.js'],
      runAt: 'document_start',
      world: 'MAIN',
      allFrames: true,
    },
    {
      id: 'ds-redirect-blocker',
      matches: ['<all_urls>'],
      js: ['content/main-world/redirect-blocker.js'],
      runAt: 'document_start',
      world: 'MAIN',
      allFrames: true,
    },
  ]);
}

export async function unregisterFingerprintScripts(): Promise<void> {
  try {
    await chrome.scripting.unregisterContentScripts({ ids: SCRIPT_IDS });
  } catch {
    // Scripts may not be registered yet
  }
}
