import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { rollupOptions: { output: { manualChunks: { three: ['three'] } } } },
  test: {
    include: ['src/**/*.test.ts'],
    // WSL exposes 32 CPUs with only ~7.4 GiB RAM. Concurrent Three.js models
    // exhausted RAM and swap; keep both file and in-file concurrency at one.
    pool: 'forks',
    maxWorkers: 1,
    fileParallelism: false,
    maxConcurrency: 1,
    // A fresh process per file releases native geometry buffers as well as JS.
    isolate: true,
    // Worker arguments are separate from the coordinator's package.json limit.
    // This bounds V8 old space, not total RSS / Three.js typed-array memory.
    execArgv: ['--max-old-space-size=1024'],
  },
});
