import type { FingerprintProfile } from '@/shared/types';

function applyNoise(data: Uint8ClampedArray, seed: number): void {
  let s = seed;
  for (let i = 0; i < data.length; i += 40) {
    s ^= s << 13;
    s ^= s >> 17;
    s ^= s << 5;
    data[i] = data[i] ^ ((s >>> 0) & 1);
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
}
