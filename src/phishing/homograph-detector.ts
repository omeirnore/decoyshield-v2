export interface HomographResult {
  isSuspicious: boolean;
  reason?: string;
  mixedScripts: string[];
}

type UnicodeScript = 'Latin' | 'Cyrillic' | 'Greek' | 'Common' | 'Other';

function classifyChar(code: number): UnicodeScript {
  if (code >= 0x0041 && code <= 0x024f) return 'Latin';
  if (code >= 0x0400 && code <= 0x04ff) return 'Cyrillic';
  if (code >= 0x0370 && code <= 0x03ff) return 'Greek';
  if (code >= 0x1d00 && code <= 0x1d7f) return 'Latin'; // phonetic extensions
  if (code >= 0x1e00 && code <= 0x1eff) return 'Latin'; // Latin extended additional
  if (code >= 0x0500 && code <= 0x052f) return 'Cyrillic'; // Cyrillic supplement
  if (code >= 0x2de0 && code <= 0x2dff) return 'Cyrillic'; // Cyrillic extended-A
  if (
    (code >= 0x0030 && code <= 0x0039) || // digits
    code === 0x002d || // hyphen
    code === 0x002e // dot
  ) {
    return 'Common';
  }
  return 'Other';
}

const CONFUSABLE_PAIRS: Array<[string, string]> = [
  ['0', 'O'], ['0', 'o'],
  ['1', 'l'], ['1', 'I'],
  ['rn', 'm'],
  ['vv', 'w'],
  ['cl', 'd'],
];

function hasConfusables(domain: string): boolean {
  const lower = domain.toLowerCase();
  for (const [fake] of CONFUSABLE_PAIRS) {
    if (lower.includes(fake)) {
      const parts = domain.split('.');
      const mainPart = parts.length >= 2 ? parts.slice(0, -1).join('.') : domain;
      if (/\d/.test(mainPart) && /[a-zA-Z]/.test(mainPart)) {
        return true;
      }
    }
  }
  return false;
}

export function detectHomograph(domain: string): HomographResult {
  const labels = domain.split('.');
  const scripts = new Set<UnicodeScript>();

  for (const label of labels) {
    for (let i = 0; i < label.length; i++) {
      const code = label.codePointAt(i)!;
      if (code > 0xffff) i++;
      const script = classifyChar(code);
      if (script !== 'Common') scripts.add(script);
    }
  }

  const nonCommon = [...scripts].filter((s) => s !== 'Other');

  if (nonCommon.length > 1) {
    return {
      isSuspicious: true,
      reason: `Mixed scripts detected: ${nonCommon.join(', ')}`,
      mixedScripts: nonCommon,
    };
  }

  if (hasConfusables(domain)) {
    return {
      isSuspicious: true,
      reason: 'Domain contains digit-letter confusables',
      mixedScripts: [],
    };
  }

  return { isSuspicious: false, mixedScripts: [] };
}
