import { expect, test } from '@playwright/test';

test.use({ reducedMotion: 'reduce' });

for (const width of [390, 1440]) {
  test(`north label pixels survive late webfont loading at ${width}px`, async ({ page }, testInfo) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.setViewportSize({ width, height: 950 });
    let releaseFonts!: () => void;
    const fontGate = new Promise<void>(resolve => { releaseFonts = resolve; });
    await page.route('**/*.woff2', async route => { await fontGate; await route.continue(); });
    try {
      await page.goto('/chapters/north/index.html', { waitUntil: 'domcontentloaded' });
      await page.locator('#introSkip').click();
      await expect(page.locator('#intro')).toHaveCount(0);
      const labels = page.locator('#stage > .place');
      for (const label of await labels.all()) await expect(label).toHaveCSS('opacity', '1');
      const cdp = await page.context().newCDPSession(page);
      const captureLabels = async () => {
        const images: string[] = [];
        for (const label of await labels.all()) {
          const box = (await label.locator('img').boundingBox())!;
          // 名牌是 rotate 过的，截图框四角会带上背景；背景在动，所以两边都往里缩几像素再比。
          const inset = 3;
          images.push((await cdp.send('Page.captureScreenshot', { format: 'png', clip: { x:box.x+inset,y:box.y+inset,width:box.width-inset*2,height:box.height-inset*2,scale:1 } })).data);
        }
        return images;
      };
      // Playwright element screenshots wait for fonts.ready; CDP captures the actual pre-swap pixels.
      const before = await captureLabels();
      releaseFonts();
      await page.evaluate(() => document.fonts.ready);
      // Include the original eight-second opening fallback and the repaint after font swap.
      await page.waitForTimeout(8500);
      const after = await captureLabels();
      for (const [i, pixels] of after.entries()) expect(pixels === before[i], `label ${i} pixels stay unchanged`).toBe(true);
      for (const label of await labels.all()) expect(await label.locator('img').evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`north-late-font-${width}.png`) });
    } finally { releaseFonts(); }
  });
}

for (const embedded of [false, true]) {
  test(`north map place labels remain readable and open cards ${embedded ? 'embedded' : 'standalone'}`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(embedded ? '/#/chapter/north' : '/chapters/north/index.html');
    const root = embedded ? page.frameLocator('iframe').locator('body') : page.locator('body');
    const labels = root.locator('#stage > .place');
    await expect(labels).toHaveText(['钟楼', '鼓楼', '万宁桥', '景山公园']);
    for (const viewport of [{width:320,height:844}, {width:390,height:844}, {width:768,height:1024}, {width:1024,height:768}, {width:1440,height:950}]) {
      await page.setViewportSize(viewport);
      for (const label of await labels.all()) {
        await expect(label).toBeVisible();
        expect(await label.locator('img').evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
        await label.click();
        await expect(root.locator('.pcard.on')).toBeVisible();
        await expect(root.locator('.pcard.on h4')).toHaveText((await label.textContent())!);
        await page.keyboard.press('Escape');
        await expect(root.locator('.pcard.on')).toHaveCount(0);
        await expect(label).toBeFocused();
      }
      await expect.poll(() => root.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (viewport.width === 390 || viewport.width === 1440) {
        await page.screenshot({path:testInfo.outputPath(`north-labels-${viewport.width}.png`)});
      }
    }
    await labels.first().focus();
    await page.keyboard.press('Enter');
    await expect(root.locator('.pcard.on')).toBeVisible();
    await page.keyboard.press('Escape');
    expect(errors).toEqual([]);
  });
}
