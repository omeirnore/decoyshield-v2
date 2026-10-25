import type { FingerprintProfile } from '@/shared/types';

const PROPS = ['hardwareConcurrency', 'deviceMemory', 'platform', 'language', 'languages'] as const;

export function apply(
  getProfile: () => FingerprintProfile,
  isEnabled: () => boolean,
): void {
  for (const prop of PROPS) {
    const original = Object.getOwnPropertyDescriptor(Navigator.prototype, prop);
    Object.defineProperty(Navigator.prototype, prop, {
      configurable: true,
      enumerable: true,
      get() {
        if (isEnabled()) return getProfile().navigator[prop];
        return original?.get?.call(this);
      },
    });
  }
}
