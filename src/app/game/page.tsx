// 运行时兜底必须最先执行：structuredClone / crypto.randomUUID 这些 API
// 老安卓内核没有，若先 import 业务模块，模块顶层一调用就会直接 throw。
import '../../shared/utils/polyfills.ts';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { GameShell } from '../../components/life-game/GameShell.tsx';

// Phase 4 游戏界面的 Vite 入口。
// 以单页面壳承载创建人物、回合总览、掷骰、结果流、终局与人生报告。
const container = document.getElementById('root');

if (!container) {
  throw new Error('找不到 #root 容器，无法挂载游戏界面');
}

createRoot(container).render(
  <StrictMode>
    <GameShell />
  </StrictMode>
);
