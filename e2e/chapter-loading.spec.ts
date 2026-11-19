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

test('north plays the original opening video in the atlas and allows skipping', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const videoRequests: string[] = [];
  page.on('request', request => {
    if (new URL(request.url()).pathname.endsWith('/intro_book.mp4')) videoRequests.push(request.url());
  });
  await page.goto('/#/chapter/north', { waitUntil: 'domcontentloaded' });
  const frame = page.frameLocator('iframe');
  const start = frame.getByRole('button', { name: '点一下，翻开' });
  await expect(start).toBeVisible();
  expect(videoRequests).toEqual([]);
  await start.click();
  await expect.poll(() => frame.locator('#introV').evaluate((video: HTMLVideoElement) => video.currentTime)).toBeGreaterThan(0);
  await frame.getByRole('button', { name: '跳过开场' }).click();
  await expect(frame.locator('#intro')).toHaveCount(0);
  await frame.locator('.people button').last().click();
  await expect(frame.locator('#dlg')).toBeVisible();
});

test('south keeps its scroll opening and defers portraits until entering a story', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const portraitRequests: string[] = [];
  page.on('request', request => {
    const path = new URL(request.url()).pathname;
    if (path.includes('/assets/portraits/')) portraitRequests.push(path);
  });
  await page.goto('/#/chapter/south', { waitUntil: 'domcontentloaded' });
  const frame = page.frameLocator('iframe');
  await expect(frame.locator('.axis-fixed-roll-cover canvas')).toBeVisible();
  await frame.getByRole('button', { name: '跳过开场 · Esc' }).click();
  await expect(frame.locator('.axis-fixed-roll-cover')).toHaveCount(0);
  await frame.locator('#mapImage').evaluate((img: HTMLImageElement) => img.decode());
  expect(portraitRequests).toEqual([]);
  await frame.locator('.spot').last().click();
  await expect(frame.locator('#story')).toBeVisible({ timeout: 15_000 });
  await expect(frame.locator('#portrait')).toBeVisible();
  await frame.locator('#portrait').evaluate((img: HTMLImageElement) => img.decode());
  expect(portraitRequests).toEqual([expect.stringContaining('/assets/portraits/yongdingmen.png')]);
});
