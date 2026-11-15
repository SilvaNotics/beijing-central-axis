import { expect, test } from '@playwright/test';

test.use({ reducedMotion: 'reduce' });

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
        expect(await label.evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(viewport.width <= 900 ? 14 : 16);
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
