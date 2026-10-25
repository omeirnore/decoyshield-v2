import type { RiskIndicator } from '@/shared/types';

export interface UrlAnalysis {
  indicators: RiskIndicator[];
  domain: string;
  isSuspicious: boolean;
}

const SUSPICIOUS_TLDS = new Set([
  'tk', 'ml', 'cf', 'ga', 'gq', 'buzz', 'top', 'xyz', 'club',
  'work', 'date', 'racing', 'win', 'bid', 'stream', 'download',
]);

const TARGET_BRANDS = [
  'paypal', 'apple', 'google', 'microsoft', 'amazon', 'netflix',
  'facebook', 'instagram', 'twitter', 'chase', 'wellsfargo', 'bankofamerica',
  'citibank', 'usbank', 'capitalone', 'dropbox', 'linkedin', 'ebay',
];

/** Keywords in the URL that strongly suggest credential phishing */
const PHISHING_KEYWORDS = [
  'login', 'signin', 'sign-in', 'verify', 'verification', 'account',
  'password', 'credential', 'secure', 'update', 'confirm', 'authenticate',
  'wallet', 'suspend', 'restricted', 'unlock', 'recover', 'billing',
];

const IPV4_REGEX = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;

export function analyzeUrl(urlString: string): UrlAnalysis {
  const indicators: RiskIndicator[] = [];
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    indicators.push({ type: 'malformed-url', description: 'URL cannot be parsed', weight: 0.9 });
    return { indicators, domain: '', isSuspicious: indicators.length > 0 };
  }

  const hostname = parsed.hostname;
  const parts = hostname.split('.');
  const tld = parts[parts.length - 1];

  if (SUSPICIOUS_TLDS.has(tld)) {
    indicators.push({ type: 'suspicious-tld', description: `Suspicious TLD: .${tld}`, weight: 0.6 });
  }

  if (IPV4_REGEX.test(hostname)) {
    indicators.push({ type: 'ip-address', description: 'URL uses IP address instead of domain', weight: 0.7 });
  }

  const registrable = parts.slice(-2).join('.');
  const subdomains = parts.slice(0, -2).join('.');
  for (const brand of TARGET_BRANDS) {
    if (subdomains.includes(brand) && !registrable.includes(brand)) {
      indicators.push({
        type: 'misleading-subdomain',
        description: `Brand "${brand}" appears in subdomain of ${registrable}`,
        weight: 0.8,
      });
      break;
    }
  }

  const port = parsed.port;
  if (port && port !== '80' && port !== '443') {
    indicators.push({ type: 'unusual-port', description: `Unusual port: ${port}`, weight: 0.3 });
  }

  const pathSegments = parsed.pathname.split('/').filter(Boolean);
  if (pathSegments.length > 5) {
    indicators.push({ type: 'deep-path', description: 'Excessive URL path depth', weight: 0.3 });
  }

  const encodedSlashes = (urlString.match(/%2F/gi) || []).length;
  if (encodedSlashes >= 3) {
    indicators.push({ type: 'suspicious-encoding', description: 'Excessive URL encoding', weight: 0.5 });
  }

  if (parsed.protocol === 'data:') {
    indicators.push({ type: 'data-url', description: 'data: URI', weight: 0.8 });
  }

  if (parsed.protocol === 'http:' && !IPV4_REGEX.test(hostname) && !hostname.includes('localhost')) {
    indicators.push({ type: 'no-https', description: 'No HTTPS — connection is not secure', weight: 0.4 });

    // HTTP + phishing keyword in domain or path = very likely phishing
    const fullUrl = urlString.toLowerCase();
    const matchedKeywords = PHISHING_KEYWORDS.filter((kw) => fullUrl.includes(kw));
    if (matchedKeywords.length > 0) {
      indicators.push({
        type: 'http-phishing-keywords',
        description: `Insecure page with login/verification keywords: ${matchedKeywords.join(', ')}`,
        weight: 0.8,
      });
    }
  }

  const redirectParams = ['url', 'redirect', 'next', 'goto', 'return_to', 'continue'];
  for (const param of redirectParams) {
    const val = parsed.searchParams.get(param);
    if (val && (val.startsWith('http') || val.startsWith('//'))) {
      indicators.push({ type: 'redirect-param', description: `Redirect URL in ?${param}`, weight: 0.4 });
      break;
    }
  }

  return {
    indicators,
    domain: hostname,
    isSuspicious: indicators.some((i) => i.weight >= 0.5),
  };
}
