import { readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Writes sw.js at the end of the build: the list of all built files goes into the service worker,
// so the whole app is saved on the first visit and works offline.
function serviceWorker(): Plugin {
  return {
    name: 'daz-alex-service-worker',
    apply: 'build',
    generateBundle(_options, bundle) {
      const built = Object.keys(bundle).filter((f) => !f.endsWith('.map'));
      const files = ['./', ...built, 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];
      const version = built.join('|').split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7).toString(36);
      const source = readFileSync('src/sw.template.js', 'utf8').replace("'daz-alex-__VERSION__'", `'daz-alex-${version}'`).replace('= __FILES__;', `= ${JSON.stringify(files)};`);
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

export default defineConfig({
  plugins: [react(), serviceWorker()],
  test: { environment: 'node' },
});
