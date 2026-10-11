// Browser checks against the REPO dev server (mock mode). Usage: node browser-check.mjs [baseUrl]
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(new URL('../../package.json', import.meta.url));
const { chromium } = require('playwright');

const BASE = process.argv[2] || 'http://localhost:5173';
const SCREENS = process.env.SCREEN_DIR || new URL('./screens/', import.meta.url).pathname;
fs.mkdirSync(SCREENS, { recursive: true });
const results = [];
const check = (name, ok, detail = '') => results.push({ name, ok: !!ok, detail: String(detail).slice(0, 200) });

const browser = await chromium.launch();

async function open(w, h, hash) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 150)); });
  await page.goto(`${BASE}/#/${hash}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  return { page, errors };
}

// ── Routes: no runtime errors, no horizontal overflow ─────────
for (const [w, h] of [[390, 844], [1280, 800]]) {
  for (const route of ['', 'chat', 'gundua', 'spaces']) {
    const { page, errors } = await open(w, h, route);
    const ov = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    const label = `${w} #/${route || 'home'}`;
    check(`${label}: no page errors`, errors.filter((e) => !/favicon|Failed to load resource/.test(e)).length === 0,
      errors.slice(0, 2).join(' | '));
    check(`${label}: no horizontal overflow`, ov <= 0, `overflow=${ov}`);
    await page.close();
  }
}

// ── Chat (direct): mobile ─────────────────────────────────────
{
  const { page, errors } = await open(390, 844, 'chat');
  await page.waitForSelector('.psh-chat__row', { timeout: 20000 });
  const rows = await page.locator('.psh-chat__row').count();
  check('m390 chat rows render', rows >= 5, `rows=${rows}`);
  check('m390 no fabricated online dots', (await page.locator('.psh-chat__row .psh-chat__online').count()) === 0);
  check('m390 no gold Saved chip', (await page.locator('.psh-chat__row .psh-chip--gold').count()) === 0);
  const saved = await page.locator('.psh-chat__rel--saved').allInnerTexts();
  check('m390 Saved Contact chip', saved.some((t) => t.includes('Saved Contact')), JSON.stringify(saved));
  check('m390 PASIHAI Friend chip', (await page.locator('.psh-chat__rel--friend').count()) >= 1);
  const menu = await page.locator('.psh-chat__rowmenu').evaluateAll((els) => els.map((e) => {
    const r = e.getBoundingClientRect(); return [r.width, r.height];
  }));
  check('m390 row menu buttons >=44px', menu.length === rows && menu.every(([w, h]) => w >= 44 && h >= 44), JSON.stringify(menu.slice(0, 2)));
  const handleRow = page.locator('.psh-chat__row').filter({ hasNot: page.locator('.psh-chat__context') }).first();
  await handleRow.click();
  await page.waitForTimeout(800);
  const sub = await page.locator('.psh-chat__thead .psh-chat__theadsub').allInnerTexts();
  check('m390 direct thread header shows @handle', sub.some((t) => t.startsWith('@')), JSON.stringify(sub));
  check('m390 thread header no presence dot', (await page.locator('.psh-chat__thead .psh-chat__online').count()) === 0);

  // Archive from list (fresh page = fresh in-memory mock store)
  await page.close();
  const { page: p2 } = await open(390, 844, 'chat');
  await p2.waitForSelector('.psh-chat__row', { timeout: 20000 });
  const before = await p2.locator('.psh-chat__row').count();
  const name = (await p2.locator('.psh-chat__row .psh-chat__rowname').first().innerText()).trim();
  await p2.locator('.psh-chat__rowmenu').first().click();
  await p2.waitForTimeout(600);
  await p2.getByRole('button', { name: /Hifadhi \(Archive\)/ }).click();
  await p2.waitForTimeout(900);
  const after = await p2.locator('.psh-chat__row').count();
  const names = await p2.locator('.psh-chat__row .psh-chat__rowname').allInnerTexts();
  check('m390 archive removes row from inbox', after === before - 1 && !names.includes(name), `before=${before} after=${after} name=${name}`);
  await p2.locator('button[aria-label="Menyu zaidi za Chat"]').click();
  await p2.waitForTimeout(600);
  await p2.getByRole('button', { name: /Chats zilizohifadhiwa/ }).click();
  await p2.waitForTimeout(700);
  check('m390 archived chat reachable in Archived panel', (await p2.locator('body').innerText()).includes(name), name);
  await p2.screenshot({ path: `${SCREENS}m390-archived.png` });
  await p2.close();
  check('m390 chat: no page errors', errors.filter((e) => !/Failed to load resource/.test(e)).length === 0, errors.slice(0, 2).join(' | '));
}

// ── Chat (direct): desktop ────────────────────────────────────
{
  const { page, errors } = await open(1280, 800, 'chat');
  await page.waitForSelector('.psh-chat__row', { timeout: 20000 });
  const rows = await page.locator('.psh-chat__row').count();
  check('d1280 no fabricated online dots', (await page.locator('.psh-chat__row .psh-chat__online').count()) === 0);
  await page.locator('.psh-chat__rowmenu').first().click();
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: /Hifadhi \(Archive\)/ }).click();
  await page.waitForTimeout(900);
  check('d1280 archive removes row', (await page.locator('.psh-chat__row').count()) === rows - 1);
  await page.screenshot({ path: `${SCREENS}d1280-after-archive.png` });
  check('d1280 chat: no page errors', errors.filter((e) => !/Failed to load resource/.test(e)).length === 0, errors.slice(0, 2).join(' | '));
  await page.close();
}

await browser.close();
const pass = results.filter((r) => r.ok).length;
console.log(JSON.stringify({ pass, total: results.length, results }, null, 2));
process.exit(pass === results.length ? 0 : 1);
