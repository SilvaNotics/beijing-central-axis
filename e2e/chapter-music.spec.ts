import { expect, test } from '@playwright/test';

test.use({ reducedMotion: 'reduce' });

// 章节页单独打开时自己放曲；嵌进总览时改由父页面放（见文件末尾那条），这里只验单独打开。
for (const embedded of [false]) {
  for (const region of ['central', 'south']) {
    test(region + ' music stops throughout stories ' + (embedded ? 'in iframe' : 'standalone'), async ({ page }, testInfo) => {
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(embedded ? '/#/chapter/' + region : '/chapters/' + region + '/index.html');
      const root = embedded ? page.frameLocator('iframe').locator('body') : page.locator('body');
      const music = () => root.evaluate((_, region) => {
        const audio = (0, eval)(region === 'central' ? 'mapMusic' : 'bgm') as HTMLAudioElement;
        return { paused: audio.paused, ready: audio.readyState >= 2, time: audio.currentTime };
      }, region);
      const paused = async () => expect.poll(async () => (await music()).paused).toBe(true);
      const playing = async () => expect.poll(async () => {
        const state = await music();
        return !state.paused && state.ready && state.time > 0;
      }).toBe(true);

      await paused(); // No sound before a user gesture.
      await root.locator('h1').click();
      await page.keyboard.press('Escape');
      await playing();
      const time = (await music()).time;
      await expect.poll(async () => (await music()).time).toBeGreaterThan(time);
      const toggle = root.locator(region === 'central' ? '#musicToggle' : '#musicToggleHome');
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-pressed', 'false');
      await paused();
      await toggle.focus();
      await page.keyboard.press('Enter');
      await playing();

      const entries = root.locator(region === 'central' ? '.pin' : '.destination');
      for (const [index, entry] of (await entries.all()).entries()) {
        await entry.click();
        const dialog = root.locator(region === 'central' ? '#modal' : '#story');
        await expect(dialog).toBeVisible();
        await paused();
        if (region === 'central') {
          await root.locator('.guide-button').click();
          if (index < 3) {
            await expect(root.locator('video')).toBeVisible();
            await expect.poll(() => root.locator('video').evaluate((v: HTMLVideoElement) => !v.paused && v.readyState >= 2)).toBe(true);
          } else await expect(root.locator('.book')).toBeVisible();
          await paused();
          await root.locator('.back').click();
          await paused();
        } else if (index === 0) {
          await expect.poll(() => root.evaluate(() => !(0, eval)('castAudio').paused)).toBe(true);
          await root.locator('#readButton').click(); // Pausing narration must not resume music.
          await paused();
          await root.locator('#musicToggle').click();
          await root.locator('#musicToggle').click();
          await paused();
          await root.locator('#openVideo').click();
          await expect(root.locator('#videoView')).toBeVisible();
          await paused();
          await root.locator('#backToTalk').click();
          await paused();
          await root.locator('#settingsToggle').click();
          await root.locator('#autoRead').uncheck();
          await paused();
          await root.locator('#closeSettings').click();
        }
        await page.keyboard.press('Escape');
        await expect(dialog).toBeHidden();
        await playing();
      }
      await toggle.click();
      await entries.first().click();
      await expect(root.locator(region === 'central' ? '#modal' : '#story')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(toggle).toHaveAttribute('aria-pressed', 'false');
      await paused();
      for (const width of [320, 390, 1440]) {
        await page.setViewportSize({ width, height: 844 });
        await expect.poll(() => root.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      }
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({ path: testInfo.outputPath(region + '-music-' + (embedded ? 'iframe' : 'standalone') + '.png') });
      if (embedded) await page.getByRole('button', { name: '返回中轴总览', exact: true }).click();
      else await root.locator('[data-return]').click();
      await expect(page).toHaveURL(url => url.hash === '#/');
      expect(errors).toEqual([]);
    });
  }
}

// 嵌进总览时，章节不再自己建 <audio>：配乐由父页面统一放，章节只把音量意图（normal/duck/mute）报上去。
for (const region of ['central', 'south']) {
  test(region + ' music is handed to the atlas when embedded', async ({ page }) => {
    await page.addInitScript(() => {
      window.addEventListener('message', (event: MessageEvent) => {
        const data = event.data as { type?: string; state?: string } | null;
        if (data?.type === 'axis:audio') {
          const log = ((window as unknown as { __axisAudio?: string[] }).__axisAudio ??= []);
          log.push(String(data.state));
        }
      });
    });
    await page.goto('/#/chapter/' + region);
    const root = page.frameLocator('iframe');
    const states = () => page.evaluate(() => ((window as unknown as { __axisAudio?: string[] }).__axisAudio ?? []) as string[]);
    const last = async () => (await states()).at(-1);
    await expect.poll(async () => (await states()).length, { timeout: 20_000 }).toBeGreaterThan(0);
    await root.locator('h1').click();
    await page.keyboard.press('Escape');
    await expect.poll(last, { timeout: 20_000 }).toBe('normal');
    await root.locator(region === 'central' ? '.pin' : '.destination').first().click();
    await expect(root.locator(region === 'central' ? '#modal' : '#story')).toBeVisible();
    await expect.poll(last, { timeout: 20_000 }).toBe('mute');
  });
}

