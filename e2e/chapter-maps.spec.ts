import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });

for (const embedded of [false, true]) {
  for (const region of ['central', 'south']) {
    test(`${region} map stays readable ${embedded ? 'inside the atlas' : 'standalone'}`, async ({ page }, testInfo) => {
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(embedded ? `/#/chapter/${region}` : `/chapters/${region}/index.html`);
      const root = embedded ? page.frameLocator('iframe').locator('body') : page.locator('body');
      const image = root.locator(region === 'central' ? '.map-img' : '#mapImage');
      await expect(image).toBeVisible();
      await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
      for (const viewport of [
        { width: 320, height: 844 }, { width: 390, height: 667 },
        { width: 390, height: 844 }, { width: 768, height: 1024 },
        { width: 820, height: 844 }, { width: 844, height: 390 },
        { width: 1440, height: 950 },
      ]) {
        await page.setViewportSize(viewport);
        await expect.poll(() => root.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        if (viewport.width <= 820) {
          if (region === 'central') {
            const canvas = root.locator('.canvas');
            await expect.poll(async () => {
              const available = (await canvas.boundingBox())!;
              const map = (await image.boundingBox())!;
              return Math.abs(map.width - Math.min(available.width, available.height));
            }).toBeLessThan(4);
            expect((await root.locator('.colophon').boundingBox())!.height).toBeLessThanOrEqual(44);
          } else {
            const scroller = root.locator('.map-viewport');
            await expect.poll(async () => (await image.boundingBox())!.width).toBeLessThanOrEqual(viewport.width);
            await root.locator('#mapZoom').click();
            await expect(root.locator('#mapZoom')).toHaveAttribute('aria-pressed', 'true');
            expect((await image.boundingBox())!.width).toBeGreaterThanOrEqual(758);
            await expect.poll(() => scroller.evaluate(el => Math.abs(el.scrollLeft - (el.scrollWidth - el.clientWidth) / 2))).toBeLessThan(45);
            if (await scroller.evaluate(el => el.scrollWidth > el.clientWidth)) {
              const before = await scroller.evaluate(el => el.scrollLeft);
              await scroller.focus();
              await page.keyboard.press('ArrowRight');
              await expect.poll(() => scroller.evaluate(el => el.scrollLeft)).toBeGreaterThan(before);
            }
            await root.locator('#mapZoom').click();
            await expect(root.locator('#mapZoom')).toHaveAttribute('aria-pressed', 'false');
            await expect.poll(() => scroller.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
          }
          for (const pin of await root.locator(region === 'central' ? '.pin' : '.spot').all()) {
            const box = (await pin.boundingBox())!;
            expect(box.width).toBeGreaterThanOrEqual(44);
            expect(box.height).toBeGreaterThanOrEqual(44);
          }
        }
        if (viewport.width === 390 && viewport.height === 844) {
          await page.screenshot({ path: testInfo.outputPath(`${region}-${embedded ? 'iframe' : 'standalone'}-390.png`) });
        }
      }
      await page.setViewportSize({ width: 390, height: 844 });
      const entries = root.locator(region === 'central' ? '.pin' : '.destination');
      await expect(entries).toHaveCount(region === 'central' ? 5 : 6);
      for (const entry of await entries.all()) {
        await entry.click();
        const dialog = root.locator(region === 'central' ? '#modal' : '#story');
        await expect(dialog).toBeVisible({ timeout: 15_000 });
        await page.keyboard.press('Escape');
        await expect(dialog).toBeHidden();
        await expect(entry).toBeFocused();
      }
      if (embedded) {
        await expect(root.locator('[data-return]')).toBeHidden();
        await page.getByRole('button', { name: '返回中轴总览', exact: true }).click();
      } else {
        await root.locator('[data-return]').click();
      }
      await expect(page).toHaveURL(url => url.hash === '#/');
      expect(errors).toEqual([]);
    });
  }
}
