// 游览过程中指北针读数怎么变：每 250 ms 采一次站名与 data-bearing，连采 10 s。
// 用法：node scripts/bearing-drift.mjs <调试端口> <地址>（先起一个带 --remote-debugging-port 的 Edge/Chrome）
// 到站文案比镜头落地早一两帧——按「站名出现」就按暂停量方位角，量到的是飞行中的值，会差十几度。
const [, , port, url] = process.argv;
const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const page = list.find(t => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0; const pending = new Map();
ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
await new Promise(r => ws.addEventListener('open', r));
const send = (method, params = {}) => new Promise(r => { const n = ++id; pending.set(n, r); ws.send(JSON.stringify({ id: n, method, params })); });
const js = async expr => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;
const sleep = ms => new Promise(r => setTimeout(r, ms));
await send('Emulation.setDeviceMetricsOverride', { width: 800, height: 600, deviceScaleFactor: 1, mobile: false });
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
await send('Page.navigate', { url });
for (let i = 0; i < 120; i++) { if (await js(`!!document.querySelector('.scene-world.is-ready')`)) break; await sleep(500); }
await js(`document.querySelector('button[aria-label="由南至北游览"]')?.click()`);
await sleep(600);
const rows = [];
for (let i = 0; i < 40; i++) {
  const s = await js(`(() => { const who = document.querySelector('.tour-who')?.textContent ?? ''; const b = document.querySelector('.north-marker')?.getAttribute('data-bearing'); return who.trim() + ' | ' + b; })()`);
  rows.push(`${(i * 0.25).toFixed(2)}s ${s}`);
  await sleep(250);
}
console.log(rows.join('\n'));
ws.close(); process.exit(0);