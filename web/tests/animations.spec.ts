import { expect, test, type Page } from '@playwright/test';

const MAX_FRAME_GAP_MS = Number(process.env.MAX_FRAME_GAP_MS ?? 120);

async function startFrames(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __frames: number[]; __run: boolean };
    w.__frames = [];
    w.__run = true;
    let last = performance.now();
    const tick = (t: number) => {
      w.__frames.push(t - last);
      last = t;
      if (w.__run) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

async function stopFrames(page: Page) {
  return page.evaluate(() => {
    const w = window as unknown as { __frames: number[]; __run: boolean };
    w.__run = false;
    const gaps = w.__frames.slice(1);
    return { frames: gaps.length, maxGap: Math.round(Math.max(0, ...gaps)), dropped: gaps.filter(g => g > 34).length };
  });
}

async function smooth(page: Page, name: string, action: () => Promise<void>, settle = 700) {
  await startFrames(page);
  await action();
  await page.waitForTimeout(settle);
  const stats = await stopFrames(page);
  test.info().annotations.push({ type: 'frames', description: `${name}: max gap ${stats.maxGap} ms, ${stats.dropped}/${stats.frames} dropped` });
  expect.soft(stats.maxGap, `${name} longest frame`).toBeLessThan(MAX_FRAME_GAP_MS);
}

async function mode(page: Page, name: 'Family' | 'Physician') {
  await page.getByRole('radiogroup', { name: "View" }).getByRole('radio', { name }).click();
}

async function nearTrip(page: Page) {
  const time = new Date().toISOString();
  const res = await page.request.post('/api/ingest', {
    data: { samples: [], events: [{ time, type: 'near_trip', severity: 2, message: 'Possible near-trip on stairs', terrain: 'stairs_up' }] },
  });
  expect(res.ok()).toBeTruthy();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByRole('radiogroup', { name: "View" })).toBeVisible();
  await page.waitForLoadState('networkidle');
  await mode(page, 'Physician');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  await mode(page, 'Family');
  await page.waitForTimeout(1000);
});

test('mode switch fades between views both ways', async ({ page }) => {
  await smooth(page, 'to physician', () => mode(page, 'Physician'));
  await expect(page.getByRole('heading', { name: 'Alex Chen' })).toBeVisible();
  await smooth(page, 'to family', () => mode(page, 'Family'));
  await expect(page.getByRole('heading', { name: 'Alex Chen' })).toBeHidden();
  await smooth(page, 'back to physician', () => mode(page, 'Physician'));
  await expect(page.getByRole('heading', { name: 'Alex Chen' })).toBeVisible();
});

test('live trace scrolls every frame without blank or backward frames', async ({ page }) => {
  await mode(page, 'Physician');
  const canvas = page.getByRole('img', { name: 'Live ankle angle trace' });
  await expect(canvas).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(11_000);
  const result = await canvas.evaluate(async (el: HTMLCanvasElement) => {
    const ctx = el.getContext('2d')!;
    const { width, height } = el;
    const gutter = Math.round(30 * (width / el.clientWidth));
    const cols = Array.from({ length: 24 }, (_, i) => gutter + Math.floor(((width - gutter - 2) * (i + 0.5)) / 24));
    const lineRows = (x: number) => {
      const data = ctx.getImageData(x, 0, 1, height).data;
      for (let y = 0; y < height; y++) if (data[y * 4 + 3] > 200 && data[y * 4] > 200 && data[y * 4 + 1] < 160) return y;
      return -1;
    };
    let frames = 0, blank = 0, still = 0, prev = '', prevHits = -1;
    await new Promise<void>(done => {
      const start = performance.now();
      const tick = (t: number) => {
        const sig = cols.map(lineRows);
        const hits = sig.filter(y => y >= 0).length;
        frames++;
        if (prevHits > 0 && hits < prevHits / 2) blank++;
        prevHits = hits;
        const key = sig.join(',');
        if (key === prev) still++;
        prev = key;
        if (t - start < 6000) requestAnimationFrame(tick);
        else done();
      };
      requestAnimationFrame(tick);
    });
    return { frames, blank, still };
  });
  test.info().annotations.push({ type: 'trace', description: JSON.stringify(result) });
  expect(result.blank, 'blank trace frames').toBe(0);
  expect(result.still / result.frames, 'share of frames where trace did not move').toBeLessThan(0.15);
});

test('range picker updates KPI deltas', async ({ page }) => {
  await mode(page, 'Physician');
  const range = page.getByRole('radiogroup', { name: 'Range' });
  for (const [label, short] of [['7 days', '7 d'], ['90 days', '90 d'], ['30 days', '30 d']] as const) {
    await smooth(page, `range ${label}`, () => range.getByRole('radio', { name: label }).click());
    await expect(page.getByText(new RegExp(`prev(ious)? ${short}`)).first()).toBeVisible();
  }
});

test('event filter chips switch quickly', async ({ page }) => {
  await mode(page, 'Physician');
  const group = page.getByRole('group', { name: 'Filter events' });
  for (const name of ['Near-trip', 'Fall', 'Assist change', 'Stairs', 'All']) {
    await smooth(page, `chip ${name}`, () => group.getByRole('button', { name, exact: true }).click(), 400);
    await expect(group.getByRole('button', { name, exact: true })).toHaveAttribute('aria-pressed', 'true');
  }
});

test('add visit form expands and collapses', async ({ page }) => {
  await mode(page, 'Physician');
  const toggle = page.getByRole('button', { name: 'Add visit' });
  await smooth(page, 'expand add visit', () => toggle.click());
  await expect(page.getByRole('button', { name: 'Close' }).first()).toHaveAttribute('aria-expanded', 'true');
  await smooth(page, 'collapse add visit', () => page.getByRole('button', { name: 'Close' }).first().click());
  await expect(page.getByRole('button', { name: 'Add visit' })).toHaveAttribute('aria-expanded', 'false');
});

test('report side sheet slides in and out with a visible close icon', async ({ page }) => {
  await mode(page, 'Physician');
  await smooth(page, 'open report sheet', () => page.getByRole('button', { name: /to Nov|to [A-Z][a-z]{2} \d/ }).first().click());
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const icon = dialog.getByRole('button', { name: 'Close' }).locator('svg');
  const box = await icon.boundingBox();
  expect(box?.width, 'close icon width').toBeGreaterThan(8);
  await smooth(page, 'close report sheet', () => dialog.getByRole('button', { name: 'Close' }).click());
  await expect(dialog).toBeHidden();
  await page.getByRole('button', { name: /to Nov|to [A-Z][a-z]{2} \d/ }).first().click();
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

test('near-trip sheet drops in for family and dismisses', async ({ page }) => {
  await startFrames(page);
  await nearTrip(page);
  const sheet = page.getByRole('alertdialog');
  await expect(sheet).toBeVisible({ timeout: 5000 });
  await expect(page.getByRole('heading', { level: 1, name: /trip/i }).last()).toBeVisible();
  await page.waitForTimeout(500);
  const stats = await stopFrames(page);
  expect.soft(stats.maxGap, 'near-trip sheet longest frame').toBeLessThan(MAX_FRAME_GAP_MS);
  await smooth(page, 'dismiss near-trip', () => sheet.getByRole('button', { name: "I've checked in" }).click());
  await expect(sheet).toBeHidden();
});

test('reduced motion still switches modes and opens sheets', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mode(page, 'Physician');
  await expect(page.getByRole('heading', { name: 'Alex Chen' })).toBeVisible();
  await page.getByRole('button', { name: /to Nov|to [A-Z][a-z]{2} \d/ }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await mode(page, 'Family');
  await expect(page.getByRole('heading', { level: 1 }).last()).toBeVisible();
});
