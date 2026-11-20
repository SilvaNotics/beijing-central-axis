/** 预烤地面图：用 Vite 起一个临时开发服务，拿无头浏览器把 createCityPlan 画一次存成 WebP。
 *  数据改了就得重跑（npm run bake:plan）；指纹对不上时页面会退回现场绘制，不会画错。 */
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const port = 5179;
const outDir = join(root, 'public', 'data');

const server = spawn(`npx vite --port ${port} --strictPort --logLevel error`, { cwd: root, shell: true, stdio: 'ignore' });
const stop = () => { try { server.kill(); } catch {} };

async function waitForServer() {
  for (let i = 0; i < 120; i++) {
    try { const response = await fetch(`http://localhost:${port}/`); if (response.ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error('开发服务器没有起来');
}

try {
  await waitForServer();
  const browser = await chromium.launch({ args: ['--use-angle=d3d11'] });
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`http://localhost:${port}/scripts/bake/plan.html`, { waitUntil: 'domcontentloaded' });
  const result = await page.waitForFunction(() => window.__plan, null, { timeout: 180000 }).then(handle => handle.jsonValue());
  await browser.close();
  if (result.error) throw new Error(result.error + (errors.length ? ` / ${errors[0]}` : ''));

  await mkdir(outDir, { recursive: true });
  for (const [key, file] of [['plan', 'city-plan.webp'], ['arch', 'city-plan-arch.webp']]) {
    const base64 = String(result[key]).replace(/^data:image\/webp;base64,/, '');
    const bytes = Buffer.from(base64, 'base64');
    await writeFile(join(outDir, file), bytes);
    console.log(`${file}  ${(bytes.length / 1024).toFixed(0)} KB`);
  }
  await writeFile(join(outDir, 'city-plan.json'), JSON.stringify({
    hash: result.hash,
    plan: 'city-plan.webp',
    arch: 'city-plan-arch.webp',
    width: result.width,
    height: result.height,
  }, null, 2) + '\n');
  console.log(`city-plan.json  hash=${result.hash}  ${result.width}×${result.height}`);
} finally {
  stop();
}
