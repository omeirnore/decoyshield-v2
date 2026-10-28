import type { FingerprintProfile } from '@/shared/types';

/**
 * Farble pixel data — Brave-style approach:
 * Modify R/G/B channels of ~25% of pixels by ±1..3 LSBs.
 * Deterministic per seed (same page load = same hash).
 */
function applyNoise(data: Uint8ClampedArray, seed: number): void {
  let s = seed >>> 0 || 1;
  const len = data.length;
  // Step through every pixel (4 bytes: R,G,B,A) — skip alpha
  for (let i = 0; i < len; i += 4) {
    // xorshift32 PRNG
    s ^= s << 13;
    s ^= s >> 17;
    s ^= s << 5;
    const r = s >>> 0;
    // Modify ~50% of pixels (bit 0 of random)
    if (r & 1) {
      // Modify R channel: ±1 to ±3
      const delta = ((r >> 1) & 3) + 1;          // 1..4
      data[i] = (r & 16) ? Math.min(255, data[i] + delta) : Math.max(0, data[i] - delta);
    }
    if (r & 2) {
      // Modify G channel
      const delta = ((r >> 5) & 3) + 1;
      data[i + 1] = (r & 32) ? Math.min(255, data[i + 1] + delta) : Math.max(0, data[i + 1] - delta);
    }
    if (r & 4) {
      // Modify B channel
      const delta = ((r >> 9) & 3) + 1;
      data[i + 2] = (r & 64) ? Math.min(255, data[i + 2] + delta) : Math.max(0, data[i + 2] - delta);
    }
  }
}

export function apply(
  getProfile: () => FingerprintProfile,
  isEnabled: () => boolean,
): void {
  const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
  const originalToBlob = HTMLCanvasElement.prototype.toBlob;
  const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;

  CanvasRenderingContext2D.prototype.getImageData = function (
    this: CanvasRenderingContext2D,
    ...args: Parameters<CanvasRenderingContext2D['getImageData']>
  ) {
    const imageData = originalGetImageData.apply(this, args);
    if (isEnabled()) applyNoise(imageData.data, getProfile().canvas.noiseSeed);
    return imageData;
  };

  HTMLCanvasElement.prototype.toDataURL = function (
    this: HTMLCanvasElement,
    type?: string,
    quality?: number,
  ) {
    if (!isEnabled()) return originalToDataURL.call(this, type, quality);

    const temp = document.createElement('canvas');
    temp.width = this.width;
    temp.height = this.height;
    const ctx = temp.getContext('2d');
    if (!ctx) return originalToDataURL.call(this, type, quality);

    ctx.drawImage(this, 0, 0);
    const img = originalGetImageData.call(ctx, 0, 0, temp.width, temp.height);
    applyNoise(img.data, getProfile().canvas.noiseSeed);
    ctx.putImageData(img, 0, 0);
    return originalToDataURL.call(temp, type, quality);
  };

  HTMLCanvasElement.prototype.toBlob = function (
    this: HTMLCanvasElement,
    callback: BlobCallback,
    type?: string,
    quality?: number,
  ) {
    if (!isEnabled()) return originalToBlob.call(this, callback, type, quality);

    const temp = document.createElement('canvas');
    temp.width = this.width;
    temp.height = this.height;
    const ctx = temp.getContext('2d');
    if (!ctx) return originalToBlob.call(this, callback, type, quality);

    ctx.drawImage(this, 0, 0);
    const img = originalGetImageData.call(ctx, 0, 0, temp.width, temp.height);
    applyNoise(img.data, getProfile().canvas.noiseSeed);
    ctx.putImageData(img, 0, 0);
    originalToBlob.call(temp, callback, type, quality);
  };

  // ─── OffscreenCanvas support ─────────────────────────────────
  if (typeof OffscreenCanvas !== 'undefined') {
    const originalOCConvertToBlob = OffscreenCanvas.prototype.convertToBlob;
    OffscreenCanvas.prototype.convertToBlob = function (
      this: OffscreenCanvas,
      options?: ImageEncodeOptions,
    ) {
      if (!isEnabled()) return originalOCConvertToBlob.call(this, options);
      const ctx = this.getContext('2d') as OffscreenCanvasRenderingContext2D | null;
      if (!ctx) return originalOCConvertToBlob.call(this, options);
      const img = ctx.getImageData(0, 0, this.width, this.height);
      applyNoise(img.data, getProfile().canvas.noiseSeed);
      ctx.putImageData(img, 0, 0);
      return originalOCConvertToBlob.call(this, options);
    };
  }

  // ─── WebGL readPixels ────────────────────────────────────────
  const patchReadPixels = (proto: WebGLRenderingContext | WebGL2RenderingContext) => {
    const original = proto.readPixels;
    // @ts-expect-error — overload signatures
    proto.readPixels = function (
      this: WebGLRenderingContext,
      ...args: unknown[]
    ) {
      // @ts-expect-error — spread into overloaded fn
      original.apply(this, args);
      if (!isEnabled()) return;
      // The pixel buffer is the last ArrayBufferView argument
      for (let i = args.length - 1; i >= 0; i--) {
        if (args[i] instanceof Uint8Array || args[i] instanceof Uint8ClampedArray) {
          applyNoise(args[i] as Uint8ClampedArray, getProfile().canvas.noiseSeed);
          break;
        }
      }
    };
  };

  if (typeof WebGLRenderingContext !== 'undefined') {
    patchReadPixels(WebGLRenderingContext.prototype as unknown as WebGLRenderingContext);
  }
  if (typeof WebGL2RenderingContext !== 'undefined') {
    patchReadPixels(WebGL2RenderingContext.prototype as unknown as WebGL2RenderingContext);
  }

  // ─── measureText farbling ───────────────────────────────────
  const originalMeasureText = CanvasRenderingContext2D.prototype.measureText;
  CanvasRenderingContext2D.prototype.measureText = function (
    this: CanvasRenderingContext2D,
    text: string,
  ) {
    const metrics = originalMeasureText.call(this, text);
    if (!isEnabled()) return metrics;

    let s = getProfile().canvas.noiseSeed ^ text.length;
    const fuzz = () => {
      s ^= s << 13;
      s ^= s >> 17;
      s ^= s << 5;
      // Tiny offset: ±0.001 to ±0.1
      return ((s >>> 0) % 200 - 100) / 1000;
    };

    const w = metrics.width + fuzz();
    const desc: PropertyDescriptorMap = {
      width: { value: w, configurable: true },
    };
    // Farble all metric properties if they exist
    const props = [
      'actualBoundingBoxLeft', 'actualBoundingBoxRight',
      'actualBoundingBoxAscent', 'actualBoundingBoxDescent',
      'fontBoundingBoxAscent', 'fontBoundingBoxDescent',
      'alphabeticBaseline', 'emHeightAscent', 'emHeightDescent',
    ] as const;
    for (const p of props) {
      const val = (metrics as Record<string, number>)[p];
      if (typeof val === 'number') {
        desc[p] = { value: val + fuzz(), configurable: true };
      }
    }
    Object.defineProperties(metrics, desc);
    return metrics;
  };

  // ─── isPointInPath / isPointInStroke farbling ───────────────
  const originalIsPointInPath = CanvasRenderingContext2D.prototype.isPointInPath;
  const originalIsPointInStroke = CanvasRenderingContext2D.prototype.isPointInStroke;

  CanvasRenderingContext2D.prototype.isPointInPath = function (
    this: CanvasRenderingContext2D,
    ...args: unknown[]
  ) {
    // @ts-expect-error — overload signatures
    const result = originalIsPointInPath.apply(this, args) as boolean;
    if (!isEnabled()) return result;
    // ~5% chance of flipping result (Brave-style)
    let s = getProfile().canvas.noiseSeed ^ 0x50494e50;
    s ^= s << 13; s ^= s >> 17; s ^= s << 5;
    return ((s >>> 0) % 20 === 0) ? !result : result;
  };

  CanvasRenderingContext2D.prototype.isPointInStroke = function (
    this: CanvasRenderingContext2D,
    ...args: unknown[]
  ) {
    // @ts-expect-error — overload signatures
    const result = originalIsPointInStroke.apply(this, args) as boolean;
    if (!isEnabled()) return result;
    let s = getProfile().canvas.noiseSeed ^ 0x53545250;
    s ^= s << 13; s ^= s >> 17; s ^= s << 5;
    return ((s >>> 0) % 20 === 0) ? !result : result;
  };
}
