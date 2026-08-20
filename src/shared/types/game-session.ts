import type { CreatePlayerInput } from './bootstrap.ts';

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
    lifeHistory: Array<Record<string, unknown>>;
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

export interface PersistedGameSession {
  sessionId: string;
  schemaVersion: number;
  snapshot: GameSessionSnapshot;
}
