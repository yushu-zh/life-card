import type { CreatePlayerInput } from './bootstrap.ts';
import type { ActiveTurnState, TurnHistoryEntry } from './turn.ts';

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
    age: number;
    cycle: number;
    turn: number;
  };
  turnState: {
    activeTurn: ActiveTurnState | null;
  };
  records: {
    selectedEventIds: string[];
    discardedEventIds: string[];
    triggeredStateIds: string[];
    // 精力危机最近一次健康-1 生效所在的周期号；用于实现「每周期」而非「每回合」触发。
    energyCrisisLastCycle: number | null;
    // lifeHistory 现在只保留长期要消费的整回合历史，避免混入不同统计粒度的记录。
    lifeHistory: TurnHistoryEntry[];
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
