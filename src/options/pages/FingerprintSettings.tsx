import type { DecoyShieldSettings } from '@/shared/types';
import { updateSettings } from '@/shared/storage';

interface Props {
  settings: DecoyShieldSettings;
}

const TECHNIQUES = [
  { key: 'webgl' as const, name: 'WebGL', desc: 'Spoofs GPU renderer and vendor strings' },
  { key: 'navigator' as const, name: 'Navigator', desc: 'Randomizes hardware info, platform, and languages' },
  { key: 'screen' as const, name: 'Screen', desc: 'Alters reported screen dimensions and color depth' },
  { key: 'audioContext' as const, name: 'AudioContext', desc: 'Adds micro-noise to audio processing output' },
  { key: 'canvas' as const, name: 'Canvas', desc: 'Applies deterministic noise to canvas pixel data' },
  { key: 'clientRects' as const, name: 'Client Rects', desc: 'Offsets element bounding rectangles by sub-pixel amounts' },
];

export function FingerprintSettings({ settings }: Props) {
  const fp = settings.fingerprint;
  return (
    <div>
      <div class="section">
        <h2>Fingerprint Protection</h2>
        <div class="setting-row">
          <div class="setting-label">
            <span>Enable fingerprint protection</span>
            <div class="desc">Applies to new page loads. Active profiles are per-site and session-based.</div>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" checked={fp.enabled}
              onChange={() => updateSettings({ fingerprint: { enabled: !fp.enabled } })} />
            <span class="toggle-slider" />
          </label>
        </div>
      </div>

      <div class="section">
        <h2>Technique Toggles</h2>
        {TECHNIQUES.map(({ key, name, desc }) => (
          <div class="setting-row" key={key}>
            <div class="setting-label">
              <span>{name}</span>
              <div class="desc">{desc}</div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" checked={fp[key]}
                onChange={() => updateSettings({ fingerprint: { [key]: !fp[key] } })} />
              <span class="toggle-slider" />
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
