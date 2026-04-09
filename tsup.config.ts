import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  treeshake: true,
  // CSS 直接复制到 dist，不内联进 JS
  // 消费方通过 import 'tauri-app-shell/style' 引入
  external: [
    'react',
    'react-dom',
    '@tauri-apps/api',
    '@tauri-apps/api/window',
    'lucide-react',
  ],
  esbuildOptions(options) {
    options.jsx = 'automatic';
  },
});
