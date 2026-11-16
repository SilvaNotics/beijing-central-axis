import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });

for (const region of ['north', 'central', 'south']) {
  test(`${region} map is usable while chapter media is still loading`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    let pendingMedia = 0;
    await page.route(/\.(mp3|mp4)(\?|$)/, async route => {
      pendingMedia++;
      await gate;
      await route.abort();
    });
    try {
      await page.goto(`/#/chapter/${region}`, { waitUntil: 'domcontentloaded' });
      const root = page.frameLocator('iframe');
      const image = root.locator(region === 'north' ? '#map' : region === 'central' ? '.map-img' : '#mapImage');
      await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
      await expect.poll(() => pendingMedia).toBeGreaterThan(0);
      await expect(page.locator('.chapter-loading')).toHaveCount(0);
      expect(await root.locator('body').evaluate(() => document.readyState)).toBe('interactive');
      const entry = root.locator(region === 'north' ? '.people button' : region === 'central' ? '.pin' : '.destination').first();
      await entry.click();
      await expect(root.locator(region === 'north' ? '#dlg' : region === 'central' ? '#modal' : '#story')).toBeVisible();
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: '重新载入', exact: true }).click();
      await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
      await expect(page.locator('.chapter-loading')).toHaveCount(0);
      await page.getByRole('button', { name: '返回中轴总览', exact: true }).click();
      await expect(page).toHaveURL(url => url.hash === '#/');
      expect(errors).toEqual([]);
    } finally { release(); }
  });
}
