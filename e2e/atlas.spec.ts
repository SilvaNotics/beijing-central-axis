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
  await expect(page.locator('.north-marker')).toHaveCount(1);
  await expect(page.locator('.flat-cartouche')).toHaveCount(0);
  await expect(page.locator('.flat-landmark-detail')).toHaveCount(15);
  await expect(page.locator('[data-plan-site="forbidden-city"] .plan-roofs')).toHaveAttribute('d',/.{1000}/);
  expect(await page.locator('.flat-map circle').evaluateAll(circles=>circles.some(c=>Number(c.getAttribute('r'))>5))).toBe(false);
});

test('Shift drag rotates the scene and compass; ordinary drag pans', async ({ page }) => {
  // Software WebGL can spend a second on each pointer-driven frame. Keep time
  // for the final 1.15 s reset animation after both drag sequences complete.
  test.setTimeout(60_000);
  await page.goto('/#/');
  await expect(page.locator('.scene-world')).toHaveClass(/is-ready/);
  const compass=page.locator('.north-marker');
  await expect(compass).toHaveAttribute('data-bearing',/[1-9]/);
  const before=Number(await compass.getAttribute('data-bearing'));
  const point=await page.locator('.atlas-canvas').evaluate(canvas=>{
    const r=canvas.getBoundingClientRect();
    for(const fx of [.72,.66,.38])for(const fy of [.45,.58,.35]) {
      const x=r.x+r.width*fx,y=r.y+r.height*fy;
      if(document.elementFromPoint(x,y)===canvas)return{x,y};
    }
    throw new Error('No unobstructed canvas drag target');
  });
  const {x,y}=point;
  await page.mouse.move(x,y);await page.keyboard.down('Shift');await page.mouse.down();
  await page.mouse.move(x+140,y-35,{steps:12});await page.mouse.up();await page.keyboard.up('Shift');
  await expect.poll(async()=>Math.abs(Number(await compass.getAttribute('data-bearing'))-before)).toBeGreaterThan(10);
  const rotated=Number(await compass.getAttribute('data-bearing'));
  await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x-60,y+20,{steps:8});await page.mouse.up();
  expect(Math.abs(Number(await compass.getAttribute('data-bearing'))-rotated)).toBeLessThan(.3);
  await page.getByRole('button',{name:'全轴总览'}).click();
  await expect.poll(async()=>Math.abs(Number(await compass.getAttribute('data-bearing'))-before)).toBeLessThan(.3);
});

test('keeps each chapter independently reachable and returns focus to the atlas', async ({ page }) => {
  await page.goto('/#/chapter/north');
  const frame = page.frameLocator('iframe');
  await expect(frame.locator('[data-return]')).toBeVisible();
  await frame.locator('[data-return]').click();
  await expect(page).toHaveURL(/#\/$/);
  await expect(page.locator('.brand')).toBeFocused();
});
