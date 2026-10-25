import type { FingerprintProfile } from '@/shared/types';

export function apply(
  getProfile: () => FingerprintProfile,
  isEnabled: () => boolean,
): void {
  const originalGetBCR = Element.prototype.getBoundingClientRect;
  const originalGetCR = Element.prototype.getClientRects;

  Element.prototype.getBoundingClientRect = function () {
    const rect = originalGetBCR.call(this);
    if (!isEnabled()) return rect;
    const { offsetX, offsetY } = getProfile().clientRects;
    return new DOMRect(rect.x + offsetX, rect.y + offsetY, rect.width, rect.height);
  };

  Element.prototype.getClientRects = function () {
    const rects = originalGetCR.call(this);
    if (!isEnabled()) return rects;
    const { offsetX, offsetY } = getProfile().clientRects;

    return new Proxy(rects, {
      get(target, prop, receiver) {
        if (typeof prop === 'string' && /^\d+$/.test(prop)) {
          const r = target[Number(prop) as keyof typeof target] as DOMRect | undefined;
          if (!r) return undefined;
          return new DOMRect(r.x + offsetX, r.y + offsetY, r.width, r.height);
        }
        if (prop === 'item') {
          return (i: number) => {
            const r = target.item(i);
            if (!r) return null;
            return new DOMRect(r.x + offsetX, r.y + offsetY, r.width, r.height);
          };
        }
        if (prop === Symbol.iterator) {
          return function* () {
            for (let i = 0; i < target.length; i++) {
              const r = target.item(i);
              if (!r) continue;
              yield new DOMRect(r.x + offsetX, r.y + offsetY, r.width, r.height);
            }
          };
        }
        return Reflect.get(target, prop, receiver);
      },
    });
  };
}
