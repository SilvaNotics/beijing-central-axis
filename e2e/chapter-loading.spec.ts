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
      // 媒体被 abort 之后解析本就收尾了（complete），这里只要求解析没卡在 loading：
      // 「边下边可用」由上面的 pendingMedia > 0 与遮罩已撤来守。
      expect(await root.locator('body').evaluate(() => document.readyState)).not.toBe('loading');
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

for (const region of ['north', 'south']) {
  test(`${region} embedded map skips its blocking opening and defers story media`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    const eagerStoryRequests: string[] = [];
    page.on('request', request => {
      const path = new URL(request.url()).pathname;
      if (/\/intro_book\.mp4$|\/assets\/portraits\//.test(path)) eagerStoryRequests.push(path);
    });
    await page.goto(`/#/chapter/${region}`, { waitUntil: 'domcontentloaded' });
    const frame = page.frameLocator('iframe');
    const image = frame.locator(region === 'north' ? '#map' : '#mapImage');
    await image.evaluate((img: HTMLImageElement) => img.decode());
    await expect(frame.locator('#intro, .axis-fixed-roll-cover')).toHaveCount(0);
    const target = frame.locator(region === 'north' ? '.people button' : '.spot').last();
    await target.click({ trial: true });
    expect(eagerStoryRequests).toEqual([]);
    if (region === 'south') {
      // The closest destination demonstrates both walking and deferred portrait loading.
      await target.click();
      await expect(frame.locator('#story')).toBeVisible({ timeout: 15_000 });
      await expect(frame.locator('#portrait')).toBeVisible();
      await frame.locator('#portrait').evaluate((img: HTMLImageElement) => img.decode());
      expect(eagerStoryRequests).toEqual([expect.stringContaining('/assets/portraits/yongdingmen.png')]);
    }
  });
}
