import { describe, test, expect } from 'vitest';
import { detectHomograph } from '@/phishing/homograph-detector';

describe('detectHomograph', () => {
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
});
