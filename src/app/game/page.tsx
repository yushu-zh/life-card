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
