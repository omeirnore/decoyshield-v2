import type { FingerprintProfile } from '@/shared/types';

const GPU_PROFILES: Array<{ renderer: string; vendor: string }> = [
  { renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11)', vendor: 'Google Inc. (Intel)' },
  { renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11)', vendor: 'Google Inc. (Intel)' },
  { renderer: 'ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11)', vendor: 'Google Inc. (Intel)' },
  { renderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1650 Direct3D11)', vendor: 'Google Inc. (NVIDIA)' },
  { renderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1060 6GB Direct3D11)', vendor: 'Google Inc. (NVIDIA)' },
  { renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11)', vendor: 'Google Inc. (NVIDIA)' },
  { renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 2070 SUPER Direct3D11)', vendor: 'Google Inc. (NVIDIA)' },
  { renderer: 'ANGLE (AMD, AMD Radeon RX 580 Direct3D11)', vendor: 'Google Inc. (AMD)' },
  { renderer: 'ANGLE (AMD, AMD Radeon(TM) Graphics Direct3D11)', vendor: 'Google Inc. (AMD)' },
  { renderer: 'ANGLE (Intel, Intel(R) HD Graphics 530 Direct3D11)', vendor: 'Google Inc. (Intel)' },
  { renderer: 'ANGLE (Apple, Apple M1 Pro, OpenGL 4.1)', vendor: 'Google Inc. (Apple)' },
  { renderer: 'ANGLE (Apple, Apple M2, OpenGL 4.1)', vendor: 'Google Inc. (Apple)' },
];

const SCREEN_PROFILES: Array<{ width: number; height: number; colorDepth: number }> = [
  { width: 1920, height: 1080, colorDepth: 24 },
  { width: 2560, height: 1440, colorDepth: 24 },
  { width: 1366, height: 768, colorDepth: 24 },
  { width: 1536, height: 864, colorDepth: 24 },
  { width: 1440, height: 900, colorDepth: 24 },
  { width: 1680, height: 1050, colorDepth: 24 },
  { width: 3840, height: 2160, colorDepth: 30 },
  { width: 2560, height: 1600, colorDepth: 24 },
];

const NAVIGATOR_PROFILES: Array<{
  hardwareConcurrency: number;
  deviceMemory: number;
  platform: string;
}> = [
  { hardwareConcurrency: 4, deviceMemory: 4, platform: 'Win32' },
  { hardwareConcurrency: 8, deviceMemory: 8, platform: 'Win32' },
  { hardwareConcurrency: 16, deviceMemory: 8, platform: 'Win32' },
  { hardwareConcurrency: 4, deviceMemory: 8, platform: 'MacIntel' },
  { hardwareConcurrency: 8, deviceMemory: 8, platform: 'MacIntel' },
  { hardwareConcurrency: 8, deviceMemory: 4, platform: 'Linux x86_64' },
  { hardwareConcurrency: 2, deviceMemory: 2, platform: 'Win32' },
  { hardwareConcurrency: 16, deviceMemory: 8, platform: 'MacIntel' },
];

const LANGUAGE_SETS: Array<{ language: string; languages: string[] }> = [
  { language: 'en-US', languages: ['en-US', 'en'] },
  { language: 'en-GB', languages: ['en-GB', 'en'] },
  { language: 'en-US', languages: ['en-US'] },
  { language: 'de-DE', languages: ['de-DE', 'de', 'en-US', 'en'] },
  { language: 'fr-FR', languages: ['fr-FR', 'fr', 'en-US', 'en'] },
  { language: 'es-ES', languages: ['es-ES', 'es', 'en'] },
];

function hash32(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s ^= s << 13;
    s ^= s >> 17;
    s ^= s << 5;
    return (s >>> 0) / 0xffffffff;
  };
}

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

export function generateProfile(domain: string, salt: string): FingerprintProfile {
  const seed = hash32(domain + '|' + salt);
  const rng = seededRandom(seed);

  const gpu = pick(GPU_PROFILES, rng);
  const screen = pick(SCREEN_PROFILES, rng);
  const nav = pick(NAVIGATOR_PROFILES, rng);
  const lang = pick(LANGUAGE_SETS, rng);

  return {
    webgl: { renderer: gpu.renderer, vendor: gpu.vendor },
    navigator: {
      hardwareConcurrency: nav.hardwareConcurrency,
      deviceMemory: nav.deviceMemory,
      platform: nav.platform,
      language: lang.language,
      languages: lang.languages,
    },
    screen: {
      width: screen.width,
      height: screen.height,
      colorDepth: screen.colorDepth,
      pixelDepth: screen.colorDepth,
    },
    audio: { noiseOffset: (rng() - 0.5) * 0.0001 },
    canvas: { noiseSeed: Math.floor(rng() * 0xffffffff) },
    clientRects: {
      offsetX: (rng() - 0.5) * 0.6,
      offsetY: (rng() - 0.5) * 0.6,
    },
  };
}

export { GPU_PROFILES, SCREEN_PROFILES, NAVIGATOR_PROFILES };
