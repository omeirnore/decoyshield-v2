const SB_PREFIX_KEY = 'sb-prefixes';

export async function computeUrlHash(url: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  return crypto.subtle.digest('SHA-256', encoder.encode(url));
}

export function checkPrefix(hash: Uint8Array, prefixSet: Set<string>): boolean {
  if (prefixSet.size === 0) return false;
  const prefix = Array.from(hash.slice(0, 4))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return prefixSet.has(prefix);
}

export async function checkSafeBrowsing(
  url: string,
  apiKey: string,
): Promise<{ matched: boolean; threatType?: string }> {
  const data = await chrome.storage.local.get(SB_PREFIX_KEY);
  const prefixes: string[] = data[SB_PREFIX_KEY] ?? [];
  const prefixSet = new Set(prefixes);

  if (prefixSet.size === 0) return { matched: false };

  const hashBuffer = await computeUrlHash(url);
  const hash = new Uint8Array(hashBuffer);

  if (!checkPrefix(hash, prefixSet)) return { matched: false };

  try {
    const resp = await fetch(
      `https://safebrowsing.googleapis.com/v4/fullHashes:find?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client: { clientId: 'decoyshield', clientVersion: '0.1.0' },
          clientStates: [],
          threatInfo: {
            threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE'],
            platformTypes: ['ANY_PLATFORM'],
            threatEntryTypes: ['URL'],
            threatEntries: [{ hash: btoa(String.fromCharCode(...hash.slice(0, 4))) }],
          },
        }),
      },
    );

    if (!resp.ok) return { matched: false };
    const result = await resp.json();

    if (result.matches?.length > 0) {
      return { matched: true, threatType: result.matches[0].threatType };
    }
  } catch {
    // Network error — fail open
  }

  return { matched: false };
}

export async function updatePrefixDatabase(apiKey: string): Promise<void> {
  try {
    const resp = await fetch(
      `https://safebrowsing.googleapis.com/v4/threatListUpdates:fetch?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client: { clientId: 'decoyshield', clientVersion: '0.1.0' },
          listUpdateRequests: [
            {
              threatType: 'SOCIAL_ENGINEERING',
              platformType: 'ANY_PLATFORM',
              threatEntryType: 'URL',
              state: '',
              constraints: { maxUpdateEntries: 10000, supportedCompressions: ['RAW'] },
            },
          ],
        }),
      },
    );

    if (!resp.ok) return;
    const data = await resp.json();

    const prefixes: string[] = [];
    for (const update of data.listUpdateResponses ?? []) {
      for (const addition of update.additions ?? []) {
        if (addition.rawHashes?.rawHashes) {
          const raw = atob(addition.rawHashes.rawHashes);
          const prefixSize = addition.rawHashes.prefixSize ?? 4;
          for (let i = 0; i < raw.length; i += prefixSize) {
            const hex = Array.from(raw.slice(i, i + prefixSize))
              .map((c: string) => c.charCodeAt(0).toString(16).padStart(2, '0'))
              .join('');
            prefixes.push(hex);
          }
        }
      }
    }

    await chrome.storage.local.set({ [SB_PREFIX_KEY]: prefixes });
  } catch {
    // Network error — keep existing prefixes
  }
}
