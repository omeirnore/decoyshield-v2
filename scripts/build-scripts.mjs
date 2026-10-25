import { build } from 'vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { cpSync, existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const entries = [
  { entry: 'src/background/service-worker.ts', name: 'ServiceWorker', fileName: 'service-worker.js' },
  { entry: 'src/content/isolated/config-bridge.ts', name: 'ConfigBridge', fileName: 'content/isolated/config-bridge.js' },
  { entry: 'src/content/main-world/fingerprint-injector.ts', name: 'FingerprintInjector', fileName: 'content/main-world/fingerprint-injector.js' },
];

for (const { entry, name, fileName } of entries) {
  await build({
    configFile: false,
    resolve: {
      alias: { '@': resolve(root, 'src') },
    },
    build: {
      outDir: resolve(root, 'dist'),
      emptyOutDir: false,
      lib: {
        entry: resolve(root, entry),
        name,
        formats: ['iife'],
        fileName: () => fileName,
      },
    },
  });
}

const rulesDir = resolve(root, 'rules');
if (existsSync(rulesDir)) {
  cpSync(rulesDir, resolve(root, 'dist', 'rules'), { recursive: true });
}
