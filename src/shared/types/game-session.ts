import type { CreatePlayerInput } from './bootstrap.ts';
import type { LifeHistoryEntry } from './opportunity.ts';

// 表示当前这一局游戏的完整状态。
export interface GameSessionSnapshot {
  meta: {
    sessionId: string;
    schemaVersion: number;
  };
  player: CreatePlayerInput['profile'];
  stats: {
    abilities: CreatePlayerInput['abilities'];
    resources: {
      money: number;
      energy: number;
    };
    outcomes: {
      happiness: number;
      freedom: number;
      health: number;
      experience: number;
      influence: number;
    };
  };
  progression: {
    age: 20;
    cycle: number;
    turn: number;
  };
  records: {
    selectedEventIds: string[];
    discardedEventIds: string[];
    triggeredStateIds: string[];
    lifeHistory: LifeHistoryEntry[];
    categoryPickCounts: {
      achievement: number;
      relationship: number;
      self: number;
    };
    lifeNodes: {
      romanceSuccessCount: number;
      marriageEstablished: boolean;
      familyEstablished: boolean;
    };
  };
  lifecycle: {
    isEnded: boolean;
    endReason: string | null;
    finalReportId: string | null;
  };
}

// 表示真正存到 IndexedDB 里的存档结构。
export interface PersistedGameSession {
  sessionId: string;
  schemaVersion: number;
  snapshot: GameSessionSnapshot;
}
