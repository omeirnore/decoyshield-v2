import { useState, useEffect } from 'preact/hooks';
import type { ComponentChild } from 'preact';
import type { StatsData, DailyStats } from '@/shared/types';
import {
  BanIcon, EyeOffIcon, FingerprintIcon, AlertTriangleIcon,
  CornerDownLeftIcon, CookieIcon, ShieldIcon, CheckCircleIcon,
  TrendingUpIcon, LightbulbIcon, InfoIcon,
} from '@/shared/Icons';
import './styles/report.css';

interface WeeklyReport {
  current: StatsData;
  previous: StatsData;
}

interface Remediation {
  icon: ComponentChild;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'success';
}

const STAT_LABELS: Record<keyof DailyStats, { label: string; icon: ComponentChild }> = {
  adsBlocked: { label: 'Ads Blocked', icon: <BanIcon size={22} color="#ff4757" /> },
  trackersBlocked: { label: 'Trackers Blocked', icon: <EyeOffIcon size={22} color="#ffa502" /> },
  fingerprintProtections: { label: 'Fingerprint Protections', icon: <FingerprintIcon size={22} color="#4f8cff" /> },
  phishingWarnings: { label: 'Phishing Warnings', icon: <AlertTriangleIcon size={22} color="#ff6348" /> },
  redirectsBlocked: { label: 'Redirects Blocked', icon: <CornerDownLeftIcon size={22} color="#636eff" /> },
  cookiesDeleted: { label: 'Cookies Deleted', icon: <CookieIcon size={22} color="#ffa502" /> },
};

function getTrend(current: number, previous: number): { pct: number; direction: 'up' | 'down' | 'flat' } {
  if (previous === 0 && current === 0) return { pct: 0, direction: 'flat' };
  if (previous === 0) return { pct: 100, direction: 'up' };
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return { pct: 0, direction: 'flat' };
  return { pct: Math.abs(pct), direction: pct > 0 ? 'up' : 'down' };
}

function generateRemediations(report: WeeklyReport): Remediation[] {
  const tips: Remediation[] = [];
  const { current, previous } = report;

  // Phishing warnings
  if (current.phishingWarnings > 0) {
    tips.push({
      icon: <AlertTriangleIcon size={20} color="#ff6348" />,
      title: `${current.phishingWarnings} phishing attempt${current.phishingWarnings > 1 ? 's' : ''} detected`,
      description: 'Avoid clicking links in emails from unknown senders. Always verify URLs before entering credentials. Look for HTTPS and check the domain carefully.',
      severity: 'warning',
    });
  } else {
    tips.push({
      icon: <CheckCircleIcon size={20} color="#2ed573" />,
      title: 'No phishing attempts detected',
      description: 'Great browsing habits! Keep being cautious with unfamiliar links and emails.',
      severity: 'success',
    });
  }

  // Tracker trend
  const trackerTrend = getTrend(current.trackersBlocked, previous.trackersBlocked);
  if (trackerTrend.direction === 'up' && trackerTrend.pct > 30) {
    tips.push({
      icon: <TrendingUpIcon size={20} color="#ffa502" />,
      title: `Trackers up ${trackerTrend.pct}% vs last week`,
      description: 'You may be visiting more sites with aggressive tracking. Consider enabling cookie auto-delete if not already active, and review your browsing for new sites that load excessive trackers.',
      severity: 'warning',
    });
  } else if (current.trackersBlocked > 0) {
    tips.push({
      icon: <ShieldIcon size={20} color="#4f8cff" />,
      title: `${current.trackersBlocked} trackers blocked`,
      description: 'DecoyShield is actively protecting your privacy by blocking known tracking scripts and pixels.',
      severity: 'info',
    });
  }

  // Ads blocked
  if (current.adsBlocked > 100) {
    tips.push({
      icon: <LightbulbIcon size={20} color="#ffa502" />,
      title: `${current.adsBlocked} ads blocked this week`,
      description: 'Heavy ad exposure detected. Consider checking if supplementary blocking rules are enabled in settings for broader coverage.',
      severity: 'info',
    });
  } else if (current.adsBlocked > 0) {
    tips.push({
      icon: <BanIcon size={20} color="#2ed573" />,
      title: `${current.adsBlocked} ads blocked`,
      description: 'Ad blocking is working normally. Pages should load faster and with fewer distractions.',
      severity: 'success',
    });
  }

  // Fingerprint protections
  if (current.fingerprintProtections === 0) {
    tips.push({
      icon: <FingerprintIcon size={20} color="#ffa502" />,
      title: 'No fingerprint protections recorded',
      description: 'Fingerprint protection may be disabled. Enable it in DecoyShield settings to prevent sites from uniquely identifying your browser.',
      severity: 'warning',
    });
  } else {
    tips.push({
      icon: <FingerprintIcon size={20} color="#2ed573" />,
      title: `${current.fingerprintProtections} pages fingerprint-protected`,
      description: 'Your browser fingerprint is being randomized per-site, making cross-site tracking much harder.',
      severity: 'success',
    });
  }

  // Redirects
  if (current.redirectsBlocked > 0) {
    const redirectTrend = getTrend(current.redirectsBlocked, previous.redirectsBlocked);
    const trendText = redirectTrend.direction === 'up' ? ` (${redirectTrend.pct}% increase)` : '';
    tips.push({
      icon: <CornerDownLeftIcon size={20} color="#636eff" />,
      title: `${current.redirectsBlocked} redirects blocked${trendText}`,
      description: 'Malicious redirects were intercepted before they could take you to unwanted sites.',
      severity: 'info',
    });
  }

  // Cookies deleted
  if (current.cookiesDeleted > 0) {
    tips.push({
      icon: <CookieIcon size={20} color="#2ed573" />,
      title: `${current.cookiesDeleted} tracking cookies cleaned`,
      description: 'Tracking cookies from known advertising and analytics domains were automatically removed.',
      severity: 'success',
    });
  }

  return tips;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function StatCard({ statKey, current, previous }: {
  statKey: keyof DailyStats;
  current: number;
  previous: number;
}) {
  const { label, icon } = STAT_LABELS[statKey];
  const trend = getTrend(current, previous);

  return (
    <div class="stat-card">
      <div class="stat-icon">{icon}</div>
      <div class="stat-value">{current.toLocaleString()}</div>
      <div class="stat-label">{label}</div>
      {trend.direction !== 'flat' && (
        <div class={`stat-trend trend-${trend.direction}`}>
          {trend.direction === 'up' ? '↑' : '↓'} {trend.pct}%
        </div>
      )}
      {trend.direction === 'flat' && <div class="stat-trend trend-flat">— No change</div>}
    </div>
  );
}

function DailyBreakdown({ byDay }: { byDay: Record<string, DailyStats> }) {
  const days = Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b));

  if (days.length === 0) return null;

  // Find max total for bar scaling
  const maxTotal = Math.max(
    ...days.map(([, d]) => d.adsBlocked + d.trackersBlocked + d.fingerprintProtections + d.phishingWarnings + d.redirectsBlocked + d.cookiesDeleted),
    1,
  );

  return (
    <div class="section">
      <h2>Daily Breakdown</h2>
      <div class="daily-chart">
        {days.map(([date, stats]) => {
          const total = stats.adsBlocked + stats.trackersBlocked + stats.fingerprintProtections + stats.phishingWarnings + stats.redirectsBlocked + stats.cookiesDeleted;
          const pct = (total / maxTotal) * 100;
          return (
            <div class="day-row" key={date}>
              <span class="day-label">{formatDate(date)}</span>
              <div class="day-bar-track">
                <div class="day-bar-fill" style={{ width: `${pct}%` }}></div>
              </div>
              <span class="day-total">{total.toLocaleString()}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function App() {
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      chrome.runtime.sendMessage({ type: 'GET_WEEKLY_REPORT' }),
      // Fallback: fetch stats directly if message handler isn't ready
    ]).then(([data]) => {
      if (data) {
        setReport(data);
      }
      setLoading(false);
    }).catch(() => {
      // Fallback: fetch current and previous week stats separately
      Promise.all([
        chrome.runtime.sendMessage({ type: 'GET_STATS', range: 'week' }),
        chrome.runtime.sendMessage({ type: 'GET_STATS', range: 'week' }),
      ]).then(([current, previous]) => {
        setReport({ current: current ?? emptyStats(), previous: previous ?? emptyStats() });
        setLoading(false);
      });
    });
  }, []);

  if (loading) {
    return (
      <div class="report-container">
        <div class="report-loading">Loading report...</div>
      </div>
    );
  }

  if (!report) {
    return (
      <div class="report-container">
        <div class="report-loading">No data available yet. Check back after browsing for a week.</div>
      </div>
    );
  }

  const remediations = generateRemediations(report);
  const statKeys = Object.keys(STAT_LABELS) as Array<keyof DailyStats>;

  const reportDate = new Date();
  const weekStart = new Date(reportDate);
  weekStart.setDate(weekStart.getDate() - 6);

  return (
    <div class="report-container">
      <div class="report-header">
        <div class="report-title-row">
          <span class="shield-icon"><ShieldIcon size={32} color="#4f8cff" /></span>
          <div>
            <h1>Weekly Security Report</h1>
            <p class="report-date">
              {weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              {' — '}
              {reportDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </div>
      </div>

      <div class="stats-grid">
        {statKeys.map((key) => (
          <StatCard
            key={key}
            statKey={key}
            current={report.current[key]}
            previous={report.previous[key]}
          />
        ))}
      </div>

      <DailyBreakdown byDay={report.current.byDay} />

      <div class="section">
        <h2>Recommendations</h2>
        <div class="remediation-list">
          {remediations.map((tip, i) => (
            <div key={i} class={`remediation-card severity-${tip.severity}`}>
              <div class="remediation-icon">{tip.icon}</div>
              <div class="remediation-content">
                <div class="remediation-title">{tip.title}</div>
                <div class="remediation-desc">{tip.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div class="report-footer">
        <p>Generated by DecoyShield &middot; Protecting your browsing privacy</p>
      </div>
    </div>
  );
}

function emptyStats(): StatsData {
  return {
    adsBlocked: 0,
    trackersBlocked: 0,
    fingerprintProtections: 0,
    phishingWarnings: 0,
    redirectsBlocked: 0,
    cookiesDeleted: 0,
    byDay: {},
  };
}
