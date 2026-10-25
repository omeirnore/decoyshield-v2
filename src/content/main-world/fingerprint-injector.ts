import type { FingerprintProfile, FingerprintSettings } from '@/shared/types';
import { generateProfile } from './protections/profiles';
import { apply as applyWebGL } from './protections/webgl';
import { apply as applyNavigator } from './protections/navigator';
import { apply as applyScreen } from './protections/screen';
import { apply as applyAudioContext } from './protections/audio-context';
import { apply as applyCanvas } from './protections/canvas';
import { apply as applyClientRects } from './protections/client-rects';

let configSalt: string | null = null;
let fpSettings: FingerprintSettings | null = null;
let cachedProfile: FingerprintProfile | null = null;

window.addEventListener('message', (e) => {
  if (e.source === window && e.data?.type === 'ds-fp-config') {
    configSalt = e.data.salt;
    fpSettings = e.data.settings;
    cachedProfile = null;
  }
});

function getProfile(): FingerprintProfile {
  if (cachedProfile) return cachedProfile;
  const domain = location.hostname;
  const salt = configSalt ?? `${performance.timeOrigin}|${domain}`;
  cachedProfile = generateProfile(domain, salt);
  return cachedProfile;
}

function isEnabled(key: keyof Omit<FingerprintSettings, 'enabled'>): boolean {
  return fpSettings === null || fpSettings[key];
}

applyWebGL(getProfile, () => isEnabled('webgl'));
applyNavigator(getProfile, () => isEnabled('navigator'));
applyScreen(getProfile, () => isEnabled('screen'));
applyAudioContext(getProfile, () => isEnabled('audioContext'));
applyCanvas(getProfile, () => isEnabled('canvas'));
applyClientRects(getProfile, () => isEnabled('clientRects'));
