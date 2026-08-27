import { GAME_SESSION_SCHEMA_VERSION, INITIAL_AGE, INITIAL_CYCLE, INITIAL_TURN } from '../../shared/constants/schema.ts';
import type { CreatePlayerInput, InitialStateConfig } from '../../shared/types/bootstrap.ts';
import type { GameSessionSnapshot } from '../../shared/types/game-session.ts';
import { validateCreatePlayerInput } from './validateCreatePlayerInput.ts';

// 根据玩家输入和初始配置，生成一份完整的初始快照。
// 初始快照是后续所有 Phase 的唯一运行态来源，
// 因此这里一次性把必需字段全部写全，而不是依赖后续默认值补齐。
export function createInitialSnapshot(
  input: CreatePlayerInput,
  config: InitialStateConfig,
  sessionId: string
): GameSessionSnapshot {
  validateCreatePlayerInput(input, config);

  return {
    meta: {
      sessionId,
      schemaVersion: GAME_SESSION_SCHEMA_VERSION
    },
    player: {
      nickname: input.profile.nickname,
      skillTags: [...input.profile.skillTags],
      education: input.profile.education,
      industry: input.profile.industry,
      wishes: [...input.profile.wishes]
    },
    stats: {
      abilities: { ...input.abilities },
      resources: {
        money: config.initialResources.money,
        energy: config.initialResources.energy
      },
      outcomes: {
        happiness: config.initialResources.happiness,
        freedom: config.initialResources.freedom,
        health: config.initialResources.health,
        experience: config.initialResources.experience,
        influence: config.initialResources.influence
      }
    },
    progression: {
      age: INITIAL_AGE,
      cycle: INITIAL_CYCLE,
      turn: INITIAL_TURN
    },
    turnState: {
      activeTurn: null
    },
    records: {
      selectedEventIds: [],
      discardedEventIds: [],
      triggeredStateIds: [],
      energyCrisisLastCycle: null,
      lifeHistory: [],
      categoryPickCounts: {
        achievement: 0,
        relationship: 0,
        self: 0
      },
      lifeNodes: {
        romanceSuccessCount: 0,
        marriageEstablished: false,
        familyEstablished: false
      }
    },
    lifecycle: {
      isEnded: false,
      endReason: null,
      finalReportId: null,
      finalReportText: null
    }
  };
}
