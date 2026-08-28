import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';

// Vite 配置：支持 React，并以 src/app/game/page.tsx 作为应用入口。
// 这个配置保持最小，只服务于 Phase 4 的游戏界面壳。
export default defineConfig({
  plugins: [
    react(),
    // 兼容老内核浏览器（百度浏览器 / 老 WebView / 安卓自带浏览器）：
    // 1. build 时用 esbuild+babel 转译产物语法到老浏览器可解析的程度；
    // 2. 按需注入 core-js polyfill（structuredClone、Array.prototype.at、String.prototype.replaceAll 等）；
    // 3. 对不支持 <script type="module"> 的浏览器生成 nomodule 降级包。
    // 注意：targets 必须带 Chrome 49+ 这种低版本约束，否则构建产物仍是新语法。
    legacy({
      targets: ['Chrome >= 49', 'Android >= 5', 'iOS >= 10.3', 'Firefox >= 50', 'Safari >= 10.1']
    })
  ],
  root: '.',
  // dev 模式下 legacy 插件不生效，单独压低 dev transform 的语法等级（oxc，Vite 8 默认转译器），
  // 保证 `vite --host` 真机调试时老浏览器至少能解析源码（可达 ES2018）。
  oxc: {
    target: 'es2018'
  },
  build: {
    outDir: 'dist'
  }
});
