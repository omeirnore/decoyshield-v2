import { describe, test, expect } from 'vitest';
import { generateProfile } from '@/content/main-world/protections/profiles';

describe('generateProfile', () => {
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
});
