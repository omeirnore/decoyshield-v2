import { describe, test, expect } from 'vitest';
import { computeUrlHash, checkPrefix } from '@/background/safe-browsing';

describe('computeUrlHash', () => {
  test('returns 32-byte SHA-256', async () => {
    const hash = await computeUrlHash('https://example.com/');
    expect(hash.byteLength).toBe(32);
  });

  test('same URL produces same hash', async () => {
    const a = await computeUrlHash('https://example.com/');
    const b = await computeUrlHash('https://example.com/');
    expect(new Uint8Array(a)).toEqual(new Uint8Array(b));
  });
});

describe('checkPrefix', () => {
  test('returns false for empty prefix set', () => {
    expect(checkPrefix(new Uint8Array(32), new Set())).toBe(false);
  });

  test('returns true when prefix matches', () => {
    const hash = new Uint8Array(32);
    hash[0] = 0xab;
    hash[1] = 0xcd;
    hash[2] = 0xef;
    hash[3] = 0x01;
    const prefix = 'abcdef01';
    expect(checkPrefix(hash, new Set([prefix]))).toBe(true);
  });
});
