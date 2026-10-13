// Offline check: opens the built app, waits until it is saved, goes offline, reloads and opens Practice.
// Run with: npm run offline   (needs a build in dist/ and the Playwright browser; set CHROMIUM_PATH if needed)
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const PORT = 5197;

async function main() {
  const server = spawn('npx', ['vite', 'preview', '--outDir', 'dist', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
  try {
    for (let i = 0; i < 60; i++) {
      try { if ((await fetch(`http://localhost:${PORT}`)).ok) break; } catch { /* not ready yet */ }
      await new Promise((r) => setTimeout(r, 500));
    }
    const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox', '--no-proxy-server'] });
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`http://localhost:${PORT}`);
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
    await page.waitForTimeout(1500);
    await context.setOffline(true);
    await page.reload();
    await page.getByRole('button', { name: 'Trainieren', exact: true }).first().click();
    await page.locator('.merke').waitFor({ timeout: 5000 });
    console.log('The app opens offline.');
    await browser.close();
  } finally {
    server.kill();
  }
}

main().catch((e) => { console.error('The app does NOT open offline.', e); process.exitCode = 1; });
