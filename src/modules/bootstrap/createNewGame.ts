import { loadInitialStateConfig } from '../../config/loaders/loadInitialStateConfig.ts';
import { createInitialSnapshot } from '../../engine/session/createInitialSnapshot.ts';
import type { CreatePlayerInput } from '../../shared/types/bootstrap.ts';
import { createGameSessionStore } from '../../storage/game-session/store.ts';

// 创建一局新游戏，并把初始快照保存到存储里。
// module 层只负责把“读配置 -> 调 engine -> 持久化”的用例串起来，
// 不重复实现输入校验或快照组装细节。
export async function createNewGame(
  input: CreatePlayerInput,
  options?: {
    sessionId?: string;
    store?: ReturnType<typeof createGameSessionStore>;
  }
) {
  const config = loadInitialStateConfig();
  const sessionId = options?.sessionId ?? crypto.randomUUID();
  const snapshot = createInitialSnapshot(input, config, sessionId);
  const store = options?.store ?? createGameSessionStore();

  await store.saveGameSession(snapshot);

  return snapshot;
}
