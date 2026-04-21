import { defineConfig } from 'vite';
import typegpuPlugin from 'unplugin-typegpu/vite';

export default defineConfig(({ command }) => {
  return {
    plugins: [typegpuPlugin()],
    base: command === 'build'
      ? '/html-in-canvas/Examples/shadow-puppet/'
      : '/',
    build: {
      target: 'esnext'
    }
  };
});
