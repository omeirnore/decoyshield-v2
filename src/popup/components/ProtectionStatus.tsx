import type { DecoyShieldSettings } from '@/shared/types';
import { ShieldIcon } from '@/shared/Icons';

interface Props {
  settings: DecoyShieldSettings;
  onToggle: () => void;
}

function getShieldState(settings: DecoyShieldSettings): 'on' | 'partial' | 'off' {
  if (!settings.masterEnabled) return 'off';
  const modules = [
    settings.fingerprint.enabled,
    settings.blocking.adsEnabled || settings.blocking.trackersEnabled,
    settings.phishing.enabled,
    settings.cookies.enabled,
  ];
  return modules.every(Boolean) ? 'on' : 'partial';
}

const SHIELD_COLORS = { on: '#2ed573', partial: '#ffa502', off: '#ff4757' } as const;
const SHIELD_LABELS = { on: 'All protections active', partial: 'Some modules disabled', off: 'Protection disabled' } as const;

export function ProtectionStatus({ settings, onToggle }: Props) {
  const state = getShieldState(settings);
  return (
    <div class="protection-status">
      <div class="shield-icon" style={{ color: SHIELD_COLORS[state] }}><ShieldIcon size={28} /></div>
      <div class="protection-info">
        <div class="protection-title">DecoyShield</div>
        <div class="protection-subtitle">{SHIELD_LABELS[state]}</div>
      </div>
      <label class="toggle-switch">
        <input type="checkbox" checked={settings.masterEnabled} onChange={onToggle} />
        <span class="toggle-slider" />
      </label>
    </div>
  );
}
