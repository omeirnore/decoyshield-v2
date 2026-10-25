import { describe, test, expect } from 'vitest';
import { analyzeUrl } from '@/phishing/url-analyzer';

describe('analyzeUrl', () => {
  test('detects suspicious TLD', () => {
    const r = analyzeUrl('https://login-bankofamerica.tk/signin');
    expect(r.indicators.some((i) => i.type === 'suspicious-tld')).toBe(true);
  });

  test('detects brand in subdomain', () => {
    const r = analyzeUrl('https://paypal.com.evil-site.com/login');
    expect(r.indicators.some((i) => i.type === 'misleading-subdomain')).toBe(true);
  });

  test('detects IP address URL', () => {
    const r = analyzeUrl('http://192.168.1.1/login');
    expect(r.indicators.some((i) => i.type === 'ip-address')).toBe(true);
  });

  test('detects excessive encoding', () => {
    const r = analyzeUrl('https://example.com/%2F%2Flogin%2F%2Fbank');
    expect(r.indicators.some((i) => i.type === 'suspicious-encoding')).toBe(true);
  });

  test('safe URL has no high-weight indicators', () => {
    const r = analyzeUrl('https://www.google.com');
    expect(r.indicators.filter((i) => i.weight > 0.5)).toHaveLength(0);
  });
});
