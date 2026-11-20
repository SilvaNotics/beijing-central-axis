import { expect, test } from '@playwright/test';

// 换到下一位 NPC 时，画面上不能还挂着上一个人的立绘。
// 原来的写法只改 `src`：新图解码要时间，这段时间浏览器继续画上一张，读者要读几句才「变回来」。
// 现在换人先把 `<img>` 撤干净（src 清掉、hidden），等 decode 完成再挂上，宁可空一下，也不挂错人。
test('switching npc clears the previous portrait before showing the next', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));

  await page.goto('/chapters/south/index.html');
  await page.keyboard.press('Escape');

  // 记下每次 updatePortrait 刚返回时，画面上还是什么
  await page.evaluate(() => {
    type Probe = { src: string | null; hidden: boolean };
    const scope = window as unknown as { updatePortrait: () => void; __face: Probe[] };
    scope.__face = [];
    const original = scope.updatePortrait;
    scope.updatePortrait = function (this: unknown) {
      const result = original.apply(this, arguments as unknown as []);
      const img = document.getElementById('portrait') as HTMLImageElement;
      scope.__face.push({ src: img.getAttribute('src'), hidden: img.hidden });
      return result;
    };
  });

  const shown = () => page.evaluate(() => {
    const img = document.getElementById('portrait') as HTMLImageElement;
    const state = { name: (img.getAttribute('src') ?? '').split('/').pop() ?? '', hidden: img.hidden };
    return state.hidden ? '(空)' : state.name;
  });

  // 第一位：天安门
  await page.locator('#destinations button').nth(0).click();
  await expect(page.locator('#storyTitle')).toHaveText('天安门广场及建筑群');
  await expect.poll(shown, { timeout: 20000 }).toBe('tiananmen.png');
  await page.locator('#closeStory').click();

  // 第二位：正阳门
  await page.locator('#destinations button').nth(1).click();
  await expect(page.locator('#storyTitle')).toHaveText('正阳门');
  await expect(page.locator('#lineCount')).toContainText('1 / 10');

  const faces = await page.evaluate(() => (window as unknown as { __face: { src: string | null; hidden: boolean }[] }).__face);
  expect(faces.length, '换人应该走一次 updatePortrait').toBeGreaterThan(1);
  const swap = faces.at(-1)!;
  expect(swap.hidden, '换人那一刻立绘要么已经换成新的，要么先空着').toBe(true);
  expect(swap.src, '换人那一刻不能留着上一位的 src').toBeNull();

  // 图解码完再挂上，而且是这一位
  await expect.poll(shown, { timeout: 20000 }).toBe('zhengyangmen.png');
  const alt = await page.evaluate(() => (document.getElementById('portrait') as HTMLImageElement).alt);
  expect(alt).toContain('守城人');
  expect(errors).toEqual([]);
});
