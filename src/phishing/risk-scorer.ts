import type { RiskIndicator, RiskLevel, RiskScore } from '@/shared/types';

const MAX_SINGLE_INDICATOR = 0.6;
const LOW_THRESHOLD = 0.4;
const HIGH_THRESHOLD = 0.7;

export function scoreRisk(indicators: RiskIndicator[]): RiskScore {
  if (indicators.length === 0) {
    return { level: 'low', score: 0, reasons: [] };
  }

  const clamped = indicators.map((i) => Math.min(i.weight, MAX_SINGLE_INDICATOR));
  const raw = clamped.reduce((sum, w) => sum + w, 0);
  const score = Math.min(raw / Math.max(clamped.length * 0.5 + 0.5, 1), 1);

  let level: RiskLevel;
  if (score >= HIGH_THRESHOLD) level = 'high';
  else if (score >= LOW_THRESHOLD) level = 'medium';
  else level = 'low';

  const reasons = indicators
    .sort((a, b) => b.weight - a.weight)
    .map((i) => i.description);

  return { level, score, reasons };
}
