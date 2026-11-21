/** 分帧构建原语。
 *
 * 重的场景片段写成生成器：每个 `yield` 都是一个可以让出的位置。
 * 同步调用方用 `pumpSync` 一次跑完（与原来的普通函数完全等价）；
 * 首屏构建用 `pumpAsync` 按时间片让出主线程，页面不再一口气卡住，
 * 总耗时也基本不变——让出用的是 MessageChannel，不占 setTimeout 的 4 ms 底噪。
 */

export function pumpSync<T>(gen: Generator<void, T, void>): T {
  let step = gen.next();
  while (!step.done) step = gen.next();
  return step.value as T;
}

export function idleSlice(): Promise<void> {
  return new Promise<void>(resolve => {
    const channel = new MessageChannel();
    channel.port1.onmessage = () => { channel.port1.close(); resolve(); };
    channel.port2.postMessage(0);
  });
}

export async function pumpAsync<T>(gen: Generator<void, T, void>, budget = 8): Promise<T> {
  let last = performance.now();
  let step = gen.next();
  while (!step.done) {
    if (performance.now() - last >= budget) {
      await idleSlice();
      last = performance.now();
    }
    step = gen.next();
  }
  return step.value as T;
}
