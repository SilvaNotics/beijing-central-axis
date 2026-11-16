import { expect, test } from '@playwright/test';

test('identifies the palace halls when focusing the Forbidden City', async ({ page }) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/site/forbidden-city');
  await expect(page.locator('.scene-world')).toHaveClass(/is-ready/, { timeout: 90_000 });
  for (const id of ['638449347', '638473398', '638981317']) {
    await expect(page.locator(`[data-annotation=palace-${id}]`)).toHaveCSS('opacity', '1');
  }
  await expect(page.locator('[data-annotation=palace-zhonghe]')).toHaveText('中和殿');
});

test('tours northward at a fixed angle, pauses, resumes and yields to manual navigation', async ({ page }, testInfo) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 800, height: 600 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/');
  await expect(page.locator('.scene-world')).toHaveClass(/is-ready/, { timeout: 120_000 });
  await page.getByRole('button', { name: '由南至北游览' }).click();
  const progress = page.getByRole('complementary', { name: '由南至北游览进度' });
  await expect(progress.getByRole('status')).toContainText('永定门');
  await expect(progress.locator('.tour-location-card')).toHaveCount(0);
  await page.getByRole('button', { name: '暂停游览', exact: true }).click();
  await expect(progress).toContainText('已暂停');
  await page.screenshot({ path: testInfo.outputPath('tour-paused.png') });
  const label = page.locator('[data-site=yongdingmen]');
  const position = await label.getAttribute('style');
  await page.waitForTimeout(300);
  expect(await label.getAttribute('style')).toBe(position);
  const bearing = Number(await page.locator('.north-marker').getAttribute('data-bearing'));
  await page.getByRole('button', { name: '继续游览', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => label.getAttribute('style'), { timeout: 45_000 }).not.toBe(position);
  expect(Math.abs(Number(await page.locator('.north-marker').getAttribute('data-bearing')) - bearing)).toBeLessThan(.2);
  const box = (await page.locator('.atlas-canvas').boundingBox())!;
  await page.mouse.move(box.x + box.width * .7, box.y + box.height * .65);
  await page.mouse.wheel(0, 100);
  await expect(progress).toHaveCount(0);
  await page.getByRole('button', { name: '由南至北游览' }).click();
  await page.keyboard.press('Escape');
  await expect(progress).toHaveCount(0);
  await page.getByRole('button', { name: '由南至北游览' }).click();
  await page.getByRole('button', { name: '二维地图', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.flat-map')).toBeVisible();
  await expect(progress).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('identifies the altar and temple buildings when focused', async ({ page }) => {
  test.setTimeout(150_000);
  await page.setViewportSize({ width: 900, height: 700 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/site/shejitan');
  await expect(page.locator('.scene-world')).toHaveClass(/is-ready/, { timeout: 90_000 });
  for (const [site, ids] of [
    ['shejitan', ['sheji-hall', 'sheji-altar']],
    ['taimiao', ['taimiao-front', 'taimiao-middle', 'taimiao-rear']],
    ['xiannongtan', ['agriculture-altar', 'agriculture-taisui', 'agriculture-compound-2']],
  ] as const) {
    await page.goto(`/#/site/${site}`);
    for (const id of ids) await expect(page.locator(`[data-annotation=${id}]`)).toHaveCSS('opacity', '1');
  }
});
