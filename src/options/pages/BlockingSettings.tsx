import type { DecoyShieldSettings } from '@/shared/types';
import { updateSettings } from '@/shared/storage';

interface Props {
  settings: DecoyShieldSettings;
}

const RULESETS = [
  { key: 'adsEnabled' as const, name: 'Ads', source: 'EasyList', desc: 'Blocks ad network requests' },
  { key: 'trackersEnabled' as const, name: 'Trackers', source: 'EasyPrivacy', desc: 'Blocks tracking scripts and pixels' },
  { key: 'supplementaryEnabled' as const, name: 'Supplementary', source: "Peter Lowe's List", desc: 'Blocks known ad/tracking domains' },
];

export function BlockingSettings({ settings }: Props) {
  const blocking = settings.blocking;
  return (
    <div>
      <div class="section">
        <h2>Ad & Tracker Blocking</h2>
        <p class="info-text" style={{ marginBottom: '16px' }}>
          Uses Chrome's declarativeNetRequest API with pre-converted filter lists.
          Rules are applied at the network level before requests are sent.
        </p>
        {RULESETS.map(({ key, name, source, desc }) => (
          <div class="setting-row" key={key}>
            <div class="setting-label">
              <span>{name}</span>
              <div class="desc">{desc} (Source: {source})</div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" checked={blocking[key]}
                onChange={() => updateSettings({ blocking: { [key]: !blocking[key] } })} />
              <span class="toggle-slider" />
            </label>
          </div>
        ))}
      </div>

      <div class="section">
        <h3>Attribution</h3>
        <p class="info-text">
          Filter lists provided by: EasyList (GPLv3), EasyPrivacy (GPLv3), Peter Lowe's Ad and tracking server list (Creative Commons).
        </p>
      </div>
    </div>
  );
}
