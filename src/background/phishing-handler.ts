import { getSettings } from '@/shared/storage';
import { analyzeUrl } from '@/phishing/url-analyzer';
import { detectHomograph } from '@/phishing/homograph-detector';
import { scoreRisk } from '@/phishing/risk-scorer';
import { checkSafeBrowsing } from './safe-browsing';
import type { RiskIndicator, RiskLevel } from '@/shared/types';
import { recordThreat } from './threat-log';
import { recordStat } from './stats-collector';

const sessionAllowlist = new Set<string>();
const SKIP_SCHEMES = ['chrome:', 'chrome-extension:', 'about:', 'moz-extension:', 'edge:'];

export function allowUrl(url: string): void {
  sessionAllowlist.add(url);
}

export async function handleNavigation(
  details: { tabId: number; url: string; frameId: number },
): Promise<void> {
  if (details.frameId !== 0) return;

  const url = details.url;
  if (SKIP_SCHEMES.some((s) => url.startsWith(s))) return;
  if (sessionAllowlist.has(url)) return;

  const settings = await getSettings();
  if (!settings.masterEnabled || !settings.phishing.enabled) return;

  const analysis = analyzeUrl(url);
  const homograph = detectHomograph(analysis.domain);

  const indicators: RiskIndicator[] = [...analysis.indicators];

  if (homograph.isSuspicious) {
    indicators.push({
      type: 'homograph',
      description: homograph.reason ?? 'Homograph attack detected',
      weight: 0.8,
    });
  }

  if (settings.phishing.safeBrowsingEnabled && settings.phishing.safeBrowsingApiKey) {
    try {
      const sb = await checkSafeBrowsing(url, settings.phishing.safeBrowsingApiKey);
      if (sb.matched) {
        indicators.push({
          type: 'safe-browsing',
          description: `Google Safe Browsing: ${sb.threatType ?? 'threat detected'}`,
          weight: 0.9,
        });
      }
    } catch {
      // Safe Browsing check failed — continue without it
    }
  }

  const risk = scoreRisk(indicators);

  const LEVEL_ORDER: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2 };
  const threshold = settings.phishing.riskThreshold;
  if (LEVEL_ORDER[risk.level] >= LEVEL_ORDER[threshold]) {
    await recordThreat({
      timestamp: Date.now(),
      url,
      level: risk.level,
      action: 'blocked',
      reason: risk.reasons[0] ?? 'Suspicious URL',
    });
    await recordStat({ type: 'phishingWarnings', timestamp: Date.now() });
    const warningUrl = chrome.runtime.getURL('warning/index.html');
    const params = new URLSearchParams({
      url,
      level: risk.level,
      reasons: JSON.stringify(risk.reasons),
    });
    await chrome.tabs.update(details.tabId, { url: `${warningUrl}?${params}` });
  }
}

export function registerPhishingHandler(): void {
  // Use onBeforeNavigate so we catch URLs BEFORE DNS resolution
  // This way even non-existent phishing domains get intercepted
  chrome.webNavigation.onBeforeNavigate.addListener((details) => {
    handleNavigation(details);
  });
}
