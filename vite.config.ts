import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite 配置：支持 React，并以 src/app/game/page.tsx 作为应用入口。
// 这个配置保持最小，只服务于 Phase 4 的游戏界面壳。
export default defineConfig({
  plugins: [react()],
  root: '.',
  build: {
    outDir: 'dist'
  }
});
