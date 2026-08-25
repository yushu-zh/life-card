import { GAME_SESSION_SCHEMA_VERSION } from '../../src/shared/constants/schema.ts';
import type { GameSessionSnapshot, PersistedGameSession } from '../../src/shared/types/game-session.ts';

// 模拟专用内存存档接口，只暴露正式模块层真正用到的两个方法。
// 与 src/storage/game-session/store.ts 的返回结构兼容，因此可以直接注入 createNewGame 等模块。
export interface SimulationSessionStore {
  saveGameSession(snapshot: GameSessionSnapshot): Promise<void>;
  getGameSession(sessionId: string): Promise<PersistedGameSession | null>;
}

// 创建一个把存档只存在当前批次内存里的 store。
// 每局或每批独立创建，天然与正式 IndexedDB 存档隔离，不会污染玩家数据。
export function createSimulationSessionStore(): SimulationSessionStore {
  const sessions = new Map<string, PersistedGameSession>();

  return {
    async saveGameSession(snapshot: GameSessionSnapshot): Promise<void> {
      sessions.set(snapshot.meta.sessionId, {
        sessionId: snapshot.meta.sessionId,
        schemaVersion: GAME_SESSION_SCHEMA_VERSION,
        snapshot
      });
    },

    async getGameSession(sessionId: string): Promise<PersistedGameSession | null> {
      return sessions.get(sessionId) ?? null;
    }
  };
}
