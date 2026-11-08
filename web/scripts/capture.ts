/**
 * With a seeded app already running:
 *   cd web && npx tsx scripts/capture.ts [http://localhost:3000]
 * Install the browser once if needed: npx playwright install chromium
 * Captures the real UI without generating reports or changing backend data.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";
import { chromium, expect, type Page } from "@playwright/test";
import { GIFEncoder, applyPalette, quantize } from "gifenc";
import { PNG } from "pngjs";

const assets = resolve(dirname(fileURLToPath(import.meta.url)), "../../assets");
const screenshots = resolve(assets, "screenshots");
const baseUrl = process.argv[2] ?? "http://localhost:3000";
const FPS = 12;
const DURATION_MS = 6_000;
const GIF_WIDTH = 900;
const MAX_GIF_BYTES = 5_000_000;

type Frame = { rgba: Uint8Array; width: number; height: number; time: number };

// Box-average the decoded device-pixel PNG to keep text and thin traces legible.
function downscale(png: PNG): Omit<Frame, "time"> {
  if (png.width < GIF_WIDTH) throw new Error("Live card is narrower than 900 device pixels.");
  const width = GIF_WIDTH;
  const height = Math.round(png.height * width / png.width);
  const rgba = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    const y0 = Math.floor(y * png.height / height);
    const y1 = Math.floor((y + 1) * png.height / height);
    for (let x = 0; x < width; x++) {
      const x0 = Math.floor(x * png.width / width);
      const x1 = Math.floor((x + 1) * png.width / width);
      let r = 0, g = 0, b = 0;
      for (let sy = y0; sy < y1; sy++) {
        for (let sx = x0; sx < x1; sx++) {
          const offset = (sy * png.width + sx) * 4;
          const alpha = png.data[offset + 3] / 255;
          r += png.data[offset] * alpha + 255 * (1 - alpha);
          g += png.data[offset + 1] * alpha + 255 * (1 - alpha);
          b += png.data[offset + 2] * alpha + 255 * (1 - alpha);
        }
      }
      const count = (x1 - x0) * (y1 - y0);
      const offset = (y * width + x) * 4;
      rgba[offset] = Math.round(r / count);
      rgba[offset + 1] = Math.round(g / count);
      rgba[offset + 2] = Math.round(b / count);
      rgba[offset + 3] = 255;
    }
  }
  return { rgba, width, height };
}

async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  // Ignore inactive sections: they remain mounted to preserve their state.
  const loading = page.locator('.animate-pulse:visible, [aria-busy="true"]:visible')
    .and(page.locator(':not([inert]):not([inert] *):not([aria-hidden="true"]):not([aria-hidden="true"] *)'));
  await expect(loading).toHaveCount(0, { timeout: 30_000 });
  // Recharts and the section springs need time after their skeletons unmount.
  await page.waitForTimeout(1_500);
  await expect(loading).toHaveCount(0, { timeout: 30_000 });
}

async function section(page: Page, name: string) {
  await page.getByRole("button", { name, exact: true }).filter({ visible: true }).click();
  await page.mouse.move(1430, 890);
  await page.evaluate(() => window.scrollTo(0, 0));
  await settle(page);
}

async function screenshot(page: Page, name: string) {
  const path = resolve(screenshots, `${name}.png`);
  await page.screenshot({ path, type: "png", fullPage: false, animations: "allow" });
  console.log(`Wrote ${path}`);
}

async function captureReplay(page: Page) {
  await page.keyboard.press("s");
  const badge = page.getByRole("status").filter({ hasText: "Replay: PhysioNet" });
  const card = page.locator("section").filter({ has: badge }).filter({ visible: true });
  await expect(card).toHaveCount(1);
  await card.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1_500);
  const frames: Frame[] = [];
  const started = performance.now();
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 50));
  for (let slot = 0; slot < FPS * DURATION_MS / 1000; slot++) {
    await page.clock.runFor(1000 / FPS);
    const png = await card.screenshot({ type: "png", animations: "allow" });
    frames.push({ ...downscale(PNG.sync.read(png)), time: slot * 1000 / FPS });
  }
  await page.clock.resume();
  if (frames.length < 2) throw new Error("Too few replay frames captured.");
  console.log(`Captured ${frames.length} frames in ${(performance.now() - started).toFixed(0)} ms (target: 12 fps).`);

  const { width, height } = frames[0];
  if (frames.some(frame => frame.width !== width || frame.height !== height)) {
    throw new Error("Live card changed size during capture; rerun after the UI settles.");
  }
  // Sample across the entire sequence for a single palette, avoiding color flicker.
  const samples = frames.filter((_, i) => i % Math.max(1, Math.floor(frames.length / 6)) === 0);
  const sample = Buffer.concat(samples.map(frame => Buffer.from(frame.rgba)));
  for (const colors of [128, 64, 32, 16]) {
    const palette = quantize(sample, colors);
    const gif = GIFEncoder();
    frames.forEach((frame, i) => {
      const nextTime = frames[i + 1]?.time ?? DURATION_MS;
      // GIF delays use centiseconds; round boundaries to avoid cumulative drift.
      const delay = Math.max(10, (Math.round(nextTime / 10) - Math.round(frame.time / 10)) * 10);
      gif.writeFrame(applyPalette(frame.rgba, palette), width, height, {
        ...(i === 0 ? { palette, repeat: 0 } : {}), delay,
      });
    });
    gif.finish();
    const bytes = gif.bytes();
    if (bytes.length <= MAX_GIF_BYTES) {
      const path = resolve(assets, "live-replay.gif");
      await writeFile(path, bytes);
      console.log(`Wrote ${path} (${(bytes.length / 1_000_000).toFixed(2)} MB, ${colors} colors)`);
      return;
    }
  }
  throw new Error("GIF exceeds 5 MB even at 16 colors; no oversized GIF was written.");
}

async function main() {
  await mkdir(screenshots, { recursive: true });
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
      reducedMotion: "no-preference",
      colorScheme: "light",
    });
    const page = await context.newPage();
    await page.clock.install();
    page.setDefaultTimeout(30_000);
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await page.getByRole("radio", { name: "Family", exact: true }).filter({ visible: true }).click();
    await section(page, "Today");
    await screenshot(page, "family-today");
    await section(page, "Week");
    await screenshot(page, "family-week");

    await page.getByRole("radio", { name: "Physician", exact: true }).filter({ visible: true }).click();
    await section(page, "Overview");
    await captureReplay(page);
    // Restart after encoding so the overview always contains an active trace.
    await page.keyboard.press("s");
    await page.waitForTimeout(6_000);
    await page.evaluate(() => window.scrollTo(0, 0));
    await screenshot(page, "physician-overview");

    await section(page, "Patterns");
    await page.keyboard.press("s");
    await page.waitForTimeout(16_000);
    await settle(page);
    const filledCells = page.getByRole("img", { name: /stride-derived demo/ }).filter({ visible: true });
    await expect(filledCells).toHaveCount(36);
    // Middle hour of the penultimate day. Hover the group so its near-trip dot
    // (when present) is also an accepted pointer target.
    const cell = filledCells.nth(9);
    await cell.scrollIntoViewIfNeeded();
    await cell.hover();
    await expect(page.getByRole("tooltip")).toBeVisible();
    await page.waitForTimeout(500);
    await screenshot(page, "physician-patterns");

    for (const name of ["Forecast", "Progression", "Reports"]) {
      await section(page, name);
      await screenshot(page, `physician-${name.toLowerCase()}`);
    }
  } finally {
    await browser.close();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
