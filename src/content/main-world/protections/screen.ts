import type { FingerprintProfile } from '@/shared/types';

const PROPS = ['width', 'height', 'colorDepth', 'pixelDepth'] as const;

export function apply(
  getProfile: () => FingerprintProfile,
  isEnabled: () => boolean,
): void {
  for (const prop of PROPS) {
    const original = Object.getOwnPropertyDescriptor(Screen.prototype, prop);
    Object.defineProperty(Screen.prototype, prop, {
      configurable: true,
      enumerable: true,
      get() {
        if (isEnabled()) return getProfile().screen[prop];
        return original?.get?.call(this);
      },
    });
  }
}
