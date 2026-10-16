// Screenshots every specimen on /admin/design, light and dark side by side,
// as images/<specimen-id>.png. Needs a running stack (apps/scripts/otr up)
// and Playwright's Chromium (bunx playwright install chromium), or a
// Chromium binary named by CHROMIUM_PATH. When ImageMagick is installed, each
// image is reduced to a 256-colour palette, which is about a third of the size
// and looks the same.
//
//   node .claude/skills/web-design/scripts/capture-specimens.mjs [outDir] [--only <id-prefix>]
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../../../..');
const args = process.argv.slice(2);
const option = (name) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? undefined : args[i + 1];
};
const outDir = path.resolve(
  args[0] && !args[0].startsWith('--') ? args[0] : path.join(here, '../images')
);
const only = option('only') ?? '';

/** The stack's URL: OTR_WEB, or the block `otr up` writes into the root .env. */
function baseUrl() {
  if (process.env.OTR_WEB) return process.env.OTR_WEB;
  const env = fs.readFileSync(path.join(repoRoot, '.env'), 'utf8');
  const match = env.match(/^INTERNAL_APP_BASE_URL=(.+)$/m);
  if (!match) throw new Error('Set OTR_WEB or run apps/scripts/otr up first.');
  return match[1].trim();
}

const base = baseUrl();
fs.mkdirSync(outDir, { recursive: true });

// CHROMIUM_PATH points at another Chromium when Playwright's own isn't installed.
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  colorScheme: 'dark',
  deviceScaleFactor: 1,
});
// The dev server can tell pages to reload in a loop; drop those messages so
// the page hydrates and stays put.
await context.routeWebSocket(/_next\/(webpack-)?hmr/, (ws) => {
  const server = ws.connectToServer();
  server.onMessage((message) => {
    if (!/"reloadPage"|"type":"restart"/.test(String(message)))
      ws.send(message);
  });
  ws.onMessage((message) => server.send(message));
});
await context.addInitScript(() => {
  try {
    localStorage.setItem('theme', 'dark');
  } catch {}
});
const signIn = await context.request.post(`${base}/api/auth/e2e/sign-in`, {
  data: { playerId: 3616, admin: true },
});
if (!signIn.ok()) throw new Error(`Sign-in failed with ${signIn.status()}.`);

const page = await context.newPage();
await page.goto(`${base}/admin/design`, {
  waitUntil: 'load',
  timeout: 120_000,
});
await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
// Charts animate on mount and restart when the viewport changes, so grow the
// viewport to the full page first, then let them settle.
const height = await page.evaluate(() => document.documentElement.scrollHeight);
await page.setViewportSize({ width: 1440, height: Math.min(height, 32_000) });
await page.waitForTimeout(3000);

const ids = await page.$$eval('[data-specimen]', (elements) =>
  elements.map((element) => element.getAttribute('data-specimen'))
);
let captured = 0;
for (const id of ids) {
  if (!id || !id.startsWith(only)) continue;
  const file = path.join(outDir, `${id}.png`);
  await page.locator(`[data-specimen="${id}"]`).screenshot({ path: file });
  // Dithering speckles dark surfaces, so quantize without it.
  spawnSync('magick', [
    file,
    '-dither',
    'None',
    '-colors',
    '256',
    `PNG8:${file}`,
  ]);
  captured++;
}
console.log(`Captured ${captured} of ${ids.length} specimens into ${outDir}`);
await browser.close();
