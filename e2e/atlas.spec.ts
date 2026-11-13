import { expect, test } from '@playwright/test';

test('renders the full axis without browser errors or horizontal overflow', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', error => errors.push(error.message));

  await page.goto('/#/');
  await expect(page.locator('.scene-world')).toHaveClass(/is-ready/, { timeout: 15_000 });
  await expect(page.locator('.region-row.region-active')).toHaveCount(0);
  await expect(page.locator('.map-legend')).toBeVisible();
  await expect(page.locator('[data-site="bell-drum"]')).toHaveCSS('opacity', '1');
  await expect(page.locator('[data-site="yongdingmen"]')).toHaveCSS('opacity', '1');
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  expect(errors).toEqual([]);
});

test('renders the Tiananmen square ensemble and its supporting landmarks', async ({ page }) => {
  await page.goto('/#/site/square');
  await expect(page.locator('.landmark-detail h2')).toHaveText('天安门广场及建筑群');
  for (const annotation of ['heroes', 'memorial', 'great-hall']) {
    await expect(page.locator(`[data-annotation="${annotation}"]`)).toHaveCSS('opacity', '1');
  }
});

test('shows the layered Tiantan plan and one unambiguous north indicator', async ({ page }) => {
  await page.goto('/#/site/tiantan');
  for (const annotation of ['prayer-hall', 'imperial-vault', 'circular-altar']) {
    await expect(page.locator(`[data-annotation="${annotation}"]`)).toHaveCSS('opacity', '1');
  }
  await page.goto('/#/');
  await page.getByRole('button', { name: /二维地图/ }).click();
  await expect(page.locator('.flat-map')).toBeVisible();
  await expect(page.locator('.flat-cartouche')).toHaveCount(1);
  await expect(page.locator('.compass')).toHaveCount(0);
  await expect(page.locator('.flat-landmark-zone')).toHaveCount(15);
});

test('keeps each chapter independently reachable and returns focus to the atlas', async ({ page }) => {
  await page.goto('/#/chapter/north');
  const frame = page.frameLocator('iframe');
  await expect(frame.locator('[data-return]')).toBeVisible();
  await frame.locator('[data-return]').click();
  await expect(page).toHaveURL(/#\/$/);
  await expect(page.locator('.brand')).toBeFocused();
});
