import { defineConfig } from 'vite';
import typegpuPlugin from 'unplugin-typegpu/vite';

export default defineConfig(({ command }) => {
  return {
    plugins: [typegpuPlugin()],

    // Use the specific GitHub Pages path for production builds, but
    // keep standard root ('/') for local 'npm run dev'
    base: command === 'build'
      ? '/html-in-canvas/Examples/crystal-hands/'
      : '/',

    // Required for top-level await (tgpu.init())
    build: {
      target: 'esnext'
    }
  };
});
