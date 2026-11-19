/**
 * 游览功能的端到端巡检：跑一遍开游 → 飞行提示 → 讲解开关 → 竖轴吸附 → 键盘 → 退出 → 竖屏布局，
 * 26 项断言，另外收控制台报错、未捕获异常、失败请求、非 2xx 响应。
 *
 * 用法（先起服务，再起一个开了调试口的浏览器，两个都得是活的）：
 *   npm run dev -- --port 5174 --strictPort
 *   "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" --headless=new \
 *     --remote-debugging-port=9402 --user-data-dir=<临时目录> --window-size=1440,900 \
 *     --autoplay-policy=no-user-gesture-required --hide-scrollbars about:blank
 *   node scripts/check-tour.mjs 9402 http://localhost:5174/      # 或 http://localhost:5173/ 验构建产物
 *
 * 退出码 0 = 全过；非 0 时把 failed 数组原样打出来。stdin 关掉跑（`< /dev/null`），
 * 在 bash 的 for 循环里后台跑会吐 `stdin is not a tty` 且没有结果。
 */
// node check-tour.mjs <cdpPort> <url>
const [, , port, url] = process.argv;
const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const page = list.find(t => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const consoleErrors = [];
const exceptions = [];
const failed = [];
const badResponses = [];
const audio = [];

ws.addEventListener('message', event => {
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); return; }
  if (msg.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(msg.params.type)) {
    consoleErrors.push(msg.params.args.map(a => a.value ?? a.description ?? a.type).join(' ').slice(0, 200));
  }
  if (msg.method === 'Runtime.exceptionThrown') {
    exceptions.push((msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text).slice(0, 240));
  }
  if (msg.method === 'Network.loadingFailed' && !msg.params.canceled) {
    failed.push(`${msg.params.type} ${msg.params.errorText}`);
  }
  if (msg.method === 'Network.responseReceived') {
    const { url: u, status } = msg.params.response;
    if (status >= 400) badResponses.push(`${status} ${u}`);
    if (u.includes('/audio/tour/')) audio.push(`${status} ${u.split('/').pop()}`);
  }
});
await new Promise(resolve => ws.addEventListener('open', resolve));
const send = (method, params = {}) => new Promise(resolve => {
  const n = ++id;
  pending.set(n, resolve);
  ws.send(JSON.stringify({ id: n, method, params }));
});
const sleep = ms => new Promise(r => setTimeout(r, ms));
const js = async expression => {
  const out = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (out.result?.exceptionDetails) throw new Error(out.result.exceptionDetails.exception?.description ?? out.result.exceptionDetails.text);
  return out.result?.result?.value;
};
const key = async (k, code, vk) => {
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, windowsVirtualKeyCode: vk, text: k === ' ' ? ' ' : undefined });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk });
};
const drag = async (x1, y1, x2, y2) => {
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: x1, y: y1, button: 'left', clickCount: 1 });
  for (let i = 1; i <= 10; i++) {
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x1 + (x2 - x1) * i / 10, y: y1 + (y2 - y1) * i / 10, button: 'left' });
    await sleep(16);
  }
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: x2, y: y2, button: 'left', clickCount: 1 });
};

const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok: Boolean(ok), detail: String(detail).slice(0, 160) });

await send('Runtime.enable');
await send('Log.enable');
await send('Network.enable');
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url });
await sleep(1200);
await js(`localStorage.removeItem('axis:tour-brief'); localStorage.setItem('axis:atlas-audio','on')`);
await send('Page.reload');
await sleep(9000);

// 场景
check('场景就绪', await js(`document.querySelector('.scene-world.is-ready') !== null`), await js(`document.querySelector('.scene-panel')?.className`));
// 首屏要现算全部建筑，冷启 + 刚 reload 会到 8–12 s，这里等它自己退，别按固定秒数判死。
let overlayGone = false;
for (let i = 0; i < 50; i++) {
  if (await js(`!document.querySelector('.scene-loading')`)) { overlayGone = true; break; }
  await sleep(500);
}
check('首屏遮罩已退', overlayGone);

// 开始游览
await js(`(() => { window.__plays = []; const p = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () { window.__plays.push([Math.round(performance.now()), this.src.split('/').pop()]); return p.call(this); }; })()`);
await js(`document.querySelector('.tour-control').click()`);
await sleep(1000);
const first = await js(`({ name: document.querySelector('.tour-current-stop')?.textContent, count: document.querySelector('.tour-count')?.textContent, touring: !!document.querySelector('.scene-panel.is-touring') })`);
check('游览已开始', first.touring && first.count === '1 / 30', JSON.stringify(first));
check('首站是永定门', first.name === '永定门', first.name);

// 飞行段：前往提示
let sawTravel = null;
for (let i = 0; i < 40 && !sawTravel; i++) {
  const s = await js(`({ name: document.querySelector('.tour-current-stop')?.textContent, next: document.querySelector('.tour-next')?.textContent ?? '' })`);
  if (s.next) sawTravel = s;
  await sleep(150);
}
check('飞行段有「前往」提示', Boolean(sawTravel), JSON.stringify(sawTravel));
check('飞行段仍报上一站', sawTravel?.name === '永定门', sawTravel?.name);

// 讲解开关
await js(`document.querySelector('.tour-brief').click()`);
await sleep(600);
check('讲解开关按下', await js(`document.querySelector('.tour-brief').getAttribute('aria-pressed') === 'true'`));
check('讲解写入 localStorage', await js(`localStorage.getItem('axis:tour-brief') === 'on'`));
await sleep(6000);
const plays = await js(`window.__plays.map(p => p[1])`);
check('讲解音按顺序播', plays.includes('00-brief.mp3') && plays.indexOf('00-brief.mp3') > plays.indexOf('00-zh.mp3') && plays.indexOf('00-brief.mp3') < plays.lastIndexOf('00-en.mp3'), JSON.stringify(plays.slice(-4)));
// dataset.tourDuration 只在 dev 里挂，生产构建读不到就跳过这一条。
const dur = await js(`document.querySelector('.scene-world').dataset.tourDuration`);
check('讲解计入全程时长', dur === undefined || Number(dur) > 260000, String(dur));

// 竖轴吸附 + 悬停
const rail = await js(`(r => ({ x: r.x, y: r.y, w: r.width, h: r.height }))(document.querySelector('.tour-vrail').getBoundingClientRect())`);
await drag(rail.x + rail.w / 2, rail.y + rail.h * 0.75, rail.x + rail.w / 2, rail.y + rail.h * 0.52);
await sleep(500);
const afterDrag = await js(`({ name: document.querySelector('.tour-current-stop')?.textContent, count: document.querySelector('.tour-count')?.textContent })`);
check('拖竖轴落在整站', /^\d+ \/ 30$/.test(afterDrag.count ?? ''), JSON.stringify(afterDrag));
await js(`(() => { const el = document.querySelector('.tour-vrail'); const r = el.getBoundingClientRect(); el.dispatchEvent(new PointerEvent('pointermove', { clientX: r.x + 16, clientY: r.y + 100, bubbles: true })); })()`);
await sleep(250);
check('悬停浮出站名', Boolean(await js(`document.querySelector('.tour-vrail-tip')?.textContent`)), await js(`document.querySelector('.tour-vrail-tip')?.textContent`));

// 键盘
await key(' ', 'Space', 32);
await sleep(400);
check('空格暂停', await js(`document.querySelector('.tour-heading span')?.textContent === '已暂停'`));
await key('ArrowRight', 'ArrowRight', 39);
await sleep(500);
const stepped = await js(`({ mode: document.querySelector('.tour-heading span')?.textContent, count: document.querySelector('.tour-count')?.textContent })`);
check('→ 跳下一站', /^\d+ \/ 30$/.test(stepped.count ?? ''), JSON.stringify(stepped));
await key('Escape', 'Escape', 27);
await sleep(500);
check('Esc 退出游览', await js(`!document.querySelector('.tour-progress')`));
const playCount = await js(`window.__plays.length`);
await sleep(3500);
check('退出后不再出声', (await js(`window.__plays.length`)) === playCount, `${playCount} 条后停在原地`);

// 平板 / 竖屏
await send('Emulation.setDeviceMetricsOverride', { width: 420, height: 860, deviceScaleFactor: 2, mobile: true });
await sleep(600);
await js(`document.querySelector('.tour-control').click()`);
await sleep(1200);
const layout = await js(`(() => { const r = document.querySelector('.tour-vrail').getBoundingClientRect(); const p = document.querySelector('.scene-panel').getBoundingClientRect(); const t = document.querySelector('.tour-progress').getBoundingClientRect(); return { rail: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)], panel: [Math.round(p.x), Math.round(p.y), Math.round(p.width), Math.round(p.height)], top: [Math.round(t.x), Math.round(t.y), Math.round(t.width), Math.round(t.height)], controls: getComputedStyle(document.querySelector('.map-controls')).opacity }; })()`);
check('竖屏竖轴在场景面板内', layout.rail[1] >= layout.panel[1] && layout.rail[1] + layout.rail[3] <= layout.panel[1] + layout.panel[3] + 1, JSON.stringify(layout.rail) + ' vs ' + JSON.stringify(layout.panel));
check('竖屏面板是顶部横条', layout.top[3] < 200 && layout.top[2] > layout.panel[2] - 40, JSON.stringify(layout.top));
check('游览时底部控制条让位', Number(layout.controls) === 0, layout.controls);

// 名牌不被裁
const label = await js(`(() => { const el = document.querySelector('.scene-label.is-touring'); if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), right: Math.round(r.right), w: innerWidth, leader: Number(getComputedStyle(document.querySelector('.scene-leader')).opacity) }; })()`);
check('游览名牌在画面内', !label || (label.right <= label.w && label.x >= 0), JSON.stringify(label));

await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

// 刷新后讲解状态还在
await send('Page.reload');
await sleep(9000);
await js(`document.querySelector('.tour-control')?.click()`);
await sleep(900);
check('讲解状态跨刷新保留', await js(`document.querySelector('.tour-brief')?.getAttribute('aria-pressed') === 'true'`));
await key('Escape', 'Escape', 27);
await sleep(300);

// 报错面
check('控制台无 error/warning', consoleErrors.length === 0, consoleErrors.join(' | '));
check('无未捕获异常', exceptions.length === 0, exceptions.join(' | '));
check('无请求失败', failed.length === 0, failed.join(' | '));
check('无 4xx/5xx', badResponses.length === 0, badResponses.join(' | '));
check('音频请求正常', audio.every(a => /^(200|206) /.test(a)), audio.filter(a => !/^(200|206) /.test(a)).join(' | ') || `${audio.length} 条 200/206`);

const bad = checks.filter(c => !c.ok);
console.log(JSON.stringify({ pass: checks.length - bad.length, total: checks.length, failed: bad, audioCount: audio.length }, null, 1));
ws.close();
process.exit(bad.length ? 1 : 0);
