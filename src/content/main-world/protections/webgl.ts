import type { FingerprintProfile } from '@/shared/types';

const UNMASKED_VENDOR_WEBGL = 0x9245;
const UNMASKED_RENDERER_WEBGL = 0x9246;

export function apply(
  getProfile: () => FingerprintProfile,
  isEnabled: () => boolean,
): void {
  overrideContext(WebGLRenderingContext, getProfile, isEnabled);
  if (typeof WebGL2RenderingContext !== 'undefined') {
    overrideContext(WebGL2RenderingContext, getProfile, isEnabled);
  }
}

function overrideContext(
  Ctx: typeof WebGLRenderingContext | typeof WebGL2RenderingContext,
  getProfile: () => FingerprintProfile,
  isEnabled: () => boolean,
): void {
  const original = Ctx.prototype.getParameter;
  Ctx.prototype.getParameter = function (pname: number) {
    if (isEnabled()) {
      if (pname === UNMASKED_RENDERER_WEBGL) return getProfile().webgl.renderer;
      if (pname === UNMASKED_VENDOR_WEBGL) return getProfile().webgl.vendor;
    }
    return original.call(this, pname);
  };
}
