import { expect, test } from '@playwright/test';

test('physician replay stays local, restarts, and returns to live', async ({ page }) => {
  const writes: string[] = [];
  page.on('request', request => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())) writes.push(request.url());
  });
  await page.addInitScript(() => localStorage.setItem('afo-mode', 'physician'));
  await page.goto('/');
  await page.getByRole('button', { name: 'Overview', exact: true }).click();
  const badge = page.getByText('Replay: PhysioNet ALS record als1');
  await page.keyboard.press('Control+s');
  await expect(badge).toHaveCount(0);
  await page.evaluate(() => {
    const input = document.createElement('input');
    input.id = 'replay-test-input';
    document.body.append(input);
    input.focus();
  });
  await page.keyboard.press('s');
  await expect(badge).toHaveCount(0);
  await page.locator('#replay-test-input').evaluate(el => el.remove());
  await page.clock.install();
  await page.keyboard.press('s');
  await expect(badge).toBeVisible();
  await page.getByRole('button', { name: 'Patterns', exact: true }).click();
  const filled = page.locator('svg g[aria-label*="stride-derived demo"]');
  await page.clock.fastForward(15_000);
  await expect(filled).toHaveCount(36);
  const cell = filled.last();
  await cell.hover();
  await expect(page.getByRole('tooltip')).toContainText('cm avg clearance');
  await expect(page.getByRole('tooltip')).toContainText('Near-trips:');
  await cell.focus();
  await page.keyboard.press('Escape');
  // The fake clock freezes the tooltip's exit animation, so check the cleared hover state instead.
  await expect(cell).not.toHaveAttribute('aria-describedby');
  await page.keyboard.press('s');
  await expect(filled).toHaveCount(0);
  await page.clock.fastForward(61_000);
  await expect(filled).toHaveCount(36);
  await page.getByRole('button', { name: 'Overview', exact: true }).click();
  await expect(badge).toHaveCount(0);
  await page.getByRole('radiogroup', { name: 'View' }).getByRole('radio', { name: 'Family', exact: true }).click();
  await page.keyboard.press('s');
  await expect(badge).toHaveCount(0);
  expect(writes).toEqual([]);
  await page.reload();
  await page.getByRole('button', { name: 'Patterns', exact: true }).click();
  await expect(filled).toHaveCount(0);
});
