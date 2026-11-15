import { expect, test } from '@playwright/test';

test('all south dialogue uses its original character recording', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    const state = window as typeof window & { systemSpeechCalls: number };
    state.systemSpeechCalls = 0;
    if (window.speechSynthesis) {
      window.speechSynthesis.speak = () => { state.systemSpeechCalls++; };
    }
  });
  await page.goto('/chapters/south/index.html');
  await page.keyboard.press('Escape');
  const places = ['tiananmen', 'zhengyangmen', 'xiannongtan', 'tiantan', 'road', 'yongdingmen'];
  for (const [index, id] of places.entries()) {
    await page.locator('#destinations button').nth(index).click();
    for (let line = 1; line <= 10; line++) {
      await expect(page.locator('#lineCount')).toContainText(line + ' / 10');
      await expect.poll(() => page.evaluate(() => {
        // The chapter owns this global lexical binding.
        const audio = (0, eval)('castAudio') as HTMLAudioElement;
        return { src: new URL(audio.src).pathname, playing: !audio.paused && audio.readyState >= 2 };
      })).toEqual({ src: '/chapters/south/assets/voices/' + id + '-' + line + '.mp3', playing: true });
      if (line < 10) await page.locator('#next').click();
    }
    await page.locator('#closeStory').click();
  }
  expect(await page.evaluate(() => (window as typeof window & { systemSpeechCalls: number }).systemSpeechCalls)).toBe(0);
  expect(errors).toEqual([]);
});
