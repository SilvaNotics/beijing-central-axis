// Render the existing local paper texture and Kai font into one image per map label.
// No runtime canvas, external fonts, or image services are required by the chapter.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = new URL('../public/chapters/north/', import.meta.url);
const font = (await readFile(new URL('assets/kai-sub.woff2', root))).toString('base64');
const paper = (await readFile(new URL('assets/p_tag2.webp', root))).toString('base64');
const labels = [['bell', '钟楼'], ['drum', '鼓楼'], ['bridge', '万宁桥'], ['jingshan', '景山公园']];
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 800, height: 240 }, deviceScaleFactor: 1 });
  await page.setContent(`<style>
    @font-face{font-family:LabelKai;src:url(data:font/woff2;base64,${font})}
    body{margin:0;background:transparent}
    #label{display:inline-block;padding:16px 32px;color:#3b2d1b;white-space:nowrap;
      font:64px/1.3 LabelKai;letter-spacing:8px;
      background:url(data:image/webp;base64,${paper}) center/100% 100% no-repeat}
  </style><span id="label"></span>`);
  for (const [id, title] of labels) {
    await page.locator('#label').evaluate((el, text) => { el.textContent = text; }, title);
    await page.evaluate(() => document.fonts.ready);
    await page.locator('#label').screenshot({ path: fileURLToPath(new URL(`assets/place-${id}.png`, root)), omitBackground: true });
  }
} finally { await browser.close(); }
