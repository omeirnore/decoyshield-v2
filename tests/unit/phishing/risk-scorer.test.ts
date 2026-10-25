import { describe, test, expect } from 'vitest';
import { scoreRisk } from '@/phishing/risk-scorer';

describe('scoreRisk', () => {
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
});
