// Accessibility check (axe) for every screen of the app, in German, on the yellow and the white background.
// Run with: npm run a11y   (needs the Playwright browser; set CHROMIUM_PATH if it is not found)
// It builds the app with drafts shown, serves it, opens each screen and lists everything axe finds
// against WCAG 2.2 level A and AA.
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { chromium, type Page } from 'playwright';

const PORT = 5198;
const OUT = '.a11y-dist';
const axeSource = readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

interface Finding { screen: string; rule: string; impact: string; help: string; target: string; html: string }
const findings: Finding[] = [];
let screens = 0;

async function scan(page: Page, screen: string) {
  screens++;
  await page.evaluate(axeSource); // makes window.axe available
  const result = await page.evaluate(async (tags) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await (window as any).axe.run(document, { runOnly: { type: 'tag', values: tags } });
  }, TAGS);
  for (const v of result.violations) {
    for (const n of v.nodes) {
      findings.push({ screen, rule: v.id, impact: v.impact ?? '', help: v.help, target: n.target.join(' '), html: n.html.slice(0, 140) });
    }
  }
}

async function main() {
  const build = spawnSync('npx', ['vite', 'build', '--outDir', OUT, '--emptyOutDir'], { env: { ...process.env, VITE_SHOW_DRAFTS: '1' }, stdio: 'ignore' });
  if (build.status !== 0) throw new Error('The build failed. Run npm run build to see why.');
  const server = spawn('npx', ['vite', 'preview', '--outDir', OUT, '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
  try {
    for (let i = 0; i < 60; i++) {
      try { if ((await fetch(`http://localhost:${PORT}`)).ok) break; } catch { /* not ready yet */ }
      await new Promise((r) => setTimeout(r, 500));
    }
    const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox'] });
    const page = await browser.newPage({ viewport: { width: 360, height: 800 } });
    page.setDefaultTimeout(5000);

    const lang = 'de';
    for (const theme of ['yellow', 'white'] as const) {
      const L = { understand: 'Verstehen', practice: 'Trainieren', areas: ['Lesen', 'Grammatik', 'Wortschatz'] };
      const fresh = async () => {
        await page.goto(`http://localhost:${PORT}`);
        if (theme === 'white') await page.getByRole('button', { name: 'Weißer Hintergrund' }).click();
      };

      // Understand: the list and every topic
      await fresh();
      await page.getByRole('button', { name: L.understand, exact: true }).first().click();
      await scan(page, `${theme} ${lang} · Understand list`);
      const topics = await page.locator('.tcard h3').allTextContents();
      for (let k = 0; k < topics.length; k++) {
        await fresh();
        await page.getByRole('button', { name: L.understand, exact: true }).first().click();
        await page.locator('.tcard').nth(k).click();
        await scan(page, `${theme} ${lang} · Understand · ${topics[k]}`);
      }

      // Practice: the menu, every area and every training with every task tab
      const openArea = async (area: string, level?: string) => {
        await fresh();
        await page.getByRole('button', { name: L.practice, exact: true }).first().click();
        await page.locator('.areatabs').first().getByRole('button', { name: area, exact: true }).click();
        if (level) await page.locator('.areatabs.sub').getByRole('button', { name: level, exact: true }).click();
      };
      for (const [ai, area] of L.areas.entries()) {
        for (const level of ai === 1 ? [undefined] : ['A1', 'A2', 'B1']) {
          await openArea(area, level);
          await scan(page, `${theme} ${lang} · Practice menu · ${area}${level ? ' ' + level : ''}`);
          const count = await page.locator('.tcard').count();
          for (let k = 0; k < count; k++) {
            await openArea(area, level);
            const title = (await page.locator('.tcard h3').nth(k).textContent()) ?? String(k);
            await page.locator('.tcard').nth(k).click();
            const tabs = page.locator('.subtabs button');
            const n = await tabs.count();
            // white background: first task of each training is enough (the colours are the same on every task)
            for (let t = 0; t < (theme === 'white' ? Math.min(n, 1) : n); t++) {
              await tabs.nth(t).click();
              await scan(page, `${theme} ${lang} · Practice · ${title} · task ${t + 1}`);
            }
          }
        }
      }
    }
    await browser.close();
  } finally {
    server.kill();
  }

  // Report: one line per rule, with the screens it appears on
  const byRule = new Map<string, Finding[]>();
  for (const f of findings) byRule.set(f.rule, [...(byRule.get(f.rule) ?? []), f]);
  console.log(`Checked ${screens} screens.`);
  if (!byRule.size) return console.log('axe found no problems.');
  for (const [rule, list] of byRule) {
    const screensOf = [...new Set(list.map((f) => f.screen))];
    console.log(`\n[${list[0].impact}] ${rule}: ${list[0].help} (${list.length} places on ${screensOf.length} screens)`);
    console.log(`  e.g. ${screensOf[0]}\n  ${list[0].target}\n  ${list[0].html}`);
  }
  process.exitCode = 1;
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
