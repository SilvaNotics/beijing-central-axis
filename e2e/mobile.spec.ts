import { expect, test, type CDPSession } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });

const touch = (session: CDPSession, type: 'touchStart' | 'touchMove' | 'touchEnd' | 'touchCancel', points: { id: number; x: number; y: number }[]) =>
  session.send('Input.dispatchTouchEvent', { type, touchPoints: points });

test('touch rotation can be toggled without Shift and reset to panning', async ({ page, context }, testInfo) => {
  test.setTimeout(180_000);
  await page.goto('/#/');
  await expect(page.locator('.scene-world')).toHaveClass(/is-ready/, { timeout: 45_000 });
  const toggle = page.getByRole('button', { name: '旋转视角', exact: true });
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  const findPoint = () => page.locator('.atlas-canvas').evaluate(canvas => {
    const r = canvas.getBoundingClientRect();
    for (const fx of [.7, .3, .5]) for (const fy of [.45, .55, .35]) {
      const x = r.x + r.width * fx, y = r.y + r.height * fy;
      if (document.elementFromPoint(x, y) === canvas) return { x, y };
    }
    throw new Error('No unobstructed canvas touch target');
  });
  const compass = page.locator('.north-marker');
  await expect(compass).toHaveAttribute('data-bearing', /[1-9]/, { timeout: 15_000 });
  const before = Number(await compass.getAttribute('data-bearing'));
  const drag = async () => {
    const point = await findPoint();
    const session = await context.newCDPSession(page);
    await touch(session, 'touchStart', [{ id: 1, ...point }]);
    await touch(session, 'touchMove', [{ id: 1, x: point.x + 65, y: point.y + 15 }]);
    await touch(session, 'touchEnd', []);
    // Avoid mixing CDP and Playwright's separate touchscreen sessions.
    await session.detach();
  };
  await drag();
  expect(Math.abs(Number(await compass.getAttribute('data-bearing')) - before)).toBeLessThan(.3);
  // Chromium's CDP drag swallows the next synthetic tap even on a plain page.
  // Use the button's normal click path between injected touch gestures.
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.map-instruction')).toContainText('单指旋转');
  await drag();
  await expect.poll(async () => Math.abs(Number(await compass.getAttribute('data-bearing')) - before), { timeout: 15_000 }).toBeGreaterThan(5);
  await page.screenshot({ path: testInfo.outputPath('main-rotation-390.png') });
  await toggle.click();
  const rotated = Number(await compass.getAttribute('data-bearing'));
  await drag();
  expect(Math.abs(Number(await compass.getAttribute('data-bearing')) - rotated)).toBeLessThan(.3);
  await page.getByRole('button', { name: '全轴总览' }).click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await expect.poll(async () => Math.abs(Number(await compass.getAttribute('data-bearing')) - before), { timeout: 15_000 }).toBeLessThan(.3);
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    const controls = await page.locator('.map-controls button').all();
    for (const control of controls) {
      const box = (await control.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test('two fingers zoom the flat map around their midpoint without selecting a site', async ({ page, context }, testInfo) => {
  await page.goto('/#/');
  await page.getByRole('button', { name: '二维地图', exact: true }).tap();
  const map = page.locator('.flat-map');
  await expect(map.locator('.mapped-plan')).toHaveCount(15, { timeout: 45_000 });
  const session = await context.newCDPSession(page);
  const r = (await map.boundingBox())!;
  const x = r.x + r.width / 2, y = r.y + r.height * .45;
  const points = (distance: number) => [{ id: 1, x: x - distance, y }, { id: 2, x: x + distance, y }];
  await touch(session, 'touchStart', points(35));
  await touch(session, 'touchMove', points(70));
  const readView = () => page.locator('.flat-map-content').evaluate(el => {
    const values = el.getAttribute('transform')!.match(/[-\d.]+/g)!.map(Number);
    return { x: values[0], y: values[1], scale: values[2] };
  });
  await expect.poll(async () => (await readView()).scale).toBeGreaterThan(1.8);
  const zoomed = await readView();
  await page.screenshot({ path: testInfo.outputPath('flat-pinch-390.png') });
  const anchor = await map.locator('svg').evaluate((svg: SVGSVGElement, p) => {
    const local = new DOMPoint(p.x, p.y).matrixTransform(svg.getScreenCTM()!.inverse());
    return { x: local.x, y: local.y };
  }, { x, y });
  expect(zoomed.x + anchor.x * zoomed.scale).toBeCloseTo(anchor.x, 1);
  expect(zoomed.y + anchor.y * zoomed.scale).toBeCloseTo(anchor.y, 1);
  await touch(session, 'touchEnd', [{ id: 2, x: x + 70, y }]);
  await touch(session, 'touchMove', [{ id: 1, x: x - 50, y: y + 10 }]);
  await touch(session, 'touchEnd', []);
  await expect.poll(async () => (await readView()).x).toBeGreaterThan(zoomed.x);
  expect((await readView()).scale).toBeCloseTo(zoomed.scale);
  await touch(session, 'touchStart', points(70));
  await touch(session, 'touchMove', points(35));
  await touch(session, 'touchEnd', []);
  await expect.poll(async () => (await readView()).scale).toBeLessThan(1.1);
  await expect(page).toHaveURL(/#\/$/);
  await session.detach();
  await page.getByRole('button', { name: '全轴总览' }).tap();
  await expect(page.locator('.flat-map-content')).toHaveAttribute('transform', 'translate(0 0) scale(1)');
  await page.locator('.flat-site[aria-label="查看故宫"]').tap();
  await expect(page).toHaveURL(/#\/site\/forbidden-city$/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test('north map portraits stay visible and open dialogues on narrow screens', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/chapters/north/index.html');
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    const markers = page.locator('#stage > .marker');
    await expect(markers).toHaveCount(3);
    for (const marker of await markers.all()) {
      await expect(marker).toBeVisible();
      expect(await marker.locator('.card > img:not(.ok)').evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
      const box = (await marker.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
      await marker.tap();
      await expect(page.locator('#dlg')).toBeVisible();
      await page.locator('#back').tap();
      await expect(marker).toBeFocused();
    }
    if (width === 390) await page.screenshot({ path: testInfo.outputPath('north-portraits-390.png') });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  }
  await page.locator('#stage > .marker').first().focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#dlg')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#stage > .marker').first()).toBeFocused();
  expect(errors).toEqual([]);
});
